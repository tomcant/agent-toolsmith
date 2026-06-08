import { afterEach, beforeEach, describe, expect, setSystemTime, test } from "bun:test";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { SessionLog } from "#/agent/session/log.ts";
import { createSessionPath } from "#/agent/session/session.ts";
import { readSessionLog } from "../helpers.ts";

describe("file", () => {
  let sessionDir: string;

  beforeEach(async () => {
    sessionDir = await mkdtemp(join(tmpdir(), "sessions-"));
  });

  afterEach(async () => {
    await rm(sessionDir, { recursive: true, force: true });
    setSystemTime();
  });

  test("each session gets a .jsonl file named by its start time", async () => {
    setSystemTime(new Date("2026-04-22T12:00:00.000Z"));

    const path = await createSessionPath(sessionDir);

    expect(path.startsWith(join(sessionDir, "2026-04-22T12-00-00-000Z-"))).toBe(true);
    expect(path.endsWith(".jsonl")).toBe(true);
  });

  test("two sessions started at the same time get different files", async () => {
    setSystemTime(new Date("2026-04-22T12:00:00.000Z"));

    const first = await createSessionPath(sessionDir);
    const second = await createSessionPath(sessionDir);

    expect(first).not.toBe(second);
  });
});

describe("log", () => {
  let sessionDir: string;
  let sessionPath: string;

  beforeEach(async () => {
    sessionDir = await mkdtemp(join(tmpdir(), "sessions-"));
    sessionPath = join(sessionDir, "session.jsonl");
  });

  afterEach(async () => {
    await rm(sessionDir, { recursive: true, force: true });
    setSystemTime();
  });

  test("messages and errors are persisted as timestamped JSON lines", async () => {
    setSystemTime(new Date("2026-04-22T12:00:00.000Z"));
    const log = new SessionLog(sessionPath);

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

    expect(await readSessionLog(sessionPath)).toEqual([
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
