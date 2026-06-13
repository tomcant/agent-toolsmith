import type { AddToolInput } from "#/agent/tools/store.ts";
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

export function makeToolSource(): string {
  return 'export const tool = { description: "d", inputSchema: { type: "object" }, execute: async () => "x" };';
}

export function makeAddToolInput(
  name: string,
  overrides: Partial<AddToolInput> = {},
): AddToolInput {
  return {
    name,
    description: "description",
    inputSchema: { type: "object" },
    code: 'return "";',
    ...overrides,
  };
}

export async function readSessionLog(sessionPath: string): Promise<unknown[]> {
  const contents = await Bun.file(sessionPath).text();
  return contents
    .trim()
    .split("\n")
    .map((l) => JSON.parse(l));
}

export async function collect<T>(iterable: AsyncIterable<T>): Promise<T[]> {
  const items: T[] = [];
  for await (const item of iterable) items.push(item);
  return items;
}
