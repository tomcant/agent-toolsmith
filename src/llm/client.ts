import type Anthropic from "@anthropic-ai/sdk";

export type Message = { role: "user" | "assistant"; content: string };

export class LlmClient {
  constructor(
    private readonly sdk: Anthropic,
    private readonly model: string,
  ) {}

  async send(messages: Message[]): Promise<string> {
    const response = await this.sdk.messages.create({
      model: this.model,
      max_tokens: 8192,
      messages,
    });

    return response.content
      .filter((block) => block.type === "text")
      .map((block) => block.text)
      .join("");
  }
}
