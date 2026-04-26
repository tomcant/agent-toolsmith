import { rm } from "node:fs/promises";
import { join } from "node:path";
import { loadTool } from "../loader.ts";
import type { ToolRegistry } from "../registry.ts";
import type { Tool, ToolMetadata } from "../types.ts";
import { validateMetadata } from "../validate.ts";

const TEMPLATE_PATH = join(import.meta.dir, "..", "tool.ts.tpl");

export function addTool(toolsDir: string, toolRegistry: ToolRegistry): Tool {
  return {
    name: "add-tool",
    description: "Add a tool for use in this and future sessions.",
    input_schema: {
      type: "object",
      properties: {
        name: {
          type: "string",
          description:
            "Tool name (lowercase alphanumeric and hyphens, max 64 chars, e.g. 'read-file').",
        },
        description: {
          type: "string",
          description:
            "Human-readable summary shown to the model when deciding whether to call the tool.",
        },
        input_schema: {
          type: "object",
          description:
            "JSON Schema describing the tool's input. Must be an object schema (type: 'object').",
        },
        code: {
          type: "string",
          description:
            "The async function body (TypeScript). Receives `input` as the only parameter. Must return a string.",
        },
      },
      required: ["name", "description", "input_schema", "code"],
    },
    execute: async (input) => {
      try {
        validateMetadata(input);
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        return `Error: ${message}`;
      }

      const { code } = input as { code?: unknown };
      if (typeof code !== "string" || code.length === 0) {
        return "Error: code must be a non-empty string";
      }

      const path = join(toolsDir, `${input.name}.ts`);
      await Bun.write(path, await renderTool(input, code));

      try {
        const tool = await loadTool(path);
        toolRegistry.register(tool);
      } catch (err) {
        await rm(path, { force: true });
        const message = err instanceof Error ? err.message : String(err);
        return `Error: ${message}`;
      }

      return `Added tool '${input.name}'`;
    },
  };
}

async function renderTool(metadata: ToolMetadata, code: string): Promise<string> {
  return (await Bun.file(TEMPLATE_PATH).text())
    .replace("__NAME__", JSON.stringify(metadata.name))
    .replace("__DESCRIPTION__", JSON.stringify(metadata.description))
    .replace("__SCHEMA__", JSON.stringify(metadata.input_schema))
    .replace("__CODE__", code);
}
