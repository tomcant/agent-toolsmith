import type { Tool } from "#/agent/tools/types.ts";
import type { LlmClient, LlmEvent, Message } from "#/agent/types.ts";

type SpyCall = { messages: Message[]; tools?: Tool[] };
type SpyReply = LlmEvent[] | Error;

export class LlmClientSpy implements LlmClient {
  readonly calls: SpyCall[] = [];
  private replyIndex = 0;

  constructor(private readonly replies: SpyReply[] = []) {}

  async *send(messages: Message[], tools?: Tool[]): AsyncGenerator<LlmEvent> {
    this.calls.push({ messages: structuredClone(messages), tools });

    const reply = this.replies[this.replyIndex++];
    if (reply instanceof Error) throw reply;

    for (const event of reply as LlmEvent[]) {
      yield event;
    }
  }
}
