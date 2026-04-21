import { describe, expect, test } from "bun:test";
import { ToolRegistry } from "#/tools/registry.ts";
import type { Tool } from "#/tools/types.ts";

function makeTool(name: string): Tool {
  return {
    name,
    description: `${name} tool`,
    input_schema: { type: "object" },
    execute: async () => name,
  };
}

describe("ToolRegistry", () => {
  test("registered tools can be retrieved by name", () => {
    const registry = new ToolRegistry();
    const someTool = makeTool("some-tool");

    registry.register(someTool);

    expect(registry.get("some-tool")).toBe(someTool);
  });

  test("list returns every registered tool", () => {
    const registry = new ToolRegistry();
    const someTool = makeTool("some-tool");
    const anotherTool = makeTool("another-tool");

    registry.register(someTool);
    registry.register(anotherTool);

    expect(registry.list()).toEqual([someTool, anotherTool]);
  });

  test("looking up an unregistered tool returns nothing", () => {
    const registry = new ToolRegistry();

    const result = registry.get("missing");

    expect(result).toBeUndefined();
  });
});
