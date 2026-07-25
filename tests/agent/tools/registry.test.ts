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

  test("builtin status reflects how a tool was registered", () => {
    registry.register(makeTool("evolved-tool"));
    registry.register(makeTool("builtin-tool"), { builtin: true });

    expect(registry.isBuiltin("evolved-tool")).toBe(false);
    expect(registry.isBuiltin("builtin-tool")).toBe(true);
    expect(registry.isBuiltin("missing")).toBe(false);
  });

  test("registering a builtin replaces an existing tool of the same name", async () => {
    registry.register(makeTool("tool-name", { description: "from disk" }));
    registry.register(makeTool("tool-name", { description: "from builtin" }), { builtin: true });

    expect(registry.get("tool-name")?.description).toBe("from builtin");
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
    expect((await store.load("tool-name")).name).toBe("tool-name");
  });

  test("adding a tool with invalid metadata is rejected", async () => {
    await expect(registry.add(makeAddToolInput("bad name"))).rejects.toThrow();
  });

  test("adding a tool with empty code is rejected", async () => {
    await expect(registry.add(makeAddToolInput("tool-name", { code: "" }))).rejects.toThrow();
  });

  test("adding a tool whose code fails to load registers nothing", async () => {
    const brokenToolInput = makeAddToolInput("tool-name", { code: "invalid js {" });
    await expect(registry.add(brokenToolInput)).rejects.toThrow();

    expect(registry.get("tool-name")).toBeUndefined();
  });

  test("adding over an already added tool replaces it", async () => {
    await registry.add(
      makeAddToolInput("tool-name", { description: "old description", code: 'return "old";' }),
    );

    await registry.add(
      makeAddToolInput("tool-name", { description: "new description", code: 'return "new";' }),
    );

    expect(await registry.get("tool-name")?.execute({})).toBe("new");
    expect(registry.get("tool-name")?.description).toBe("new description");
    expect(await (await store.load("tool-name")).execute({})).toBe("new");
  });

  test("adding over an already registered tool replaces it", async () => {
    registry.register(makeTool("tool-name"));

    await registry.add(makeAddToolInput("tool-name", { code: 'return "new";' }));

    expect(await registry.get("tool-name")?.execute({})).toBe("new");
  });

  test("adding over a builtin tool is rejected", async () => {
    registry.register(makeTool("tool-name"), { builtin: true });

    await expect(registry.add(makeAddToolInput("tool-name"))).rejects.toThrow("builtin");
  });

  test("a failed add preserves the previous tool", async () => {
    await registry.add(makeAddToolInput("tool-name", { code: 'return "good";' }));

    const brokenToolInput = makeAddToolInput("tool-name", { code: "invalid js {" });
    await expect(registry.add(brokenToolInput)).rejects.toThrow();

    expect(await registry.get("tool-name")?.execute({})).toBe("good");
  });

  test("an added tool's source can be read", async () => {
    await registry.add(makeAddToolInput("tool-name", { code: 'return "x";' }));

    const source = await registry.source("tool-name");

    expect(source).toContain('return "x";');
  });

  test("reading the source of an unknown tool is rejected", async () => {
    await expect(registry.source("missing")).rejects.toThrow("Unknown tool: missing");
  });

  test("reading the source of a builtin tool is rejected", async () => {
    registry.register(makeTool("tool-name"), { builtin: true });

    await expect(registry.source("tool-name")).rejects.toThrow("builtin");
  });

  test("tools can be removed", async () => {
    await registry.add(makeAddToolInput("tool-name"));

    await registry.remove("tool-name");

    expect(registry.get("tool-name")).toBeUndefined();
    await expect(store.load("tool-name")).rejects.toThrow();
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
