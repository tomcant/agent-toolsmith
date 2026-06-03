import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { ToolStore } from "#/agent/tools/store.ts";
import { makeAddToolInput } from "../../helpers.ts";

describe("tool storage", () => {
  let toolDir: string;
  let store: ToolStore;

  beforeEach(async () => {
    toolDir = await mkdtemp(join(tmpdir(), "tools-"));
    store = new ToolStore(toolDir);
  });

  afterEach(async () => {
    await rm(toolDir, { recursive: true, force: true });
  });

  test("tools can be listed", async () => {
    await store.write(makeAddToolInput("some-tool"));
    await store.write(makeAddToolInput("another-tool"));

    const tools = await store.list();

    expect(tools.map((t) => t.name).sort()).toEqual(["another-tool", "some-tool"]);
  });

  test("invalid files are not listed", async () => {
    await store.write(makeAddToolInput("invalid-tool", { code: "invalid js {" }));

    const tools = await store.list();

    expect(tools).toEqual([]);
  });

  test("non-typescript files are not listed", async () => {
    await store.write(makeAddToolInput("tool-name"));
    await Bun.write(join(toolDir, "readme.md"), "not a tool");

    const tools = await store.list();

    expect(tools.map((t) => t.name)).toEqual(["tool-name"]);
  });

  test("tools can be loaded by name", async () => {
    await store.write(makeAddToolInput("tool-name", { code: 'return "x";' }));

    const tool = await store.load("tool-name");

    expect(tool.name).toBe("tool-name");
    expect(await tool.execute({})).toBe("x");
  });

  test("a tool's name comes from its filename", async () => {
    await Bun.write(
      join(toolDir, "from-filename.ts"),
      'export const tool = { description: "d", inputSchema: { type: "object" }, execute: async () => "x" };',
    );

    const [listed] = await store.list();
    const loaded = await store.load("from-filename");

    expect(listed?.name).toBe("from-filename");
    expect(loaded.name).toBe("from-filename");
  });

  test("a file whose name is not a valid tool name is skipped", async () => {
    await Bun.write(
      join(toolDir, "Bad Name.ts"),
      'export const tool = { description: "d", inputSchema: { type: "object" }, execute: async () => "x" };',
    );

    const tools = await store.list();

    expect(tools).toEqual([]);
  });

  test("unable to load a tool with an unknown name", async () => {
    await expect(store.load("missing")).rejects.toThrow();
  });

  test("tools can be replaced", async () => {
    await store.write(makeAddToolInput("tool-name", { code: 'return "old";' }));
    await store.write(makeAddToolInput("tool-name", { code: 'return "new";' }));

    const tool = await store.load("tool-name");

    expect(await tool.execute({})).toBe("new");
  });

  test("tools can be deleted", async () => {
    await store.write(makeAddToolInput("tool-name"));

    await store.delete("tool-name");

    expect(await store.list()).toEqual([]);
  });

  test("deleting a missing tool is a no-op", async () => {
    await expect(store.delete("missing")).resolves.toBeUndefined();
  });
});
