const axios = require('axios');
const { program } = require('commander');
const fs = require('fs');
const { GoogleSearch } = require('google-search-results-nodejs');
const { execSync } = require('child_process');

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

  showAnswer(answer) {
    console.log(JSON.stringify(answer));
  }
}

async function main() {
  program.option('--task <task>', 'Task for the agent');
  program.parse();
  const { task } = program.opts();

  const agent = new CoderAgent("deepseek-r1:latest", "http://192.168.0.24:11434");
  if (task) {
    const answer = await agent.process(task);
    agent.showAnswer(answer);
  } else {
    console.log("Enter task:");
  }
}

main().catch(console.error);
