const express = require('express');
const path = require('path');
const cors = require('cors');
const fs = require('fs');
const { execSync } = require('child_process');
const { GoogleSearch } = require('google-search-results-nodejs');
const axios = require('axios');

const app = express();
const port = 3100;

app.use(express.json());
app.use(cors());
app.use(express.static(__dirname));
app.use('/node_modules', express.static(path.join(__dirname, 'node_modules')));

app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET,POST');
    res.header('Access-Control-Allow-Headers', 'Content-Type');
    next();
});

class ToolServer {
  constructor() {
    this.resources = {};
    this.tools = {};
  }

  addResource(name, fn) {
    this.resources[name] = fn;
  }

  addTool(name, fn) {
    this.tools[name] = fn;
  }
}

class CoderAgent {
  constructor(model, server) {
    this.model = model;
    this.server = server;
    this.memory = fs.existsSync('memory.log') ? fs.readFileSync('memory.log', 'utf8').split('\n').filter(Boolean) : [];
    this.last_answer = this.memory.length ? this.memory[this.memory.length - 1].split(' -> ')[1] : '';
    this.toolServer = new ToolServer();
    this.toolServer.addResource("files", (path) => fs.readdirSync(path));
    this.toolServer.addTool("web_search", async (query) => {
      const client = new GoogleSearch("40e2780aa7b737be581053a3956630a5a1a448bce5b6f548239ba53a7c47c2b3");
      return new Promise((resolve) => {
        client.json({ q: query, num: 1 }, (data) => {
          resolve(data.organic_results[0]?.snippet || "No results");
        });
      });
    });
    this.toolServer.addTool("bash", (cmd) => execSync(cmd, { encoding: 'utf8' }).trim());
    this.toolServer.addTool("python", (code) => {
      fs.writeFileSync('temp.py', code);
      const output = execSync('python temp.py', { encoding: 'utf8' }).trim();
      fs.unlinkSync('temp.py');
      return output;
    });
    this.toolServer.addTool("memory", (action) => {
      if (action === "show") return this.memory.length ? this.memory.join('\n') : "No history yet";
      if (action === "clear") {
        this.memory = [];
        this.last_answer = '';
        fs.writeFileSync('memory.log', '');
        return "Memory cleared";
      }
      if (action === "save") {
        fs.writeFileSync('memory.log', this.memory.join('\n'));
        return "Memory saved to memory.log";
      }
      if (action === "run_last") {
        if (!this.last_answer) return "No last answer to run";
        if (this.last_answer.startsWith('print')) {
          return this.toolServer.tools.python(this.last_answer);
        }
        return "Last answer not executable: " + this.last_answer;
      }
      if (action === "count") {
        return `Memory has ${this.memory.length} entries`;
      }
      if (action.startsWith("last_")) {
        const n = parseInt(action.split('_')[1]) || 1;
        if (n <= 0) return "Invalid number";
        return this.memory.slice(-n).join('\n') || "No history yet";
      }
      if (action.startsWith("search_")) {
        const query = action.split('_').slice(1).join('_');
        const results = this.memory.filter(line => line.toLowerCase().includes(query.toLowerCase()));
        return results.length ? results.join('\n') : "No matches found";
      }
      if (action.startsWith("repeat_")) {
        const n = parseInt(action.split('_')[1]) || 1;
        if (n <= 0) return "Invalid repeat count";
        if (!this.last_answer) return "No last answer to repeat";
        if (this.last_answer.startsWith('print')) {
          return Array(n).fill(this.toolServer.tools.python(this.last_answer)).join('\n');
        }
        return "Last answer not repeatable: " + this.last_answer;
      }
      return "Unknown memory action";
    });
  }

