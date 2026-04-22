import type Anthropic from "@anthropic-ai/sdk";

export type CreateArgs = {
  model: string;
  max_tokens: number;
  messages: Anthropic.MessageParam[];
  tools?: Anthropic.Tool[];
};

export type SpyReply = string | Error | { content: ContentBlock[]; stop_reason: string };

type ContentBlock = { type: string; [key: string]: unknown };

export class AnthropicSpy {
  readonly sdk: Anthropic;
  readonly calls: CreateArgs[] = [];

  constructor(replies: SpyReply[] = []) {
    let replyIndex = 0;

    this.sdk = {
      messages: {
        create: (body: CreateArgs) => {
          this.calls.push(body);

          const next = replies[replyIndex++];

          if (next instanceof Error) {
            return Promise.reject(next);
          }

          if (typeof next === "string") {
            return Promise.resolve({
              content: [{ type: "text", text: next }],
              stop_reason: "end_turn",
            });
          }

          return Promise.resolve({
            content: next?.content ?? [],
            stop_reason: next?.stop_reason ?? "end_turn",
          });
        },
      },
    } as unknown as Anthropic;
  }
}
