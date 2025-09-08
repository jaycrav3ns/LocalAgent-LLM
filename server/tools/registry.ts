import { tesseractOcrTool } from "./tesseractOcr";
import { scriptTools } from "./scripts";
import { treeSimpleTool, treeExtendedTool, treeFullTool } from "./tree"; // Import the new tools

export const toolRegistry = [
  // ...other tools,
  tesseractOcrTool,
  ...scriptTools,
  treeSimpleTool,
  treeExtendedTool,
  treeFullTool,
];
