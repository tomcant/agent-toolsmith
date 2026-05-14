import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { mkdtemp, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { addTool } from "#/agent/tools/builtins/add-tool.ts";
import { ToolRegistry } from "#/agent/tools/registry.ts";
import { makeTool } from "../../../helpers.ts";

describe("builtin add-tool", () => {
  let toolsDir: string;
  let toolRegistry: ToolRegistry;

  beforeEach(async () => {
    toolsDir = await mkdtemp(join(tmpdir(), "tools-"));
    toolRegistry = new ToolRegistry();
  });

  afterEach(async () => {
    await rm(toolsDir, { recursive: true, force: true });
  });

  test("adds a tool to the registry", async () => {
    const tool = addTool(toolsDir, toolRegistry);

    const result = await tool.execute({
      name: "tool-name",
      description: "description",
      parameters: { type: "object" },
      code: `return "";`,
    });

    expect(result).toBe("Added tool 'tool-name'");
    expect(toolRegistry.get("tool-name")?.name).toBe("tool-name");
    expect(await readdir(toolsDir)).toEqual(["tool-name.ts"]);
  });

  test("a name that is already registered is rejected", async () => {
    const existing = makeTool("existing");
    toolRegistry.register(existing);
    const tool = addTool(toolsDir, toolRegistry);

    const result = await tool.execute({
      name: "existing",
      description: "description",
      parameters: { type: "object" },
      code: `return "";`,
    });

    expect(result.toLowerCase()).toContain("already registered");
    expect(toolRegistry.get("existing")).toBe(existing);
    expect(await readdir(toolsDir)).toEqual([]);
  });

  test("a name that violates the allowed pattern is rejected", async () => {
    const tool = addTool(toolsDir, toolRegistry);

    const result = await tool.execute({
      name: "has space",
      description: "description",
      parameters: { type: "object" },
      code: `return "";`,
    });

    expect(result.toLowerCase()).toContain("name");
    expect(toolRegistry.get("has space")).toBeUndefined();
    expect(await readdir(toolsDir)).toEqual([]);
  });

  test("an empty code string is rejected", async () => {
    const tool = addTool(toolsDir, toolRegistry);

    const result = await tool.execute({
      name: "tool-name",
      description: "description",
      parameters: { type: "object" },
      code: "",
    });

    expect(result.toLowerCase()).toContain("code");
    expect(toolRegistry.get("tool-name")).toBeUndefined();
    expect(await readdir(toolsDir)).toEqual([]);
  });

  test("a tool that cannot be loaded is rejected", async () => {
    const tool = addTool(toolsDir, toolRegistry);

    const result = await tool.execute({
      name: "broken",
      description: "description",
      parameters: { type: "object" },
      code: `this is not valid typescript {`,
    });

    expect(result.toLowerCase()).toContain("error");
    expect(toolRegistry.get("broken")).toBeUndefined();
    expect(await readdir(toolsDir)).toEqual([]);
  });
});
