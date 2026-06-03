import { readdir, rm } from "node:fs/promises";
import { basename, join } from "node:path";
import { isObject } from "#/utils.ts";
import template from "./builtins/tool.ts.tpl" with { type: "text" };
import type { Tool, ToolMetadata } from "./types.ts";
import { validateTool } from "./validate.ts";

export type AddToolInput = ToolMetadata & { code: string };

export class ToolStore {
  constructor(private readonly toolDir: string) {}

  async list(): Promise<Tool[]> {
    const tools = [];
    const entries = await readdir(this.toolDir);

    for (const entry of entries) {
      if (!entry.endsWith(".ts")) {
        continue;
      }
      try {
        tools.push(await loadTool(join(this.toolDir, entry)));
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        console.warn(`Skipping ${entry}: ${message}`);
      }
    }

    return tools;
  }

  async load(name: string): Promise<Tool> {
    return loadTool(this.pathFor(name));
  }

  async write(input: AddToolInput): Promise<void> {
    await Bun.write(this.pathFor(input.name), renderTool(input));
  }

  async delete(name: string): Promise<void> {
    await rm(this.pathFor(name), { force: true });
  }

  private pathFor(name: string): string {
    return join(this.toolDir, `${name}.ts`);
  }
}

async function loadTool(filePath: string): Promise<Tool> {
  const module = (await import(filePath)) as { tool?: unknown };
  const tool = isObject(module.tool)
    ? { ...module.tool, name: basename(filePath, ".ts") }
    : module.tool;
  validateTool(tool);
  return tool;
}

function renderTool(input: AddToolInput): string {
  return template
    .replace("__DESCRIPTION__", JSON.stringify(input.description))
    .replace("__SCHEMA__", JSON.stringify(input.inputSchema))
    .replace("__CODE__", input.code);
}
