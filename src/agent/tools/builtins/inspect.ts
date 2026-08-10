import type { ToolRegistry } from "../registry.ts";
import type { Tool } from "../types.ts";

export function inspect(toolRegistry: ToolRegistry): Tool {
  return {
    name: "inspect",
    description: "Read the source of a tool. Useful when evolving and/or debugging.",
    inputSchema: {
      type: "object",
      properties: {
        name: {
          type: "string",
          description: "Name of the tool to read.",
        },
      },
      required: ["name"],
    },
    outputFormat: "text",
    execute: async (input) => {
      const { name } = input as { name: string };
      try {
        return await toolRegistry.source(name);
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        return `Error: ${message}`;
      }
    },
  };
}
