import { mkdtemp, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
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

  async save(input: AddToolInput): Promise<void> {
    // Stage, validate, promote: new code never touches the real tool path until
    // it has proven to load, so a failed save leaves the previous version intact.
    const stageDir = await mkdtemp(join(tmpdir(), "tool-staging-"));
    const source = renderTool(input);

    try {
      const stagePath = join(stageDir, `${input.name}.ts`);
      await Bun.write(stagePath, source);
      await loadTool(stagePath);
    } finally {
      await rm(stageDir, { recursive: true, force: true });
    }

    await Bun.write(this.pathFor(input.name), source);
  }

  async delete(name: string): Promise<void> {
    await rm(this.pathFor(name), { force: true });
  }

  private pathFor(name: string): string {
    return join(this.toolDir, `${name}.ts`);
  }
}

// Dynamic imports are cached by specifier, so a tool re-added at the same path
// would otherwise serve its previous code. A unique query forces a fresh module.
let revision = 0;

async function loadTool(filePath: string): Promise<Tool> {
  const module = (await import(`${filePath}?rev=${revision++}`)) as { tool?: unknown };
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
