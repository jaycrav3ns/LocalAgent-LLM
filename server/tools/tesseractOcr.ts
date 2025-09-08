import { ToolManifest } from "../../shared/toolTypes";
import { z } from "zod";
import path from "path";
import { execFile } from "child_process";
import util from "util";

const execFilePromise = util.promisify(execFile);

export const tesseractOcrTool: ToolManifest = {
  name: "tesseract_ocr",
  description: "Extract text from an image using Tesseract OCR. Appends the result as a .txt file next to the original.",
  inputSchema: z.object({ file: z.string() }),
  outputSchema: z.object({
    outputFile: z.string(),
    text: z.string(),
  }),
  async handler({ file }, context) {
    const workspaceRoot = context.workspaceRoot;
    const scriptPath = path.resolve(import.meta.dirname, "../scripts/tesseract_ocr.sh");
    const absInput = path.resolve(workspaceRoot, file);
    if (!absInput.startsWith(workspaceRoot)) {
      throw new Error("Input file is outside the workspace.");
    }
    // Run the script
    await execFilePromise(scriptPath, [absInput], { cwd: workspaceRoot });

    // Determine the output .txt file path
    const outputFile = absInput.replace(/\.[^/.]+$/, ".txt");
    const { promises: fs } = await import("fs");
    let text = "";
    try {
      text = await fs.readFile(outputFile, "utf8");
    } catch (e) {
      throw new Error("Tesseract did not produce output file.");
    }
    return { outputFile, text };
  },
  tags: ["ocr", "image", "tesseract", "script"],
};