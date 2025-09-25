import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./localAuth";
import { agent } from "./agent";
import { z } from "zod";
import workspaceRoutes from './routes/workspaces';
import toolRoutes from './routes/tools';
import userFilesRoutes from './routes/userFiles'; // Import the new user files router
import path from 'path';
import { promises as fs } from 'fs';
import { nanoid } from 'nanoid';



export async function registerRoutes(app: Express): Promise<Server> {
  // Auth middleware
  await setupAuth(app);

  // Auth routes
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user;
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // User preferences
  app.patch('/api/user/preferences', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const preferences = req.body;
      const user = await storage.updateUserPreferences(userId, preferences);
      res.json(user);
    } catch (error) {
      console.error("Error updating preferences:", error);
      res.status(500).json({ message: "Failed to update preferences" });
    }
  });

  // Chat endpoints
  app.post('/api/chat', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const user = await storage.getUser(userId);
      const { message, model, sessionId, reasoning } = req.body;
      
      if (!message) {
        return res.status(400).json({ error: 'Message is required' });
      }

      // Get or create chat session
      let session;
      if (sessionId) {
        session = await storage.getChatSession(sessionId);
        if (!session || session.userId !== userId) {
          return res.status(404).json({ error: 'Chat session not found' });
        }
      } else {
        const systemPrompt = "You are a code generation assistant. You will be given a prompt and you should only reply with the generated code. Do not include any explanations, introductions, or any other text that is not code.";
        let chatTitle = message;
        if (message.startsWith(systemPrompt)) {
          chatTitle = message.substring(systemPrompt.length).trim();
        }

        session = await storage.createChatSession({
          userId,
          title: chatTitle.substring(0, 50) + "...",
          model: model || "deepseek-r1:latest",
          messages: []
        });
      }

      const userMessage = {
        role: 'user' as const,
        content: message,
        timestamp: new Date().toISOString()
      };
      session.messages.push(userMessage);

      // Process message with agent
      const result = await agent.chat(session.messages, model, user, reasoning);
      
      // Add assistant response
      const assistantMessage = {
        role: 'assistant' as const,
        content: result.success ? result.output : `Error: ${result.error}`,
        timestamp: new Date().toISOString()
      };

      // Update session with new messages
      const updatedMessages = [...(session.messages || []), assistantMessage];
      await storage.updateChatSession(session.id, { messages: updatedMessages });

      // Add to memory
      await storage.addAgentMemory({
        userId,
        operation: 'chat',
        input: message,
        output: assistantMessage.content,
        model: model || session.model
      });

      res.json({
        sessionId: session.id,
        message: assistantMessage,
        success: result.success
      });
    } catch (error) {
      console.error("Chat error:", error);
      res.status(500).json({ error: "Failed to process chat message" });
    }
  });

  app.get('/api/chat/sessions', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      console.log('Fetching sessions for user:', userId); // Debug log
      const sessions = await storage.getChatSessions(userId);
      console.log('Found sessions:', sessions.length); // Debug log
      res.json(sessions);
    } catch (error) {
      console.error("Error fetching chat sessions:", error);
      res.status(500).json({ error: "Failed to fetch chat sessions" });
    }
  });

  app.get('/api/chat/sessions/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const sessionId = parseInt(req.params.id);
      const session = await storage.getChatSession(sessionId);
      
      if (!session || session.userId !== userId) {
        return res.status(404).json({ error: 'Chat session not found' });
      }
      
      res.json(session);
    } catch (error) {
      console.error("Error fetching chat session:", error);
      res.status(500).json({ error: "Failed to fetch chat session" });
    }
  });

  app.delete('/api/chat/sessions/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const sessionId = parseInt(req.params.id);
      const session = await storage.getChatSession(sessionId);
      
      if (!session || session.userId !== userId) {
        return res.status(404).json({ error: 'Chat session not found' });
      }
      
      await storage.deleteChatSession(sessionId);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting chat session:", error);
      res.status(500).json({ error: "Failed to delete chat session" });
    }
  });

  // Command execution endpoints
  app.post('/api/execute/bash', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const { command, cwd } = req.body;

      if (!command) {
        return res.status(400).json({ error: 'Command is required' });
      }

      // Get user's home directory to ensure commands are executed in the correct context
      const user = await storage.getUser(userId);
      if (!user || !user.directory) {
        return res.status(400).json({ error: 'User directory not configured.' });
      }
      const userHomeDir = path.join(process.cwd(), '.local-agent-workspaces', user.directory, 'home');

      // Validate and resolve the final working directory
      const relativeCwd = (cwd || '.').startsWith('/') ? (cwd || '.').substring(1) : (cwd || '.');
      const finalCwd = path.join(userHomeDir, relativeCwd);

      // Security check: ensure the finalCwd is within the user's home directory
      if (!finalCwd.startsWith(userHomeDir)) {
        return res.status(403).json({ error: 'Access denied: Cannot execute commands outside of the designated workspace.' });
      }

      const result = await agent.executeBash(command, finalCwd);

      // Add to memory
      await storage.addAgentMemory({
        userId,
        operation: 'bash',
        input: command,
        output: result.success ? result.output : result.error || 'Command failed'
      });

      res.json(result);
    } catch (error) {
      console.error("Bash execution error:", error);
      res.status(500).json({ error: "Failed to execute bash command" });
    }
  });

  app.post('/api/execute/python', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const { code } = req.body;
      
      if (!code) {
        return res.status(400).json({ error: 'Code is required' });
      }

      const result = await agent.executePython(code);
      
      // Add to memory
      await storage.addAgentMemory({
        userId,
        operation: 'python',
        input: code,
        output: result.success ? result.output : result.error || 'Code execution failed'
      });

      res.json(result);
    } catch (error) {
      console.error("Python execution error:", error);
      res.status(500).json({ error: "Failed to execute Python code" });
    }
  });

  app.post('/api/execute/search', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const { query } = req.body;
      
      if (!query) {
        return res.status(400).json({ error: 'Query is required' });
      }

      const result = await agent.webSearch(query);
      
      // Add to memory
      await storage.addAgentMemory({
        userId,
        operation: 'web',
        input: query,
        output: result.success ? result.output : result.error || 'Search failed'
      });

      res.json(result);
    } catch (error) {
      console.error("Web search error:", error);
      res.status(500).json({ error: "Failed to perform web search" });
    }
  });

  app.get('/api/files/read', isAuthenticated, async (req: any, res) => {
    try {
      const filePath = req.query.path;
      if (!filePath) {
        return res.status(400).json({ error: 'File path is required' });
      }

      const result = await agent.readFile(filePath as string);
      res.json(result);
    } catch (error) {
      console.error("File read error:", error);
      res.status(500).json({ error: "Failed to read file" });
    }
  });

  // Memory endpoints
  app.get('/api/memory', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const limit = parseInt(req.query.limit as string) || 50;
      const memory = await storage.getAgentMemory(userId, limit);
      res.json(memory);
    } catch (error) {
      console.error("Memory fetch error:", error);
      res.status(500).json({ error: "Failed to fetch memory" });
    }
  });

  app.get('/api/memory/search', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const query = req.query.q as string;
      
      if (!query) {
        return res.status(400).json({ error: 'Search query is required' });
      }

      const results = await storage.searchAgentMemory(userId, query);
      res.json(results);
    } catch (error) {
      console.error("Memory search error:", error);
      res.status(500).json({ error: "Failed to search memory" });
    }
  });

  app.delete('/api/memory', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      await storage.clearAgentMemory(userId);
      res.json({ success: true });
    } catch (error) {
      console.error("Memory clear error:", error);
      res.status(500).json({ error: "Failed to clear memory" });
    }
  });

  // Quick commands endpoints
  app.get('/api/commands', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const commands = await storage.getQuickCommands(userId);
      res.json(commands);
    } catch (error) {
      console.error("Commands fetch error:", error);
      res.status(500).json({ error: "Failed to fetch commands" });
    }
  });

  app.post('/api/commands', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const { name, command, type, description } = req.body;
      
      if (!name || !command || !type) {
        return res.status(400).json({ error: 'Name, command, and type are required' });
      }

      const newCommand = await storage.createQuickCommand({
        userId,
        name,
        command,
        type,
        description,
        isDefault: false
      });

      res.json(newCommand);
    } catch (error) {
      console.error("Command creation error:", error);
      res.status(500).json({ error: "Failed to create command" });
    }
  });

  app.delete('/api/commands/:id', isAuthenticated, async (req: any, res) => {
    try {
      const commandId = parseInt(req.params.id);
      await storage.deleteQuickCommand(commandId);
      res.json({ success: true });
    } catch (error) {
      console.error("Command deletion error:", error);
      res.status(500).json({ error: "Failed to delete command" });
    }
  });

  // Model endpoints
  app.get('/api/models', isAuthenticated, async (req: any, res) => {
    try {
      res.setHeader('Cache-Control', 'no-cache');
      const result = await agent.getAvailableModels();
      res.json(result);
    } catch (error) {
      console.error("Models fetch error:", error);
      res.status(500).json({ error: "Failed to fetch available models" });
    }
  });

  // New endpoint for user-specific file management
  app.use('/api/user-files', isAuthenticated, userFilesRoutes);

  

  app.get('/api/directories', isAuthenticated, async (req: any, res) => {
    try {
      const currentPath = req.query.path || process.cwd();
      const entries = await fs.readdir(currentPath, { withFileTypes: true });
      const directories = entries
        .filter(entry => entry.isDirectory())
        .map(entry => ({
          name: entry.name,
          path: path.join(currentPath, entry.name)
        }));
      
      res.json({ 
        currentPath: currentPath,
        directories 
      });
    } catch (error) {
      console.error("Error browsing directories:", error);
      res.status(500).json({ error: "Failed to browse directories" });
    }
  });

  app.use('/api/workspaces', isAuthenticated, workspaceRoutes);
  app.use('/api/tools', isAuthenticated, toolRoutes);

  const httpServer = createServer(app);
  return httpServer;
}
