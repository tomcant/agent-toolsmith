import { afterEach, beforeEach, describe, expect, setSystemTime, test } from "bun:test";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { SessionLog } from "#/agent/session/log.ts";

describe("session log", () => {
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

    const contents = await Bun.file(join(sessionDir, "session.jsonl")).text();
    const lines = contents
      .trim()
      .split("\n")
      .map((l) => JSON.parse(l));
    expect(lines).toEqual([
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
