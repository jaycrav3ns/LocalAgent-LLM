import { ZodTypeAny } from "zod";

export interface ToolManifest {
  name: string;
  description: string;
  inputSchema: ZodTypeAny;
  outputSchema: ZodTypeAny;
  handler: (args: any, context: any) => Promise<any>;
  tags?: string[];
  enabled?: boolean;
  mcpEndpoint?: string;
}
