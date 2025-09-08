import { drizzle } from 'drizzle-orm/node-postgres';
import { eq, ilike, desc, or, and } from 'drizzle-orm';
import drizzleConfig from '../drizzle.config.js';
import pg from 'pg';
import {
  users,
  chatSessions,
  agentMemory,
  quickCommands,
  workspaces,
  type User,
  type UpsertUser,
  type ChatSession,
  type InsertChatSession,
  type AgentMemory,
  type InsertAgentMemory,
  type QuickCommand,
  type InsertQuickCommand,
  type Workspace,
} from "../shared/schema";

const { Pool } = pg;

export interface IStorage {
  // User operations
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  updateUserPreferences(id: string, preferences: any): Promise<User>;
  deleteUser(id: string): Promise<void>;
  
  // Chat session operations
  getChatSessions(userId: string): Promise<ChatSession[]>;
  getChatSession(id: number): Promise<ChatSession | undefined>;
  createChatSession(session: InsertChatSession): Promise<ChatSession>;
  updateChatSession(id: number, updates: Partial<ChatSession>): Promise<ChatSession>;
  deleteChatSession(id: number): Promise<void>;
  
  // Agent memory operations
  getAgentMemory(userId: string, limit?: number): Promise<AgentMemory[]>;
  addAgentMemory(memory: InsertAgentMemory): Promise<AgentMemory>;
  searchAgentMemory(userId: string, query: string): Promise<AgentMemory[]>;
  clearAgentMemory(userId: string): Promise<void>;
  
  // Quick commands operations
  getQuickCommands(userId: string): Promise<QuickCommand[]>;
  createQuickCommand(command: InsertQuickCommand): Promise<QuickCommand>;
  updateQuickCommand(id: number, updates: Partial<QuickCommand>): Promise<QuickCommand>;
  deleteQuickCommand(id: number): Promise<void>;

  // Workspace operations
  createWorkspace(data: {
    userId: string;
    name: string;
    description?: string;
    directory: string;
    meta?: any;
  }): Promise<Workspace>;
  getUserWorkspaces(userId: string): Promise<Workspace[]>;
  getWorkspace(id: string, userId: string): Promise<Workspace | undefined>;
  updateWorkspace(id: string, userId: string, data: Partial<{
    name: string;
    description: string;
    directory: string;
    meta: any;
  }>): Promise<Workspace>;
  deleteWorkspace(id: string, userId: string): Promise<void>;
}

