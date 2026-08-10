import type { OutputFormat, ToolInput, ToolMetadata } from "./tools/types.ts";

export type AgentEvent =
  | { type: "text"; text: string }
  | {
      type: "tool_call";
      id: string;
      name: string;
      input: ToolInput;
    }
  | {
      type: "tool_result";
      toolCallId: string;
      content: string;
      isError: boolean;
      outputFormat?: OutputFormat;
    };

export type Message = { role: "user" | "assistant"; content: MessagePart[] };

export type MessagePart =
  | { type: "text"; text: string }
  | { type: "tool_call"; id: string; name: string; input: ToolInput }
  | { type: "tool_result"; toolCallId: string; content: string; isError: boolean };

export interface LlmClient extends Readonly<ModelInfo> {
  send(messages: Message[], tools?: ToolMetadata[], signal?: AbortSignal): AsyncIterable<LlmEvent>;
}

export type ModelInfo = { provider: string; model: string };

export type LlmEvent =
  | { type: "text_delta"; text: string }
  | { type: "tool_call"; id: string; name: string; input: ToolInput }
  | { type: "complete"; response: MessagePart[] };
