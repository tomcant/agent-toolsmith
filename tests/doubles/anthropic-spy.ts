import type Anthropic from "@anthropic-ai/sdk";

export type CreateArgs = {
  model: string;
  max_tokens: number;
  messages: Anthropic.MessageParam[];
};

type ContentBlock = { type: string; [key: string]: unknown };
export type SpyReply = string | ContentBlock[] | Error;

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
          if (next instanceof Error) return Promise.reject(next);

          return Promise.resolve({
            content: typeof next === "string" ? [{ type: "text", text: next }] : (next ?? []),
            stop_reason: "end_turn",
          });
        },
      },
    } as unknown as Anthropic;
  }
}
