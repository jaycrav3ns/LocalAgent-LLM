import fs from "fs";
import path from "path";
import { z } from "zod";
import { ToolManifest } from "../../shared/toolTypes";
import util from "util";

const scriptsDir = path.resolve(import.meta.dirname, "../scripts");

function autoRegisterScripts(): ToolManifest[] {
  const scripts = fs.readdirSync(scriptsDir).filter(f => f.endsWith(".sh") && f !== "tesseract_ocr.sh");
  return scripts.map(script => ({
    name: script.replace(".sh", ""),
    description: `Run the ${script} shell script.`,
    inputSchema: z.object({ args: z.array(z.string()).optional() }), // or more specific
    outputSchema: z.object({ output: z.string() }),
    async handler({ args = [] }, context) {
      const { execFile } = require("child_process");
      const { stdout } = await util.promisify(execFile)(
        path.join(scriptsDir, script),
        args,
        { cwd: context.workspaceRoot }
      );
      return { output: stdout };
    },
    tags: ["script", "shell"],
  }));
}

export const scriptTools = autoRegisterScripts();