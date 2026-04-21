import type { LlmClient } from "#/llm/client.ts";
import type { Message } from "#/llm/types.ts";

export class Agent {
  private conversation: Message[] = [];

  constructor(private readonly client: LlmClient) {}

  async turn(input: string): Promise<string> {
    const next: Message[] = [
      ...this.conversation,
      { role: "user", content: [{ type: "text", text: input }] },
    ];
    const response = await this.client.send(next);
    this.conversation = [...next, response];

    return response.content
      .filter((block) => block.type === "text")
      .map((block) => block.text)
      .join("");
  }
}
