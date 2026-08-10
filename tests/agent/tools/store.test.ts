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

    const { tools } = await store.list();

    expect(tools.map((t) => t.name).sort()).toEqual(["another-tool", "some-tool"]);
  });

  test("invalid files are not listed but are reported as skipped", async () => {
    await Bun.write(join(toolDir, "invalid-tool.ts"), "invalid js {");

    const { tools, skipped } = await store.list();

    expect(tools).toEqual([]);
    expect(skipped.map((s) => s.file)).toEqual(["invalid-tool.ts"]);
    expect(skipped[0]?.reason).not.toBe("");
  });

  test("non-typescript files are not listed or reported", async () => {
    await Bun.write(join(toolDir, "readme.md"), "not a tool");

    const { tools, skipped } = await store.list();

    expect(tools).toEqual([]);
    expect(skipped).toEqual([]);
  });

  test("tools can be loaded by name", async () => {
    await store.save(makeAddToolInput("tool-name", { code: 'return "x";' }));

    const tool = await store.load("tool-name");

    expect(tool.name).toBe("tool-name");
    expect(await tool.execute({})).toBe("x");
  });

  test("tool code containing $ replacement patterns is preserved", async () => {
    await store.save(makeAddToolInput("dollar-tool", { code: 'return "a$&b$`c$$d$1e";' }));

    const tool = await store.load("dollar-tool");

    expect(await tool.execute({})).toBe("a$&b$`c$$d$1e");
  });

  test("a description containing a placeholder does not hijack another slot", async () => {
    await store.save(
      makeAddToolInput("placeholder-desc", {
        description: "__CODE__",
        code: 'return "x";',
      }),
    );

    const tool = await store.load("placeholder-desc");

    expect(tool.description).toBe("__CODE__");
    expect(await tool.execute({})).toBe("x");
  });

  test("a tool remembers that it produces markdown across a save and reload", async () => {
    await store.save(makeAddToolInput("markdown-tool", { outputFormat: "markdown" }));

    const tool = await store.load("markdown-tool");

    expect(tool.outputFormat).toBe("markdown");
  });

  test("a tool's name comes from its filename", async () => {
    await Bun.write(join(toolDir, "from-filename.ts"), makeToolSource());

    const {
      tools: [listed],
    } = await store.list();
    const loaded = await store.load("from-filename");

    expect(listed?.name).toBe("from-filename");
    expect(loaded.name).toBe("from-filename");
  });

  test("a file whose name is not a valid tool name is skipped", async () => {
    await Bun.write(join(toolDir, "Bad Name.ts"), makeToolSource());

    const { tools, skipped } = await store.list();

    expect(tools).toEqual([]);
    expect(skipped.map((s) => s.file)).toEqual(["Bad Name.ts"]);
    expect(skipped[0]?.reason).not.toBe("");
  });

  test("unable to load a tool with an unknown name", async () => {
    await expect(store.load("missing")).rejects.toThrow();
  });

  test("a saved tool's source can be read back", async () => {
    await store.save(makeAddToolInput("tool-name", { code: 'return "x";' }));

    const source = await store.read("tool-name");

    expect(source).toContain('return "x";');
    expect(source).toContain("export const tool");
  });

  test("unable to read the source of a tool with an unknown name", async () => {
    await expect(store.read("missing")).rejects.toThrow();
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

    expect((await store.list()).tools).toEqual([]);
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

    expect((await store.list()).tools).toEqual([]);
  });

  test("deleting a missing tool is a no-op", async () => {
    await expect(store.delete("missing")).resolves.toBeUndefined();
  });
});
