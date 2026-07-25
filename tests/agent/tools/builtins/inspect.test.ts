import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { inspect } from "#/agent/tools/builtins/inspect.ts";
import { ToolRegistry } from "#/agent/tools/registry.ts";
import { ToolStore } from "#/agent/tools/store.ts";
import { makeAddToolInput, makeTool } from "../../../helpers.ts";

describe("builtin inspect tool", () => {
  let toolDir: string;
  let toolRegistry: ToolRegistry;

  beforeEach(async () => {
    toolDir = await mkdtemp(join(tmpdir(), "tools-"));
    toolRegistry = new ToolRegistry(new ToolStore(toolDir));
  });

  afterEach(async () => {
    await rm(toolDir, { recursive: true, force: true });
  });

  test("an evolved tool's code is returned", async () => {
    const tool = inspect(toolRegistry);
    await toolRegistry.add(makeAddToolInput("tool-name", { code: 'return "x";' }));

    const result = await tool.execute({ name: "tool-name" });

    expect(result).toContain('return "x";');
  });

  test("the result begins with a summary", async () => {
    const tool = inspect(toolRegistry);
    await toolRegistry.add(makeAddToolInput("tool-name"));

    const result = await tool.execute({ name: "tool-name" });

    expect(result.split("\n")[0]).toMatch(/^Source of 'tool-name' \(\d+ lines\)$/);
  });

  test("the latest code is returned after a tool is evolved again", async () => {
    const tool = inspect(toolRegistry);
    await toolRegistry.add(makeAddToolInput("tool-name", { code: 'return "old";' }));
    await toolRegistry.add(makeAddToolInput("tool-name", { code: 'return "new";' }));

    const result = await tool.execute({ name: "tool-name" });

    expect(result).toContain('return "new";');
    expect(result).not.toContain('return "old";');
  });

  test("an unknown tool is reported with an 'Error:' prefix", async () => {
    const tool = inspect(toolRegistry);

    const result = await tool.execute({ name: "missing" });

    expect(result.startsWith("Error: ")).toBe(true);
    expect(result).toContain("missing");
  });

  test("a builtin tool is reported with an 'Error:' prefix", async () => {
    const tool = inspect(toolRegistry);
    toolRegistry.register(makeTool("builtin-tool"), { builtin: true });

    const result = await tool.execute({ name: "builtin-tool" });

    expect(result.startsWith("Error: ")).toBe(true);
    expect(result).toContain("builtin");
  });
});
