import type Anthropic from "@anthropic-ai/sdk";
import type { LlmResponse, Message, MessagePart } from "./types.ts";

export class LlmClient {
  constructor(
    private readonly sdk: Anthropic,
    private readonly model: string,
  ) {}

  async send(messages: Message[], tools?: Anthropic.Tool[]): Promise<LlmResponse> {
    const response = await this.sdk.messages.create({
      model: this.model,
      max_tokens: 8192,
      messages,
      ...(tools && tools.length > 0 ? { tools } : {}),
    });

    const content = response.content.flatMap((block): MessagePart[] => {
      if (block.type === "text") {
        return [{ type: "text", text: block.text }];
      }
      if (block.type === "tool_use") {
        return [{ type: "tool_use", id: block.id, name: block.name, input: block.input }];
      }
      return [];
    });

    return {
      message: { role: "assistant", content },
      stop_reason: response.stop_reason ?? "end_turn",
    };
  }
}
