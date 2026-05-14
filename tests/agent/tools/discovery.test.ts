import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createToolRegistry } from "#/agent/tools/discovery.ts";

describe("discovering tools", () => {
  let toolsDir: string;

  beforeEach(async () => {
    toolsDir = await mkdtemp(join(tmpdir(), "tools-"));
  });

  afterEach(async () => {
    await rm(toolsDir, { recursive: true, force: true });
  });

  test("registers every valid tool in the directory", async () => {
    await writeTool(toolsDir, "t1");
    await writeTool(toolsDir, "t2");

    const registry = await createToolRegistry(toolsDir);

    expect(
      registry
        .list()
        .map((t) => t.name)
        .sort(),
    ).toEqual(["t1", "t2"]);
  });

  test("a broken tool file does not prevent the others from loading", async () => {
    await writeTool(toolsDir, "tool-name");
    await Bun.write(join(toolsDir, "broken.ts"), `export const tool = {`);

    const registry = await createToolRegistry(toolsDir);

    expect(registry.list().map((t) => t.name)).toEqual(["tool-name"]);
  });

  test("a duplicate tool name is skipped", async () => {
    await writeTool(toolsDir, "tool-name");
    await Bun.write(
      join(toolsDir, "duplicate.ts"),
      `export const tool = {
        name: "tool-name",
        description: "description",
        parameters: { type: "object" },
        execute: async () => "",
      };`,
    );

    const registry = await createToolRegistry(toolsDir);

    expect(registry.list().map((t) => t.name)).toEqual(["tool-name"]);
  });

  test("the registry is empty when the tools directory is empty", async () => {
    const registry = await createToolRegistry(toolsDir);

    expect(registry.list()).toEqual([]);
  });

  test("the registry is empty when the tools directory does not exist", async () => {
    const registry = await createToolRegistry(join(toolsDir, "does-not-exist"));

    expect(registry.list()).toEqual([]);
  });
});

async function writeTool(dir: string, name: string): Promise<void> {
  const source = `export const tool = {
    name: "${name}",
    description: "description",
    parameters: { type: "object" },
    execute: async () => "",
  };`;
  await Bun.write(join(dir, `${name}.ts`), source);
}
