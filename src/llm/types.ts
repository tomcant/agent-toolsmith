export type LlmEvent =
  | { type: "delta"; text: string }
  | { type: "complete"; response: MessagePart[] };

export type Message = {
  role: Role;
  content: MessagePart[];
};

export type MessagePart =
  | { type: "text"; text: string }
  | { type: "tool_call"; id: string; name: string; input: unknown }
  | { type: "tool_result"; tool_call_id: string; content: string; is_error: boolean };

export type Role = "user" | "assistant";
