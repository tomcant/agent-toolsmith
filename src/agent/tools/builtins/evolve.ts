import type { ToolRegistry } from "../registry.ts";
import type { AddToolInput } from "../store.ts";
import { OUTPUT_FORMATS, type Tool } from "../types.ts";

export function evolve(toolRegistry: ToolRegistry): Tool {
  return {
    name: "evolve",
    description: "Add or update a tool for use in this and future sessions.",
    inputSchema: {
      type: "object",
      properties: {
        name: {
          type: "string",
          description:
            "Tool name (lowercase alphanumeric and hyphens, max 64 chars, e.g. 'read-file'). Use the name of an existing tool to replace it.",
        },
        description: {
          type: "string",
          description:
            "Human-readable summary shown to the model when deciding whether to call the tool.",
        },
        inputSchema: {
          type: "object",
          description:
            "JSON Schema describing the tool's input. Must be an object schema (type: 'object').",
        },
        outputFormat: {
          type: "string",
          enum: OUTPUT_FORMATS,
          description:
            "How the output should be rendered. Use 'markdown' when the output is prose, a table, or a list meant for a person to read. Defaults to 'text' — use that for code, logs, file contents, or anything whose exact bytes matter, as markdown rendering would mangle it.",
        },
        code: {
          type: "string",
          description:
            "The async function body (TypeScript). Receives `input` as the only parameter. Must return a string.",
        },
      },
      required: ["name", "description", "inputSchema", "code"],
    },
    outputFormat: "text",
    execute: async (input) => {
      try {
        await toolRegistry.add({ outputFormat: "text", ...input } as AddToolInput);
        return `Evolved tool '${input.name}'`;
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        return `Error: ${message}`;
      }
    },
  };
}
