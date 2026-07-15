import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createToolRegistry } from "#/agent/tools/factory.ts";
import { makeToolSource } from "../../helpers.ts";

describe("tool registry creation", () => {
  let toolDir: string;

  beforeEach(async () => {
    toolDir = await mkdtemp(join(tmpdir(), "tools-"));
  });

  afterEach(async () => {
    await rm(toolDir, { recursive: true, force: true });
  });

  test("a registry created from a tools directory is seeded with the tools on disk", async () => {
    await Bun.write(join(toolDir, "t1.ts"), makeToolSource());
    await Bun.write(join(toolDir, "t2.ts"), makeToolSource());

    const { registry } = await createToolRegistry(toolDir);

    expect(
      registry
        .list()
        .map((t) => t.name)
        .sort(),
    ).toEqual(["t1", "t2"]);
  });

  test("tools that fail to load are propagated as skipped", async () => {
    await Bun.write(join(toolDir, "good.ts"), makeToolSource());
    await Bun.write(join(toolDir, "broken.ts"), "invalid js {");

    const { registry, skipped } = await createToolRegistry(toolDir);

    expect(registry.list().map((t) => t.name)).toEqual(["good"]);
    expect(skipped.map((s) => s.file)).toEqual(["broken.ts"]);
    expect(skipped[0]?.reason).not.toBe("");
  });
});
