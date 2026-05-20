import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createToolRegistry } from "#/agent/tools/factory.ts";
import { ToolStore } from "#/agent/tools/store.ts";
import { makeAddToolInput } from "../../helpers.ts";

describe("tool registry creation", () => {
  let toolDir: string;

  beforeEach(async () => {
    toolDir = await mkdtemp(join(tmpdir(), "tools-"));
  });

  afterEach(async () => {
    await rm(toolDir, { recursive: true, force: true });
  });

  test("a registry created from a tools directory is seeded with the tools on disk", async () => {
    const store = new ToolStore(toolDir);
    await store.write(makeAddToolInput("t1"));
    await store.write(makeAddToolInput("t2"));

    const registry = await createToolRegistry(toolDir);

    expect(
      registry
        .list()
        .map((t) => t.name)
        .sort(),
    ).toEqual(["t1", "t2"]);
  });
});
