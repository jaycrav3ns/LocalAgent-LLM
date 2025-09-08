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
    const tree = await runTreeJson(dir, ["-J", "-n"], workspaceRoot);

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
      ["-J", "-n", "-p", "-s"],
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
    tree: z.array(z.any()), // full tree as output by tree -Jvsp --du --dirsfirst
  }),
  async handler({ dir }, context) {
    // -J = JSON, -v = version sort, -s = size, -p = perms, --du = show dir disk usage, --dirsfirst
    const workspaceRoot = context.workspaceRoot;
    const tree = await runTreeJson(
      dir,
      ["-J", "-v", "-s", "-p", "--du", "--dirsfirst"],
      workspaceRoot
    );
    // No filtering: raw tree output
    return { tree };
  },
};