import type { ToolMetadata } from "#/agent/tools/types.ts";
import { truncate } from "./utils.ts";

export type Command =
  | { kind: "tools_list" }
  | { kind: "tools_remove"; name: string }
  | { kind: "exit" };

export function parseCommand(input: string): Command | null {
  const trimmed = input.trim();
  if (!trimmed.startsWith("/")) {
    return null;
  }

  const [head, ...tail] = trimmed.slice(1).split(/\s+/);

  if (head === "exit" || head === "quit") {
    return { kind: "exit" };
  }

  if (head === "tools") {
    const [sub, ...args] = tail;
    if (sub === undefined) {
      return { kind: "tools_list" };
    }
    if (sub === "remove" && args.length === 1 && args[0]) {
      return { kind: "tools_remove", name: args[0] };
    }
    throw new Error("Usage: /tools | /tools remove <name>");
  }

  throw new Error(`Unknown command: /${head}`);
}

export function formatToolList(tools: ToolMetadata[], width: number): string {
  if (tools.length === 0) {
    return "No tools available.";
  }

  const labelWidth = Math.max(...tools.map((t) => t.name.length));

  return [...tools]
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((tool) => truncate(`${tool.name.padEnd(labelWidth)}  ${tool.description}`, width))
    .join("\n");
}