export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private chatSessions: Map<number, ChatSession>;
  private agentMemory: Map<number, AgentMemory>;
  private quickCommands: Map<number, QuickCommand>;
  private currentChatId: number;
  private currentMemoryId: number;
  private currentCommandId: number;

  constructor() {
    this.users = new Map();
    this.chatSessions = new Map();
    this.agentMemory = new Map();
    this.quickCommands = new Map();
    this.currentChatId = 1;
    this.currentMemoryId = 1;
    this.currentCommandId = 1;
    
    this.initializeDefaultCommands();
  }

  private initializeDefaultCommands() {
    const defaultCommands = [
      { name: "List Files", command: "ls -la", type: "bash", description: "List directory contents" },
      { name: "Python Version", command: "import sys; print(sys.version)", type: "python", description: "Show Python version" },
      { name: "Current Directory", command: "pwd", type: "bash", description: "Show current directory" },
      { name: "System Info", command: "uname -a", type: "bash", description: "Show system information" },
    ];
    
    defaultCommands.forEach(cmd => {
      const command: QuickCommand = {
        id: this.currentCommandId++,
        userId: "default",
        name: cmd.name,
        command: cmd.command,
        type: cmd.type,
        description: cmd.description,
        isDefault: true,
        createdAt: new Date(),
      };
      this.quickCommands.set(command.id, command);
    });
  }

  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(user => user.username === username);
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(user => user.email === email);
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const existingUser = this.users.get(userData.id);
    const user: User = {
      id: userData.id,
      email: userData.email ?? null,
      displayName: userData.displayName ?? null,
      profileImageUrl: userData.profileImageUrl ?? null,
      username: userData.username ?? null,
      password: userData.password ?? null,
      preferences: userData.preferences ?? null,
      directory: userData.directory ?? null,
      createdAt: existingUser?.createdAt ?? new Date(),
      updatedAt: new Date(),
    };
    this.users.set(userData.id, user);
    return user;
  }

  async updateUserPreferences(id: string, preferences: any): Promise<User> {
    const user = this.users.get(id);
    if (!user) throw new Error("User not found");
    
    const updatedUser = {
      ...user,
      preferences: { ...user.preferences, ...preferences },
      updatedAt: new Date(),
    };
    this.users.set(id, updatedUser);
    return updatedUser;
  }

  async deleteUser(id: string): Promise<void> {
    this.users.delete(id);
  }

  async getChatSessions(userId: string): Promise<ChatSession[]> {
    return Array.from(this.chatSessions.values()).filter(
      session => session.userId === userId
    );
  }

  async getChatSession(id: number): Promise<ChatSession | undefined> {
    return this.chatSessions.get(id);
  }

  async createChatSession(sessionData: InsertChatSession): Promise<ChatSession> {
    const session: ChatSession = {
      id: this.currentChatId++,
      userId: sessionData.userId,
      title: sessionData.title ?? null,
      model: sessionData.model,
      messages: sessionData.messages ? [...sessionData.messages] : null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.chatSessions.set(session.id, session);
    return session;
  }

  async updateChatSession(id: number, updates: Partial<ChatSession>): Promise<ChatSession> {
    const session = this.chatSessions.get(id);
    if (!session) throw new Error("Chat session not found");
    
    const updatedSession = {
      ...session,
      ...updates,
      updatedAt: new Date(),
    };
    this.chatSessions.set(id, updatedSession);
    return updatedSession;
  }

  async deleteChatSession(id: number): Promise<void> {
    this.chatSessions.delete(id);
  }

  async getAgentMemory(userId: string, limit = 100): Promise<AgentMemory[]> {
    const userMemory = Array.from(this.agentMemory.values())
      .filter(memory => memory.userId === userId)
      .sort((a, b) => b.createdAt!.getTime() - a.createdAt!.getTime())
      .slice(0, limit);
    return userMemory;
  }

  async addAgentMemory(memoryData: InsertAgentMemory): Promise<AgentMemory> {
    const memory: AgentMemory = {
      id: this.currentMemoryId++,
      userId: memoryData.userId,
      operation: memoryData.operation,
      input: memoryData.input,
      output: memoryData.output,
      model: memoryData.model ?? null,
      createdAt: new Date(),
    };
    this.agentMemory.set(memory.id, memory);
    return memory;
  }

  async searchAgentMemory(userId: string, query: string): Promise<AgentMemory[]> {
    const userMemory = Array.from(this.agentMemory.values())
      .filter(memory => 
        memory.userId === userId && 
        (memory.input.toLowerCase().includes(query.toLowerCase()) || 
         memory.output.toLowerCase().includes(query.toLowerCase()))
      )
      .sort((a, b) => b.createdAt!.getTime() - a.createdAt!.getTime());
    return userMemory;
  }

  async clearAgentMemory(userId: string): Promise<void> {
    const userMemoryIds = Array.from(this.agentMemory.entries())
      .filter(([_, memory]) => memory.userId === userId)
      .map(([id, _]) => id);
    
    userMemoryIds.forEach(id => this.agentMemory.delete(id));
  }

  async getQuickCommands(userId: string): Promise<QuickCommand[]> {
    const userCommands = Array.from(this.quickCommands.values())
      .filter(command => command.userId === userId || command.isDefault);
    return userCommands;
  }

  async createQuickCommand(commandData: InsertQuickCommand): Promise<QuickCommand> {
    const command: QuickCommand = {
      id: this.currentCommandId++,
      userId: commandData.userId,
      name: commandData.name,
      type: commandData.type,
      command: commandData.command,
      description: commandData.description ?? null,
      isDefault: commandData.isDefault ?? null,
      createdAt: new Date(),
    };
    this.quickCommands.set(command.id, command);
    return command;
  }

  async updateQuickCommand(id: number, updates: Partial<QuickCommand>): Promise<QuickCommand> {
    const command = this.quickCommands.get(id);
    if (!command) throw new Error("Quick command not found");
    
    const updatedCommand = { ...command, ...updates };
    this.quickCommands.set(id, updatedCommand);
    return updatedCommand;
  }

  async deleteQuickCommand(id: number): Promise<void> {
    this.quickCommands.delete(id);
  }

  async createWorkspace(data: {
    userId: string;
    name: string;
    description?: string;
    directory: string;
    meta?: any;
  }): Promise<Workspace> {
    throw new Error('Workspaces are not supported in MemStorage');
  }

  async getUserWorkspaces(userId: string): Promise<Workspace[]> {
    throw new Error('Workspaces are not supported in MemStorage');
  }

  async getWorkspace(id: string, userId: string): Promise<Workspace | undefined> {
    throw new Error('Workspaces are not supported in MemStorage');
  }

  async updateWorkspace(id: string, userId: string, data: Partial<{
    name: string;
    description: string;
    directory: string;
    meta: any;
  }>): Promise<Workspace> {
    throw new Error('Workspaces are not supported in MemStorage');
  }

  async deleteWorkspace(id: string, userId: string): Promise<void> {
    throw new Error('Workspaces are not supported in MemStorage');
  }
}

