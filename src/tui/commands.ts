import type { ToolMetadata } from "#/agent/tools/types.ts";

export type Command =
  | { kind: "tools_list" }
  | { kind: "tools_remove"; name: string }
  | { kind: "clear" }
  | { kind: "exit" };

export type ToolListRow = { name: string; description: string };

export function parseCommand(input: string): Command | null {
  const trimmed = input.trim();
  if (!trimmed.startsWith("/")) {
    return null;
  }

  const [head, ...tail] = trimmed.slice(1).split(/\s+/);

  if (head === "exit" || head === "quit") {
    return { kind: "exit" };
  }

  if (head === "clear") {
    return { kind: "clear" };
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

export function toolListRows(tools: ToolMetadata[]): ToolListRow[] {
  const labelWidth = Math.max(0, ...tools.map((t) => t.name.length));

  return [...tools]
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((tool) => ({ name: tool.name.padEnd(labelWidth), description: tool.description }));
}
