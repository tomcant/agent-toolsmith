import type { ToolMetadata } from "#/agent/tools/types.ts";
import type { LlmClient, LlmEvent, Message } from "#/agent/types.ts";

type SpyCall = {
  messages: Message[];
  tools?: ToolMetadata[];
  signal?: AbortSignal;
};
type SpyReply = LlmEvent[] | Error;

export class LlmClientSpy implements LlmClient {
  readonly provider = "spy";
  readonly model = "spy-model";
  readonly calls: SpyCall[] = [];
  private replyIndex = 0;

  constructor(private readonly replies: SpyReply[] = []) {}

  async *send(
    messages: Message[],
    tools?: ToolMetadata[],
    signal?: AbortSignal,
  ): AsyncGenerator<LlmEvent> {
    this.calls.push({ messages: structuredClone(messages), tools, signal });

    const reply = this.replies[this.replyIndex++];
    if (reply instanceof Error) throw reply;

    for (const event of reply as LlmEvent[]) {
      if (signal?.aborted) {
        throw new Error("Request was aborted");
      }
      yield event;
    }
  }
}
