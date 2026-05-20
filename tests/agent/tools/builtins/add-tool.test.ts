import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { addTool } from "#/agent/tools/builtins/add-tool.ts";
import { ToolRegistry } from "#/agent/tools/registry.ts";
import { ToolStore } from "#/agent/tools/store.ts";

describe("builtin add-tool", () => {
  let toolDir: string;
  let toolRegistry: ToolRegistry;

  beforeEach(async () => {
    toolDir = await mkdtemp(join(tmpdir(), "tools-"));
    toolRegistry = new ToolRegistry(new ToolStore(toolDir));
  });

  afterEach(async () => {
    await rm(toolDir, { recursive: true, force: true });
  });

  test("a successful add returns a confirmation message", async () => {
    const tool = addTool(toolRegistry);

    const result = await tool.execute({
      name: "tool-name",
      description: "description",
      inputSchema: { type: "object" },
      code: `return "";`,
    });

    expect(result).toBe("Added tool 'tool-name'");
  });

  test("an error from the registry is surfaced with an 'Error:' prefix", async () => {
    const tool = addTool(toolRegistry);

    const result = await tool.execute({
      name: "tool-name",
      description: "description",
      inputSchema: { type: "object" },
      code: "",
    });

    expect(result.startsWith("Error: ")).toBe(true);
  });
});
