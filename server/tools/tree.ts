import { ToolManifest } from "../../shared/toolTypes";
import { z } from "zod";
import path from "path";
import { execFile } from "child_process";
import util from "util";

const execFilePromise = util.promisify(execFile);

// Shared helper to run the tree command and parse JSON output
async function runTreeJson(
  dir: string,
  treeArgs: string[],
  workspaceRoot: string
) {
  const safeDir = path.resolve(workspaceRoot, dir);
  if (!safeDir.startsWith(workspaceRoot))
    throw new Error("Directory is outside workspace root.");

  // Always use -J for JSON output
  const args = [...treeArgs, safeDir];

  const { stdout } = await execFilePromise("tree", args, {
    cwd: workspaceRoot,
    maxBuffer: 10 * 1024 * 1024, // 10 MB buffer for large trees
  });

  let tree;
  try {
    tree = JSON.parse(stdout);
  } catch (e) {
    throw new Error("Failed to parse tree JSON output.");
  }
  return tree;
}

// tree_simple: just names and type
export const treeSimpleTool: ToolManifest = {
  name: "tree_simple",
  description: "List files and directories (simple mode: name and type only).",
  inputSchema: z.object({ dir: z.string() }),
  outputSchema: z.object({
    tree: z.array(
      z.object({
        name: z.string(),
        type: z.string(),
        contents: z.array(z.any()).optional(),
      })
    ),
  }),
  async handler({ dir }, context) {
    // -J = JSON, -n = no color, -L 2 = max depth 2 (optional, remove for full)
    const workspaceRoot = context.workspaceRoot;
    const tree = await runTreeJson(dir, ["-J", "-L", "1"], workspaceRoot);

    // Optionally strip unneeded fields for "simple" mode
    function simplify(node: any): any {
      return {
        name: node.name,
        type: node.type,
        contents: node.contents
          ? node.contents.map(simplify)
          : undefined,
      };
    }
    // tree output is an array
    const simpleTree = Array.isArray(tree)
      ? tree.map(simplify)
      : [simplify(tree)];

    return { tree: simpleTree };
  },
};

// tree_extended: name, type, size, permissions
export const treeExtendedTool: ToolManifest = {
  name: "tree_extended",
  description:
    "List files and directories (extended mode: names, types, sizes, permissions).",
  inputSchema: z.object({ dir: z.string() }),
  outputSchema: z.object({
    tree: z.array(
      z.object({
        name: z.string(),
        type: z.string(),
        size: z.number().optional(),
        mode: z.string().optional(),
        prot: z.string().optional(),
        contents: z.array(z.any()).optional(),
      })
    ),
  }),
  async handler({ dir }, context) {
    // -J = JSON, -n = no color, -p = show permissions, -s = show size
    const workspaceRoot = context.workspaceRoot;
    const tree = await runTreeJson(
      dir,
      ["-J", "-L", "1", "-p", "-s"],
      workspaceRoot
    );

    // Optionally filter to just a subset of fields
    function filterExtended(node: any): any {
      return {
        name: node.name,
        type: node.type,
        size: node.size,
        mode: node.mode,
        prot: node.prot,
        contents: node.contents
          ? node.contents.map(filterExtended)
          : undefined,
      };
    }
    const extendedTree = Array.isArray(tree)
      ? tree.map(filterExtended)
      : [filterExtended(tree)];

    return { tree: extendedTree };
  },
};

// tree_full: all available metadata
export const treeFullTool: ToolManifest = {
  name: "tree_full",
  description:
    "List files and directories (full mode: all available metadata, dirs first, totals, etc).",
  inputSchema: z.object({ dir: z.string() }),
  outputSchema: z.object({
    tree: z.array(z.any()), // full tree as output by tree -Jsp -L 1 --du --dirsfirst
  }),
  async handler({ dir }, context) {
    // -J = JSON, -v = version sort, -s = size, -p = perms, --du = show dir disk usage, --dirsfirst
    const workspaceRoot = context.workspaceRoot;
    const tree = await runTreeJson(
      dir,
      ["-J", "-L", "1", "-s", "-p", "--du", "--dirsfirst"],
      workspaceRoot
    );
    // No filtering: raw tree output
    return { tree };
  },
};

// --- Start of runnable script block ---

// This allows the script to be run directly for testing, e.g., via "tsx server/tools/tree.ts simple ."
// It checks if the script path in the command arguments matches the actual module path.
const initializeTestRunner = async () => {
    const runnerArg = process.argv[2];
    const validCommands = ["simple", "extended", "full"];

    if (validCommands.includes(runnerArg)) {
        await runCli();
    }
};

const runCli = async () => {
    const args = process.argv.slice(2); // Args are [type, directory]
    if (args.length !== 2) {
        console.error("Usage: tsx server/tools/tree.ts <type> <directory>");
        console.error("  type: simple, extended, or full");
        console.error("  directory: path relative to the project root");
        process.exit(1);
    }

    const [toolType, dir] = args;

    const context = {
        workspaceRoot: process.cwd(), // Assume script is run from project root
    };

    let tool;
    switch (toolType) {
        case "simple":
            tool = treeSimpleTool;
            break;
        case "extended":
            tool = treeExtendedTool;
            break;
        case "full":
            tool = treeFullTool;
            break;
        default:
            console.error(`Unknown tool type: ${toolType}`);
            console.error("Available types: simple, extended, full");
            process.exit(1);
    }

    try {
        console.log(`Running ${tool.name} on directory: "${dir}"...`);
        const result = await tool.handler({ dir }, context as any);
        console.log(JSON.stringify(result, null, 2));
    } catch (error) {
        console.error("Error executing tool:", error);
        process.exit(1);
    }
};

initializeTestRunner();
// --- End of runnable script block ---
