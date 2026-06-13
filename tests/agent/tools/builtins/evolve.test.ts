import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { evolve } from "#/agent/tools/builtins/evolve.ts";
import { ToolRegistry } from "#/agent/tools/registry.ts";
import { ToolStore } from "#/agent/tools/store.ts";
import { makeAddToolInput } from "../../../helpers.ts";

describe("builtin evolve tool", () => {
  let toolDir: string;
  let toolRegistry: ToolRegistry;

  beforeEach(async () => {
    toolDir = await mkdtemp(join(tmpdir(), "tools-"));
    toolRegistry = new ToolRegistry(new ToolStore(toolDir));
  });

  afterEach(async () => {
    await rm(toolDir, { recursive: true, force: true });
  });

  test("a successful call returns a confirmation message", async () => {
    const tool = evolve(toolRegistry);

    const result = await tool.execute(makeAddToolInput("tool-name"));

    expect(result).toBe("Evolved tool 'tool-name'");
  });

  test("evolving an existing tool replaces its code", async () => {
    const tool = evolve(toolRegistry);
    await tool.execute(makeAddToolInput("tool-name", { code: 'return "v1";' }));

    await tool.execute(makeAddToolInput("tool-name", { code: 'return "v2";' }));

    expect(await toolRegistry.get("tool-name")?.execute({})).toBe("v2");
  });

  test("an error from the registry is surfaced with an 'Error:' prefix", async () => {
    const tool = evolve(toolRegistry);

    const result = await tool.execute(makeAddToolInput("tool-name", { code: "" }));

    expect(result.startsWith("Error: ")).toBe(true);
  });
});
