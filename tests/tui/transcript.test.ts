import { describe, expect, test } from "bun:test";
import { markAbortedToolCalls, type TranscriptItem } from "#/tui/transcript.ts";

describe("marking aborted tool calls", () => {
  test("only the tool calls without a result are marked aborted", () => {
    const result = { content: "done", is_error: false };
    const transcript: TranscriptItem[] = [
      { kind: "tool_call", id: 0, tool_call_id: "t1", name: "tool-name", input: {}, result },
      { kind: "tool_call", id: 1, tool_call_id: "t2", name: "tool-name", input: {}, result },
      { kind: "tool_call", id: 2, tool_call_id: "t3", name: "tool-name", input: {} },
    ];

    expect(markAbortedToolCalls(transcript)).toEqual([
      { kind: "tool_call", id: 0, tool_call_id: "t1", name: "tool-name", input: {}, result },
      { kind: "tool_call", id: 1, tool_call_id: "t2", name: "tool-name", input: {}, result },
      { kind: "tool_call", id: 2, tool_call_id: "t3", name: "tool-name", input: {}, aborted: true },
    ]);
  });

  test("non-tool-call items are left untouched", () => {
    const transcript: TranscriptItem[] = [
      { kind: "user", id: 0, content: "hello" },
      { kind: "assistant", id: 1, content: "hi" },
    ];

    expect(markAbortedToolCalls(transcript)).toEqual(transcript);
  });
});
