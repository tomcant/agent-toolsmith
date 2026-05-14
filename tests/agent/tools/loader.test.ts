import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { loadTool } from "#/agent/tools/loader.ts";

describe("loading a tool from a file", () => {
  let toolsDir: string;

  beforeEach(async () => {
    toolsDir = await mkdtemp(join(tmpdir(), "tools-"));
  });

  afterEach(async () => {
    await rm(toolsDir, { recursive: true, force: true });
  });

  test("loads a tool from a file", async () => {
    const path = join(toolsDir, "tool-name.ts");
    await Bun.write(
      path,
      `export const tool = {
        name: "tool-name",
        description: "description",
        parameters: { type: "object" },
        execute: async () => "",
      };`,
    );

    const loaded = await loadTool(path);

    expect(loaded.name).toBe("tool-name");
  });

  test("rejects a syntactically invalid file", async () => {
    const path = join(toolsDir, "broken.ts");
    await Bun.write(path, `export const tool = {`);

    await expect(loadTool(path)).rejects.toThrow();
  });

  test("rejects a file with no tool export", async () => {
    const path = join(toolsDir, "no-export.ts");
    await Bun.write(path, `export const notTool = {};`);

    await expect(loadTool(path)).rejects.toThrow("object");
  });

  test("rejects a tool with a malformed name", async () => {
    const path = join(toolsDir, "malformed.ts");
    await Bun.write(
      path,
      `export const tool = {
        name: "has space",
        description: "description",
        parameters: { type: "object" },
        execute: async () => "",
      };`,
    );

    await expect(loadTool(path)).rejects.toThrow("name");
  });
});
