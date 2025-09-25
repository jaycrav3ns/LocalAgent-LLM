import { execSync } from 'child_process';
import fs from 'fs';
import axios from 'axios';

export interface ToolResult {
  success: boolean;
  output: string;
  error?: string;
}

export class LocalAgent {
  private ollamaUrl: string;
  private defaultModel: string;
  private googleSearchKey: string;
  private geminiApiKey?: string;
  private openRouterApiKeys?: { [model: string]: string };

  constructor() {
    this.ollamaUrl = process.env.OLLAMA_URL || "http://192.168.0.24:11434";
    this.defaultModel = "deepseek-r1:latest";
    this.googleSearchKey = process.env.GOOGLE_SEARCH_API_KEY || "40e2780aa7b737be581053a3956630a5a1a448bce5b6f548239ba53a7c47c2b3";
    this.geminiApiKey = process.env.GEMINI_API_KEY;
    // this.openRouterApiKeys will be set from user preferences
  }

  async chat(messages: { role: string, content: string }[], model?: string, user?: any, reasoning?: { enabled: boolean, effort: string }): Promise<ToolResult> {
    if (user && user.preferences) {
      if (user.preferences.geminiApiKey) {
        this.geminiApiKey = user.preferences.geminiApiKey;
      }
      if (user.preferences.openRouterApiKeys) {
        this.openRouterApiKeys = user.preferences.openRouterApiKeys;
      }
    }

    if (model && model.startsWith("gemini")) {
      return this.chatWithGemini(messages, model);
    }

    if (model && model.includes('/')) { // A simple way to detect openrouter models
      return this.chatWithOpenRouter(messages, model, reasoning);
    }

    const systemPrompt = `
You are a helpful AI assistant with access to the following tools:

- 
- 
- 
- 

Please use these tools to answer the user's questions and perform tasks.
`;

    try {
      const response = await axios.post(`${this.ollamaUrl}/api/chat`, {
        model: model || this.defaultModel,
        messages: [
          { role: "system", content: systemPrompt },
          ...messages
        ],
        stream: false
      });

      return {
        success: true,
        output: response.data.message.content
      };
    } catch (error: any) {
      return {
        success: false,
        output: "",
        error: error.response?.data?.error || error.message
      };
    }
  }

  async chatWithOpenRouter(messages: { role: string, content: string }[], model: string, reasoning?: { enabled: boolean, effort: string }): Promise<ToolResult> {
    if (!this.openRouterApiKeys?.[model]) {
      return {
        success: false,
        output: "",
        error: `OpenRouter API key not provided for model ${model}.`
      };
    }

    try {
      const response = await axios.post(`https://openrouter.ai/api/v1/chat/completions`,
        {
          model: model,
          messages: messages,
          reasoning: reasoning
        },
        {
          headers: {
            "Authorization": `Bearer ${this.openRouterApiKeys[model]}`,
            'Content-Type': 'application/json',
          }
        }
      );

      return {
        success: true,
        output: response.data.choices[0].message.content
      };
    } catch (error: any) {
      return {
        success: false,
        output: "",
        error: error.response?.data?.error?.message || error.message
      };
    }
  }

  async chatWithGemini(messages: { role: string, content: string }[], model: string): Promise<ToolResult> {
    if (!this.geminiApiKey) {
      return {
        success: false,
        output: "",
        error: "Gemini API key not provided."
      };
    }

    const systemPrompt = `
You are a helpful AI assistant with access to the following tools:

- 
- 
- 
- 

Please use these tools to answer the user's questions and perform tasks.
`;

    try {
      const contents = messages.map(msg => ({
        role: msg.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: msg.content }]
      }));

      const response = await axios.post(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
        {
          contents: contents,
          system_instruction: {
            parts: [
              {
                text: systemPrompt
              }
            ]
          }
        },
        {
          headers: {
            "x-goog-api-key": this.geminiApiKey,
            "Content-Type": "application/json"
          }
        }
      );

