import type { Tool } from "./types.ts";
import { validateTool } from "./validate.ts";

export async function loadTool(filePath: string): Promise<Tool> {
  const module = (await import(filePath)) as { tool?: unknown };
  validateTool(module.tool);
  return module.tool;
}
