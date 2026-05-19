import type { AgentEvent } from "#/agent";
import type { ToolInput } from "#/agent/tools/types.ts";

export type TranscriptItem =
  | { kind: "user"; id: number; content: string }
  | { kind: "assistant"; id: number; content: string }
  | {
      kind: "tool_call";
      id: number;
      tool_call_id: string;
      name: string;
      input: ToolInput;
      result?: {
        content: string;
        is_error: boolean;
      };
    }
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
          tool_call_id: event.id,
          name: event.name,
          input: event.input,
        },
      ];

    case "tool_result": {
      const callIdx = transcript.findIndex(
        (item) => item.kind === "tool_call" && item.tool_call_id === event.tool_call_id,
      );
      if (callIdx === -1) {
        return transcript;
      }
      return [
        ...transcript.slice(0, callIdx),
        {
          ...(transcript[callIdx] as Extract<TranscriptItem, { kind: "tool_call" }>),
          result: { content: event.content, is_error: event.is_error },
        },
        ...transcript.slice(callIdx + 1),
      ];
    }
  }
}
