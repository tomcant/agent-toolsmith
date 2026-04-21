import type { LlmClient, Message } from "#/llm/client.ts";

export type SpyReply = string | Error;

export class LlmClientSpy {
  readonly client: LlmClient;
  readonly calls: Message[][] = [];

  constructor(replies: SpyReply[] = []) {
    let replyIndex = 0;

    this.client = {
      send: (messages: Message[]) => {
        this.calls.push(messages);

        const next = replies[replyIndex++];
        if (next instanceof Error) return Promise.reject(next);

        return Promise.resolve(next ?? "");
      },
    } as unknown as LlmClient;
  }
}