  async process(message) {
    console.log("CoderAgent processing:", message);
    if (message.startsWith("file:")) {
      return this.toolServer.resources.files(message.slice(5));
    }
    if (message.startsWith("web:")) {
      return await this.toolServer.tools.web_search(message.slice(4));
    }
    if (message.startsWith("bash:")) {
      return this.toolServer.tools.bash(message.slice(5));
    }
    if (message.startsWith("python:")) {
      return this.toolServer.tools.python(message.slice(7));
    }
    if (message.startsWith("memory:")) {
      return this.toolServer.tools.memory(message.slice(7));
    }
    const prompt = "Output only the exact code line requested—no comments, no imports, no newlines before or after, no backticks, no extras, just the raw code.";
    const response = await axios.post(`${this.server}/api/chat`, {
      model: this.model,
      messages: [
        { role: "system", content: prompt },
        { role: "user", content: message }
      ],
      stream: false
    }).catch(err => {
      console.error("Ollama error:", err.response?.data || err.message);
      return { data: { message: { content: "Error" } } };
    });
    const raw = response.data.message.content;
    console.log("Ollama raw:", JSON.stringify(raw));
    const lines = raw.split('\n')
      .map(line => line.replace('```', '').trim())
      .filter(line => line && !line.match(/<think>|<\/think>/i));
    const answer = lines.find(line => line.startsWith('print')) || lines[0] || "No valid code";
    console.log("Processed:", JSON.stringify(answer));
    this.memory.push(`${message} -> ${answer}`);
    fs.writeFileSync('memory.log', this.memory.join('\n'));
    this.last_answer = answer;
    return answer;
  }

  getHistory() {
    return this.memory.map(line => {
      const [task, answer] = line.split(' -> ');
      return { task, answer };
    });
  }
}

const agent = new CoderAgent("deepseek-r1:latest", "http://192.168.0.24:11434");

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/api/status', (req, res) => {
    res.json({ status: 'ok' });
});

app.get('/api/files', (req, res) => {
    try {
        const path = req.query.path || '.';
        const files = agent.toolServer.resources.files(path);
        res.json({ files });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/web-search', async (req, res) => {
    try {
        const query = req.query.query;
        if (!query) return res.status(400).json({ error: 'Query parameter is required' });
        const result = await agent.toolServer.tools.web_search(query);
        res.json({ result });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/bash', (req, res) => {
    try {
        const { command } = req.body;
        if (!command) return res.status(400).json({ error: 'Command is required' });
        const result = agent.toolServer.tools.bash(command);
        res.json({ result });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/python', (req, res) => {
    try {
        const { code } = req.body;
        if (!code) return res.status(400).json({ error: 'Code is required' });
        const result = agent.toolServer.tools.python(code);
        res.json({ result });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/memory', (req, res) => {
    try {
        const action = req.query.action || 'show';
        const result = agent.toolServer.tools.memory(action);
        res.json({ result });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/chat', async (req, res) => {
    try {
        const { message, model } = req.body;
        if (!message) return res.status(400).json({ error: 'Message is required' });
        // Use the model from the request, or fall back to default
        const agentModel = model || 'deepseek-r1:latest';
        const agent = new CoderAgent(agentModel, "http://192.168.0.24:11434");
        const result = await agent.process(message);
        res.json({ message: result });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// New Endpoints
app.get('/api/history', (req, res) => {
    try {
        const history = agent.getHistory();
        res.json({ history });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/repeat', async (req, res) => {
    try {
        const { count } = req.body;
        const n = parseInt(count) || 1;
        if (n <= 0) return res.status(400).json({ error: 'Invalid repeat count' });
        const result = agent.toolServer.tools.memory(`repeat_${n}`);
        res.json({ result });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/execute', async (req, res) => {
    try {
        const { type, input } = req.body;
        if (!type || !input) return res.status(400).json({ error: 'Type and input are required' });
        let result;
        if (type === 'bash') {
            result = agent.toolServer.tools.bash(input);
        } else if (type === 'python') {
            result = agent.toolServer.tools.python(input);
        } else {
            return res.status(400).json({ error: 'Unsupported execution type' });
        }
        res.json({ result });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});
