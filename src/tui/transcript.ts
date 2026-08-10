import type { AgentEvent } from "#/agent";
import type { OutputFormat, ToolInput } from "#/agent/tools/types.ts";

export type TranscriptItem =
  | { kind: "user"; id: number; content: string }
  | { kind: "assistant"; id: number; content: string }
  | {
      kind: "tool_call";
      id: number;
      toolCallId: string;
      name: string;
      input: ToolInput;
      result?: {
        content: string;
        isError: boolean;
        outputFormat?: OutputFormat;
      };
      aborted?: boolean;
    }
  | { kind: "system"; id: number; content: string }
  | { kind: "error"; id: number; content: string };

export function applyAgentEvent(transcript: TranscriptItem[], event: AgentEvent): TranscriptItem[] {
  switch (event.type) {
    case "text": {
      const last = transcript.at(-1);
      if (last?.kind === "assistant") {
        return [
          ...transcript.slice(0, -1),
          {
            ...last,
            content: `${last.content}${event.text}`,
          },
        ];
      }
      return [
        ...transcript,
        {
          kind: "assistant",
          id: transcript.length,
          content: event.text,
        },
      ];
    }

    case "tool_call":
      return [
        ...transcript,
        {
          kind: "tool_call",
          id: transcript.length,
          toolCallId: event.id,
          name: event.name,
          input: event.input,
        },
      ];

    case "tool_result": {
      const callIdx = transcript.findIndex(
        (item) => item.kind === "tool_call" && item.toolCallId === event.toolCallId,
      );
      if (callIdx === -1) {
        return transcript;
      }
      return [
        ...transcript.slice(0, callIdx),
        {
          ...(transcript[callIdx] as Extract<TranscriptItem, { kind: "tool_call" }>),
          result: {
            content: event.content,
            isError: event.isError,
            outputFormat: event.outputFormat,
          },
        },
        ...transcript.slice(callIdx + 1),
      ];
    }
  }
}

export function markAbortedToolCalls(transcript: TranscriptItem[]): TranscriptItem[] {
  return transcript.map((item) =>
    item.kind === "tool_call" && !item.result ? { ...item, aborted: true } : item,
  );
}
