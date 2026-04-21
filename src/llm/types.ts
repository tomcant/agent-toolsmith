export type Role = "user" | "assistant";

export type Message = { role: Role; content: MessagePart[] };

export type MessagePart = { type: "text"; text: string };
