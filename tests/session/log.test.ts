import { afterEach, beforeEach, describe, expect, setSystemTime, test } from "bun:test";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { SessionLog } from "#/session/log.ts";

describe("session log", () => {
  let sessionDir: string;

  beforeEach(async () => {
    sessionDir = await mkdtemp(join(tmpdir(), "session-"));
  });

  afterEach(async () => {
    await rm(sessionDir, { recursive: true, force: true });
    setSystemTime();
  });

  test("writes are persisted as timestamped JSON lines", async () => {
    setSystemTime(new Date("2026-04-22T12:00:00.000Z"));
    const log = new SessionLog(sessionDir);

    await log.write({ kind: "user", text: "hello" });
    await log.write({ kind: "assistant", text: "hi" });
    await log.write({
      kind: "tool_call",
      id: "t1",
      name: "tool-name",
      input: {},
    });
    await log.write({
      kind: "tool_result",
      tool_call_id: "t1",
      content: "result",
      is_error: false,
    });
    await log.write({ kind: "error", message: "error" });

    const contents = await Bun.file(join(sessionDir, "session.jsonl")).text();
    const lines = contents
      .trim()
      .split("\n")
      .map((l) => JSON.parse(l));
    expect(lines).toEqual([
      { time: "2026-04-22T12:00:00.000Z", kind: "user", text: "hello" },
      { time: "2026-04-22T12:00:00.000Z", kind: "assistant", text: "hi" },
      {
        time: "2026-04-22T12:00:00.000Z",
        kind: "tool_call",
        id: "t1",
        name: "tool-name",
        input: {},
      },
      {
        time: "2026-04-22T12:00:00.000Z",
        kind: "tool_result",
        tool_call_id: "t1",
        content: "result",
        is_error: false,
      },
      { time: "2026-04-22T12:00:00.000Z", kind: "error", message: "error" },
    ]);
  });
});
