import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { ToolRegistry } from "#/agent/tools/registry.ts";
import { ToolStore } from "#/agent/tools/store.ts";
import { makeAddToolInput, makeTool } from "../../helpers.ts";

describe("tool registration and lifecycle", () => {
  let toolDir: string;
  let store: ToolStore;
  let registry: ToolRegistry;

  beforeEach(async () => {
    toolDir = await mkdtemp(join(tmpdir(), "tools-"));
    store = new ToolStore(toolDir);
    registry = new ToolRegistry(store);
  });

  afterEach(async () => {
    await rm(toolDir, { recursive: true, force: true });
  });

  test("tools can be listed", () => {
    const someTool = makeTool("some-tool");
    const anotherTool = makeTool("another-tool");

    registry.register(someTool);
    registry.register(anotherTool);

    expect(registry.list()).toEqual([someTool, anotherTool]);
  });

  test("tools can be retrieved by name", () => {
    const tool = makeTool("tool-name");

    registry.register(tool);

    expect(registry.get("tool-name")).toBe(tool);
  });

  test("retrieving an unknown tool returns nothing", () => {
    const result = registry.get("missing");

    expect(result).toBeUndefined();
  });

  test("registering a builtin replaces an existing tool of the same name", async () => {
    registry.register(makeTool("tool-name", { description: "from disk" }));
    registry.register(makeTool("tool-name", { description: "from builtin" }), { builtin: true });

    expect(registry.get("tool-name")?.description).toBe("from builtin");
    await expect(registry.remove("tool-name")).rejects.toThrow("builtin");
  });

  test("registering a duplicate name is rejected", () => {
    registry.register(makeTool("tool-name"));

    expect(() => registry.register(makeTool("tool-name"))).toThrow("already registered");
  });

  test("builtin tools cannot be overwritten", () => {
    registry.register(makeTool("tool-name"), { builtin: true });

    expect(() => registry.register(makeTool("tool-name"), { builtin: true })).toThrow("builtin");
    expect(() => registry.register(makeTool("tool-name"))).toThrow("builtin");
  });

  test("tools can be added", async () => {
    await registry.add(makeAddToolInput("tool-name"));

    expect(registry.get("tool-name")?.name).toBe("tool-name");
    expect((await new ToolStore(toolDir).load("tool-name")).name).toBe("tool-name");
  });

  test("adding a tool with invalid metadata is rejected", async () => {
    await expect(registry.add(makeAddToolInput("bad name"))).rejects.toThrow();

    expect(await Bun.file(join(toolDir, "bad name.ts")).exists()).toBe(false);
  });

  test("adding a tool with empty code is rejected", async () => {
    await expect(registry.add(makeAddToolInput("tool-name", { code: "" }))).rejects.toThrow();

    expect(await Bun.file(join(toolDir, "tool-name.ts")).exists()).toBe(false);
  });

  test("adding a tool whose code fails to load is rolled back", async () => {
    await expect(
      registry.add(makeAddToolInput("tool-name", { code: "this is not valid typescript {" })),
    ).rejects.toThrow();

    expect(await Bun.file(join(toolDir, "tool-name.ts")).exists()).toBe(false);
  });

  test("adding a duplicate name is rejected", async () => {
    const existing = makeTool("tool-name");
    registry.register(existing);

    await expect(registry.add(makeAddToolInput("tool-name"))).rejects.toThrow("already registered");

    expect(registry.get("tool-name")).toBe(existing);
    expect(await Bun.file(join(toolDir, "tool-name.ts")).exists()).toBe(false);
  });

  test("tools can be removed", async () => {
    await registry.add(makeAddToolInput("tool-name"));

    await registry.remove("tool-name");

    expect(registry.get("tool-name")).toBeUndefined();
    expect(await Bun.file(join(toolDir, "tool-name.ts")).exists()).toBe(false);
  });

  test("removing an unknown tool is rejected", async () => {
    await expect(registry.remove("missing")).rejects.toThrow("Unknown tool: missing");
  });

  test("builtin tools cannot be removed", async () => {
    registry.register(makeTool("tool-name"), { builtin: true });

    await expect(registry.remove("tool-name")).rejects.toThrow("builtin");
    expect(registry.get("tool-name")?.name).toBe("tool-name");
  });
});
