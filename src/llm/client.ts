import type Anthropic from "@anthropic-ai/sdk";
import type { Message } from "./types.ts";

export class LlmClient {
  constructor(
    private readonly sdk: Anthropic,
    private readonly model: string,
  ) {}

  async send(messages: Message[]): Promise<Message> {
    const response = await this.sdk.messages.create({
      model: this.model,
      max_tokens: 8192,
      messages,
    });

    return {
      role: "assistant",
      content: response.content.flatMap((block) =>
        block.type === "text" ? [{ type: "text" as const, text: block.text }] : [],
      ),
    };
  }
}