// Database configuration - reuse drizzle config
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

// Alternative: Use drizzle config directly
// const pool = new Pool({
//   host: drizzleConfig.dbCredentials.host,
//   user: drizzleConfig.dbCredentials.user,
//   database: drizzleConfig.dbCredentials.database,
//   password: drizzleConfig.dbCredentials.password,
//   ssl: drizzleConfig.dbCredentials.ssl,
// });

// Test connection
pool.connect((err, client, release) => {
  if (err) {
    console.error('Database connection error:', err);
  } else {
    console.log('Database connected successfully');
    release();
  }
});

const db = drizzle(pool);

// Export the db instance
export { db };

export class DrizzleStorage implements IStorage {
  async getUser(id: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
    return result[0];
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.username, username)).limit(1);
    return result[0];
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.email, email)).limit(1);
    return result[0];
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    try {
      const result = await db
        .insert(users)
        .values({
          id: userData.id,
          username: userData.username,
          password: userData.password,
          email: userData.email,
          displayName: userData.displayName,
          profileImageUrl: userData.profileImageUrl,
          preferences: userData.preferences,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .onConflictDoUpdate({
          target: users.id,
          set: {
            username: userData.username,
            password: userData.password,
            email: userData.email,
            displayName: userData.displayName,
            profileImageUrl: userData.profileImageUrl,
            preferences: userData.preferences,
            updatedAt: new Date(),
          },
        })
        .returning();
      return result[0];
    } catch (error) {
      console.error('Error upserting user:', error);
      throw error;
    }
  }

  async updateUserPreferences(id: string, preferences: any): Promise<User> {
    const { directory, ...prefs } = preferences;
    const updateData: Partial<User> = { preferences: prefs, updatedAt: new Date() };

    if (directory) {
      updateData.directory = directory;
    }

    const result = await db
      .update(users)
      .set(updateData)
      .where(eq(users.id, id))
      .returning();
    if (!result[0]) throw new Error('User not found');
    return result[0];
  }

  async deleteUser(id: string): Promise<void> {
    await db.delete(users).where(eq(users.id, id));
  }

  async getChatSessions(userId: string): Promise<ChatSession[]> {
    try {
      console.log('DrizzleStorage: Fetching sessions for user:', userId);
      const sessions = await db
        .select()
        .from(chatSessions)
        .where(eq(chatSessions.userId, userId))
        .orderBy(desc(chatSessions.createdAt));
      console.log('DrizzleStorage: Found sessions:', sessions.length);
      return sessions;
    } catch (error) {
      console.error('DrizzleStorage: Error fetching sessions:', error);
      return [];
    }
  }

  async getChatSession(id: number): Promise<ChatSession | undefined> {
    const result = await db.select().from(chatSessions).where(eq(chatSessions.id, id)).limit(1);
    return result[0];
  }

  async createChatSession(sessionData: InsertChatSession): Promise<ChatSession> {
    const result = await db
      .insert(chatSessions)
      .values({
        userId: sessionData.userId,
        title: sessionData.title,
        model: sessionData.model,
        messages: sessionData.messages || [],
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();
    return result[0];
  }

  async updateChatSession(id: number, updates: Partial<ChatSession>): Promise<ChatSession> {
    const result = await db
      .update(chatSessions)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(chatSessions.id, id))
      .returning();
    if (!result[0]) throw new Error('Chat session not found');
    return result[0];
  }

  async deleteChatSession(id: number): Promise<void> {
    await db.delete(chatSessions).where(eq(chatSessions.id, id));
  }

  async getAgentMemory(userId: string, limit = 100): Promise<AgentMemory[]> {
    return db
      .select()
      .from(agentMemory)
      .where(eq(agentMemory.userId, userId))
      .orderBy(desc(agentMemory.createdAt))
      .limit(limit);
  }

  async addAgentMemory(memoryData: InsertAgentMemory): Promise<AgentMemory> {
    const result = await db
      .insert(agentMemory)
      .values({
        userId: memoryData.userId,
        operation: memoryData.operation,
        input: memoryData.input,
        output: memoryData.output,
        model: memoryData.model,
        createdAt: new Date(),
      })
      .returning();
    return result[0];
  }

  async searchAgentMemory(userId: string, query: string): Promise<AgentMemory[]> {
    return db
      .select()
      .from(agentMemory)
      .where(
        and(
          eq(agentMemory.userId, userId),
          or(
            ilike(agentMemory.input, `%${query}%`),
            ilike(agentMemory.output, `%${query}%`)
          )
        )
      )
      .orderBy(desc(agentMemory.createdAt));
  }

  async clearAgentMemory(userId: string): Promise<void> {
    await db.delete(agentMemory).where(eq(agentMemory.userId, userId));
  }

  async getQuickCommands(userId: string): Promise<QuickCommand[]> {
    return db
      .select()
      .from(quickCommands)
      .where(or(eq(quickCommands.userId, userId), eq(quickCommands.isDefault, true)));
  }

  async createQuickCommand(command: InsertQuickCommand): Promise<QuickCommand> {
    const result = await db
      .insert(quickCommands)
      .values({
        userId: command.userId,
        name: command.name,
        command: command.command,
        type: command.type,
        description: command.description,
        isDefault: command.isDefault || false,
        createdAt: new Date(),
      })
      .returning();
    return result[0];
  }

  async updateQuickCommand(id: number, updates: Partial<QuickCommand>): Promise<QuickCommand> {
    const result = await db
      .update(quickCommands)
      .set({ ...updates })
      .where(eq(quickCommands.id, id))
      .returning();
    if (!result[0]) throw new Error('Quick command not found');
    return result[0];
  }

  async deleteQuickCommand(id: number): Promise<void> {
    await db.delete(quickCommands).where(eq(quickCommands.id, id));
  }

  async createWorkspace(data: {
    userId: string;
    name: string;
    description?: string;
    directory: string;
    meta?: any;
  }): Promise<Workspace> {
    const [workspace] = await db
      .insert(workspaces)
      .values(data)
      .returning();
    return workspace;
  }

  async getUserWorkspaces(userId: string): Promise<Workspace[]> {
    return db
      .select()
      .from(workspaces)
      .where(eq(workspaces.userId, userId));
  }

  async getWorkspace(id: string, userId: string): Promise<Workspace | undefined> {
    const [workspace] = await db
      .select()
      .from(workspaces)
      .where(and(eq(workspaces.id, id), eq(workspaces.userId, userId)));
    return workspace;
  }

  async updateWorkspace(id: string, userId: string, data: Partial<{
    name: string;
    description: string;
    directory: string;
    meta: any;
  }>): Promise<Workspace> {
    const [workspace] = await db
      .update(workspaces)
      .set({ ...data, updatedAt: new Date() })
      .where(and(eq(workspaces.id, id), eq(workspaces.userId, userId)))
      .returning();
    return workspace;
  }

  async deleteWorkspace(id: string, userId: string): Promise<void> {
    await db
      .delete(workspaces)
      .where(and(eq(workspaces.id, id), eq(workspaces.userId, userId)));
  }
}

// Use DrizzleStorage if DATABASE_URL is available, otherwise fall back to MemStorage
console.log('DATABASE_URL exists:', !!process.env.DATABASE_URL);
console.log('Using storage type:', process.env.DATABASE_URL ? 'DrizzleStorage' : 'MemStorage');
export const storage = process.env.DATABASE_URL ? new DrizzleStorage() : new MemStorage();
