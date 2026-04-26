import type { Tool } from "#/tools/types.ts";

export function makeTool(name: string, overrides: Partial<Tool> = {}): Tool {
  return {
    name,
    description: "description",
    input_schema: { type: "object" },
    execute: async () => name,
    ...overrides,
  };
}
