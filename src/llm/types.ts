export type LlmResponse = {
  message: Message;
  stop_reason: string;
};

export type Message = {
  role: Role;
  content: MessagePart[];
};

export type MessagePart =
  | { type: "text"; text: string }
  | { type: "tool_use"; id: string; name: string; input: unknown }
  | { type: "tool_result"; tool_use_id: string; content: string };

export type Role = "user" | "assistant";
