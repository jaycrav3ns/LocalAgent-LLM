import { db } from "../storage";
import { eq } from "drizzle-orm";
import {
  workspaces, chats, contexts, commands, bookmarks, memory, history,
} from "../../shared/schema";

export async function exportWorkspace(id: string) {
  const ws = await db.select().from(workspaces).where(eq(workspaces.id, id));
  const chat = await db.select().from(chats).where(eq(chats.workspaceId, id));
  const ctx = await db.select().from(contexts).where(eq(contexts.workspaceId, id));
  const cmds = await db.select().from(commands).where(eq(commands.workspaceId, id));
  const bms = await db.select().from(bookmarks).where(eq(bookmarks.workspaceId, id));
  const mem = await db.select().from(memory).where(eq(memory.workspaceId, id));
  const hist = await db.select().from(history).where(eq(history.workspaceId, id));
  return {
    workspace: ws[0],
    chat,
    contexts: ctx,
    commands: cmds,
    bookmarks: bms,
    memory: mem,
    history: hist,
  };
}

// Import would be the reverse, validating with Zod and inserting as needed.
