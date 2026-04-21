import type { LlmClient, Message } from "#/llm/client.ts";

export class Agent {
  private conversation: Message[] = [];

  constructor(private readonly client: LlmClient) {}

  async turn(input: string): Promise<string> {
    const next: Message[] = [...this.conversation, { role: "user", content: input }];
    const reply = await this.client.send(next);
    this.conversation = [...next, { role: "assistant", content: reply }];
    return reply;
  }
}
