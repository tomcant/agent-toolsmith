import { mkdir } from "node:fs/promises";
import { ToolRegistry } from "./registry.ts";
import { type SkippedTool, ToolStore } from "./store.ts";

export async function createToolRegistry(
  toolDir: string,
): Promise<{ registry: ToolRegistry; skipped: SkippedTool[] }> {
  await mkdir(toolDir, { recursive: true });
  const store = new ToolStore(toolDir);
  const registry = new ToolRegistry(store);

  const { tools, skipped } = await store.list();
  for (const tool of tools) {
    registry.register(tool, { builtin: false });
  }

  return { registry, skipped };
}
