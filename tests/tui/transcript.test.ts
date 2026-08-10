import { describe, expect, test } from "bun:test";
import { applyAgentEvent, markAbortedToolCalls, type TranscriptItem } from "#/tui/transcript.ts";

describe("recording tool results", () => {
  const call: TranscriptItem = {
    kind: "tool_call",
    id: 0,
    toolCallId: "t1",
    name: "tool-name",
    input: {},
  };

  test("a result is attached to its matching call", () => {
    const transcript = applyAgentEvent([call], {
      type: "tool_result",
      toolCallId: "t1",
      content: "output",
      isError: false,
    });

    expect(transcript).toEqual([{ ...call, result: { content: "output", isError: false } }]);
  });

  test("a result carries the render format through to the call", () => {
    const transcript = applyAgentEvent([call], {
      type: "tool_result",
      toolCallId: "t1",
      content: "| a | b |",
      isError: false,
      outputFormat: "markdown",
    });

    expect(transcript).toEqual([
      { ...call, result: { content: "| a | b |", isError: false, outputFormat: "markdown" } },
    ]);
  });

  test("a result for an unknown call is ignored", () => {
    const transcript = applyAgentEvent([call], {
      type: "tool_result",
      toolCallId: "unknown",
      content: "output",
      isError: false,
    });

    expect(transcript).toEqual([call]);
  });
});

describe("marking aborted tool calls", () => {
  test("only the tool calls without a result are marked aborted", () => {
    const result = { content: "done", isError: false };
    const transcript: TranscriptItem[] = [
      { kind: "tool_call", id: 0, toolCallId: "t1", name: "tool-name", input: {}, result },
      { kind: "tool_call", id: 1, toolCallId: "t2", name: "tool-name", input: {}, result },
      { kind: "tool_call", id: 2, toolCallId: "t3", name: "tool-name", input: {} },
    ];

    expect(markAbortedToolCalls(transcript)).toEqual([
      { kind: "tool_call", id: 0, toolCallId: "t1", name: "tool-name", input: {}, result },
      { kind: "tool_call", id: 1, toolCallId: "t2", name: "tool-name", input: {}, result },
      { kind: "tool_call", id: 2, toolCallId: "t3", name: "tool-name", input: {}, aborted: true },
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
