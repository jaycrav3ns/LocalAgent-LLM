import express from "express";
import { toolRegistry } from "../tools/registry";
const router = express.Router();

// GET route (as before)
router.get("/", (_, res) => {
  res.json(toolRegistry.map(({ name, description, inputSchema, outputSchema, tags, enabled }) => ({
    name, description, inputSchema, outputSchema, tags, enabled
  })));
});

// PUT route to toggle 'enabled' status
router.put("/:name/enabled", (req, res) => {
  const { name } = req.params;
  const { enabled } = req.body; // Expecting { enabled: boolean } in the request body

  const toolIndex = toolRegistry.findIndex(t => t.name === name);
  if (toolIndex === -1) {
    return res.status(404).json({ message: "Tool not found" });
  }

  toolRegistry[toolIndex] = { ...toolRegistry[toolIndex], enabled }; // Update the 'enabled' property

  res.json({ message: `Tool ${name} enabled status updated to ${enabled}` });
});

export default router;
