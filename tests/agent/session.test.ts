import { afterEach, beforeEach, describe, expect, setSystemTime, test } from "bun:test";
import { mkdtemp, rm, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { SessionLog } from "#/agent/session/log.ts";
import { createSessionDir } from "#/agent/session/session.ts";
import { readSessionLog } from "../helpers.ts";

describe("directory", () => {
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

  test("two sessions started at the same time get different directories", async () => {
    setSystemTime(new Date("2026-04-22T12:00:00.000Z"));

    const first = await createSessionDir(sessionsRootDir);
    const second = await createSessionDir(sessionsRootDir);

    expect(first).not.toBe(second);
  });
});

describe("log", () => {
  let sessionDir: string;

  beforeEach(async () => {
    sessionDir = await mkdtemp(join(tmpdir(), "session-"));
  });

  afterEach(async () => {
    await rm(sessionDir, { recursive: true, force: true });
    setSystemTime();
  });

  test("messages and errors are persisted as timestamped JSON lines", async () => {
    setSystemTime(new Date("2026-04-22T12:00:00.000Z"));
    const log = new SessionLog(sessionDir);

    await log.write({
      role: "user",
      content: [{ type: "text", text: "hello" }],
    });
    await log.write({
      role: "assistant",
      content: [
        { type: "text", text: "hi" },
        { type: "tool_call", id: "t1", name: "tool-name", input: {} },
      ],
    });
    await log.write({
      role: "user",
      content: [{ type: "tool_result", tool_call_id: "t1", content: "result", is_error: false }],
    });
    await log.write({ kind: "error", message: "error" });

    expect(await readSessionLog(sessionDir)).toEqual([
      {
        time: "2026-04-22T12:00:00.000Z",
        role: "user",
        content: [{ type: "text", text: "hello" }],
      },
      {
        time: "2026-04-22T12:00:00.000Z",
        role: "assistant",
        content: [
          { type: "text", text: "hi" },
          { type: "tool_call", id: "t1", name: "tool-name", input: {} },
        ],
      },
      {
        time: "2026-04-22T12:00:00.000Z",
        role: "user",
        content: [{ type: "tool_result", tool_call_id: "t1", content: "result", is_error: false }],
      },
      { time: "2026-04-22T12:00:00.000Z", kind: "error", message: "error" },
    ]);
  });
});