      return {
        success: true,
        output: response.data.candidates[0].content.parts[0].text
      };
    } catch (error: any) {
      return {
        success: false,
        output: "",
        error: error.response?.data?.error?.message || error.message
      };
    }
  }

  async executeBash(command: string, cwd?: string): Promise<ToolResult> {
    try {
      const output = execSync(command, { 
        encoding: 'utf8',
        timeout: 30000,
        maxBuffer: 1024 * 1024,
        cwd: cwd
      });
      return {
        success: true,
        output: output
      };
    } catch (error: any) {
      return {
        success: false,
        output: "",
        error: error.message
      };
    }
  }

  async executePython(code: string): Promise<ToolResult> {
    try {
      const tempFile = `/tmp/temp_${Date.now()}.py`;
      fs.writeFileSync(tempFile, code);
      
      const output = execSync(`python ${tempFile}`, { 
        encoding: 'utf8',
        timeout: 30000,
        maxBuffer: 1024 * 1024
      });
      
      fs.unlinkSync(tempFile);
      
      return {
        success: true,
        output: output
      };
    } catch (error: any) {
      return {
        success: false,
        output: "",
        error: error.message
      };
    }
  }

  async webSearch(query: string): Promise<ToolResult> {
    try {
      const { GoogleSearch } = require('google-search-results-nodejs');
      const client = new GoogleSearch(this.googleSearchKey);
      
      return new Promise((resolve) => {
        client.json({ q: query, num: 5 }, (data: any) => {
          if (data.organic_results && data.organic_results.length > 0) {
            const results = data.organic_results.map((result: any) => 
              `${result.title}\n${result.snippet}\n${result.link}`
            ).join('\n\n');
            
            resolve({
              success: true,
              output: results
            });
          } else {
            resolve({
              success: false,
              output: "",
              error: "No search results found"
            });
          }
        });
      });
    } catch (error: any) {
      return {
        success: false,
        output: "",
        error: error.message
      };
    }
  }

  async listFiles(path: string = "."): Promise<ToolResult> {
    try {
      const files = fs.readdirSync(path, { withFileTypes: true });
      const fileList = files.map(file => {
        const type = file.isDirectory() ? 'directory' : 'file';
        const stats = fs.statSync(`${path}/${file.name}`);
        return {
          name: file.name,
          type,
          size: file.isFile() ? stats.size : null,
          modified: stats.mtime
        };
      });

      return {
        success: true,
        output: JSON.stringify(fileList, null, 2)
      };
    } catch (error: any) {
      return {
        success: false,
        output: "",
        error: error.message
      };
    }
  }

  async readFile(filePath: string): Promise<ToolResult> {
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      return {
        success: true,
        output: content
      };
    } catch (error: any) {
      return {
        success: false,
        output: "",
        error: error.message
      };
    }
  }

  async getAvailableModels(user?: { preferences?: { geminiApiKey?: string; openRouterApiKeys?: { [model: string]: string } } }): Promise<ToolResult> {
    if (user && user.preferences) {
      if (user.preferences.geminiApiKey) {
        this.geminiApiKey = user.preferences.geminiApiKey;
      }
      if (user.preferences.openRouterApiKeys) {
        this.openRouterApiKeys = user.preferences.openRouterApiKeys;
      }
    }

    let localModels: string[] = [];
    try {
      const response = await axios.get(`${this.ollamaUrl}/api/tags`);
      localModels = response.data.models?.map((model: any) => model.name) || [];
    } catch (error) {
      console.error("Could not connect to Ollama server:", error);
    }

    const geminiModels: string[] = this.geminiApiKey ? [
      "gemini-pro",
      "gemini-2.0-flash",
      "gemini-1.5-pro-latest",
      "gemini-1.5-flash"
    ] : [];

    const openRouterModels: string[] = this.openRouterApiKeys ? Object.keys(this.openRouterApiKeys) : [];

    const models = {
      local: localModels,
      gemini: geminiModels,
      openrouter: openRouterModels
    };

    return {
      success: true,
      output: JSON.stringify(models)
    };
  }
}

export const agent = new LocalAgent();
