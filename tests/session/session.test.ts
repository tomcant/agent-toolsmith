import { afterEach, beforeEach, describe, expect, setSystemTime, test } from "bun:test";
import { mkdtemp, rm, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createSessionDir } from "#/session/session.ts";

describe("session directory", () => {
  let sessionsRootDir: string;

  beforeEach(async () => {
    sessionsRootDir = await mkdtemp(join(tmpdir(), "sessions-root-"));
  });

  afterEach(async () => {
    await rm(sessionsRootDir, { recursive: true, force: true });
    setSystemTime();
  });

  test("each session gets a directory named by its start time", async () => {
    setSystemTime(new Date("2026-04-22T12:00:00.000Z"));

    const path = await createSessionDir(sessionsRootDir);

    expect(path.startsWith(join(sessionsRootDir, "2026-04-22T12-00-00-000Z-"))).toBe(true);
    expect((await stat(path)).isDirectory()).toBe(true);
  });

  test("two sessions at the same time get different directories", async () => {
    setSystemTime(new Date("2026-04-22T12:00:00.000Z"));

    const first = await createSessionDir(sessionsRootDir);
    const second = await createSessionDir(sessionsRootDir);

    expect(first).not.toBe(second);
  });
});
