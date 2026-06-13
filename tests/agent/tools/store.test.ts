import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { ToolStore } from "#/agent/tools/store.ts";
import { makeAddToolInput, makeToolSource } from "../../helpers.ts";

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
    await Bun.write(join(toolDir, "some-tool.ts"), makeToolSource());
    await Bun.write(join(toolDir, "another-tool.ts"), makeToolSource());

    const tools = await store.list();

    expect(tools.map((t) => t.name).sort()).toEqual(["another-tool", "some-tool"]);
  });

  test("invalid files are not listed", async () => {
    await Bun.write(join(toolDir, "invalid-tool.ts"), "invalid js {");

    const tools = await store.list();

    expect(tools).toEqual([]);
  });

  test("non-typescript files are not listed", async () => {
    await Bun.write(join(toolDir, "readme.md"), "not a tool");

    const tools = await store.list();

    expect(tools).toEqual([]);
  });

  test("tools can be loaded by name", async () => {
    await store.save(makeAddToolInput("tool-name", { code: 'return "x";' }));

    const tool = await store.load("tool-name");

    expect(tool.name).toBe("tool-name");
    expect(await tool.execute({})).toBe("x");
  });

  test("a tool's name comes from its filename", async () => {
    await Bun.write(join(toolDir, "from-filename.ts"), makeToolSource());

    const [listed] = await store.list();
    const loaded = await store.load("from-filename");

    expect(listed?.name).toBe("from-filename");
    expect(loaded.name).toBe("from-filename");
  });

  test("a file whose name is not a valid tool name is skipped", async () => {
    await Bun.write(join(toolDir, "Bad Name.ts"), makeToolSource());

    const tools = await store.list();

    expect(tools).toEqual([]);
  });

  test("unable to load a tool with an unknown name", async () => {
    await expect(store.load("missing")).rejects.toThrow();
  });

  test("tools can be replaced", async () => {
    await store.save(makeAddToolInput("tool-name", { code: 'return "old";' }));
    await store.save(makeAddToolInput("tool-name", { code: 'return "new";' }));

    const tool = await store.load("tool-name");

    expect(await tool.execute({})).toBe("new");
  });

  test("reloading a rewritten tool reflects the latest code", async () => {
    await store.save(makeAddToolInput("tool-name", { code: 'return "old";' }));
    const before = await store.load("tool-name");

    await store.save(makeAddToolInput("tool-name", { code: 'return "new";' }));
    const after = await store.load("tool-name");

    expect(await before.execute({})).toBe("old");
    expect(await after.execute({})).toBe("new");
  });

  test("a failed save leaves no file", async () => {
    const brokenToolInput = makeAddToolInput("tool-name", { code: "invalid js {" });
    await expect(store.save(brokenToolInput)).rejects.toThrow();

    expect(await store.list()).toEqual([]);
    expect(await Bun.file(join(toolDir, "tool-name.ts")).exists()).toBe(false);
  });

  test("a failed save leaves an existing tool intact", async () => {
    await store.save(makeAddToolInput("tool-name", { code: 'return "good";' }));

    const brokenToolInput = makeAddToolInput("tool-name", { code: "invalid js {" });
    await expect(store.save(brokenToolInput)).rejects.toThrow();

    const tool = await store.load("tool-name");
    expect(await tool.execute({})).toBe("good");
  });

  test("tools can be deleted", async () => {
    await store.save(makeAddToolInput("tool-name"));

    await store.delete("tool-name");

    expect(await store.list()).toEqual([]);
  });

  test("deleting a missing tool is a no-op", async () => {
    await expect(store.delete("missing")).resolves.toBeUndefined();
  });
});
