import type { Tool } from "#/agent/tools/types.ts";

export function makeTool(name: string, overrides: Partial<Tool> = {}): Tool {
  return {
    name,
    description: "description",
    inputSchema: { type: "object" },
    execute: async () => name,
    ...overrides,
  };
}

export async function collect<T>(iterable: AsyncIterable<T>): Promise<T[]> {
  const items: T[] = [];
  for await (const item of iterable) items.push(item);
  return items;
}
