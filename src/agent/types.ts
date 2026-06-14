import type { ToolInput, ToolMetadata } from "./tools/types.ts";

export type AgentEvent =
  | { type: "text"; text: string }
  | { type: "tool_call"; id: string; name: string; input: ToolInput }
  | { type: "tool_result"; tool_call_id: string; content: string; is_error: boolean };

export type Message = {
  role: "user" | "assistant";
  content: MessagePart[];
};

export type MessagePart =
  | { type: "text"; text: string }
  | { type: "tool_call"; id: string; name: string; input: ToolInput }
  | { type: "tool_result"; tool_call_id: string; content: string; is_error: boolean };

export type LlmEvent =
  | { type: "text_delta"; text: string }
  | { type: "tool_call"; id: string; name: string; input: ToolInput }
  | { type: "complete"; response: MessagePart[] };

export interface LlmClient {
  send(messages: Message[], tools?: ToolMetadata[], signal?: AbortSignal): AsyncIterable<LlmEvent>;
}
