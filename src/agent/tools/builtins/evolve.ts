import type { ToolRegistry } from "../registry.ts";
import type { AddToolInput } from "../store.ts";
import type { Tool } from "../types.ts";

export function evolve(toolRegistry: ToolRegistry): Tool {
  return {
    name: "evolve",
    description: "Add a tool for use in this and future sessions.",
    inputSchema: {
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
        inputSchema: {
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
      required: ["name", "description", "inputSchema", "code"],
    },
    execute: async (input) => {
      try {
        await toolRegistry.add(input as AddToolInput);
        return `Added tool '${input.name}'`;
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        return `Error: ${message}`;
      }
    },
  };
}
