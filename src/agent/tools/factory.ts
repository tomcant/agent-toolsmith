import { mkdir } from "node:fs/promises";
import { ToolRegistry } from "./registry.ts";
import { ToolStore } from "./store.ts";

export async function createToolRegistry(toolDir: string): Promise<ToolRegistry> {
  await mkdir(toolDir, { recursive: true });
  const store = new ToolStore(toolDir);
  const registry = new ToolRegistry(store);

  for (const tool of await store.list()) {
    registry.register(tool, { builtin: false });
  }

  return registry;
}
