import { readdir } from "node:fs/promises";
import { join } from "node:path";
import { loadTool } from "./loader.ts";
import { ToolRegistry } from "./registry.ts";

export async function createToolRegistry(dir: string): Promise<ToolRegistry> {
  const toolRegistry = new ToolRegistry();

  let entries: string[];
  try {
    entries = await readdir(dir);
  } catch {
    return toolRegistry;
  }

  for (const entry of entries) {
    if (!entry.endsWith(".ts")) {
      continue;
    }

    try {
      const tool = await loadTool(join(dir, entry));
      toolRegistry.register(tool);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.warn(`Skipping ${entry}: ${message}`);
    }
  }

  return toolRegistry;
}
