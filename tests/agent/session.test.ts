import { afterEach, beforeEach, describe, expect, setSystemTime, test } from "bun:test";
import { mkdtemp, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createSession, Session } from "#/agent/session.ts";
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

    const session = await createSession(sessionDir);
    await session.log({ kind: "error", message: "x" });

    const files = await readdir(sessionDir);
    expect(files).toHaveLength(1);
    expect(files[0]).toStartWith("2026-04-22T12-00-00-000Z-");
    expect(files[0]).toEndWith(".jsonl");
  });

  test("two sessions started at the same time get different files", async () => {
    setSystemTime(new Date("2026-04-22T12:00:00.000Z"));

    const first = await createSession(sessionDir);
    const second = await createSession(sessionDir);
    await first.log({ kind: "error", message: "x" });
    await second.log({ kind: "error", message: "x" });

    expect(await readdir(sessionDir)).toHaveLength(2);
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
    const session = new Session(sessionPath);

    await session.log({
      role: "user",
      content: [{ type: "text", text: "hello" }],
    });
    await session.log({
      role: "assistant",
      content: [
        { type: "text", text: "hi" },
        { type: "tool_call", id: "t1", name: "tool-name", input: {} },
      ],
    });
    await session.log({
      role: "user",
      content: [{ type: "tool_result", tool_call_id: "t1", content: "result", is_error: false }],
    });
    await session.log({ kind: "error", message: "error" });

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
