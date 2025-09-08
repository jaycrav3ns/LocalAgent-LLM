import { toolRegistry } from "../tools/registry";

export async function callToolByName(toolName: string, args: any, context: any) {
  const tool = toolRegistry.find(t => t.name === toolName);
  if (!tool) throw new Error(`Tool not found: ${toolName}`);
  return tool.handler(args, context);
}
