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
    execute: async (input) => {
      const { name } = input as { name: string };
      try {
        return render(name, await toolRegistry.source(name));
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        return `Error: ${message}`;
      }
    },
  };
}

function render(name: string, source: string): string {
  const lineCount = source.trimEnd().split("\n").length;

  return [
    `Source of '${name}' (${lineCount} lines)`,
    "",
    "This is the generated tool module. `evolve`'s `code` parameter is only the body",
    "of `execute` — send that back when replacing this tool, not the whole module.",
    "",
    source,
  ].join("\n");
}
