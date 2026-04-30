import type Anthropic from "@anthropic-ai/sdk";

type StreamArgs = {
  model: string;
  max_tokens: number;
  messages: Anthropic.MessageParam[];
  tools?: Anthropic.Tool[];
  system?: string;
};

type SpyReply = string | Error | { content: ContentBlock[]; stop_reason: string };

type ContentBlock = { type: string; text?: string | string[]; [key: string]: unknown };

export class AnthropicSpy {
  readonly sdk: Anthropic;
  readonly calls: StreamArgs[] = [];

  constructor(replies: SpyReply[] = []) {
    let replyIndex = 0;

    this.sdk = {
      messages: {
        stream: (body: StreamArgs) => {
          this.calls.push({ ...body, messages: [...body.messages] });

          const reply = replies[replyIndex++];

          if (reply instanceof Error) {
            return {
              // biome-ignore lint/correctness/useYield: error path throws before yielding
              async *[Symbol.asyncIterator]() {
                throw reply;
              },
              async finalMessage() {
                throw reply;
              },
            };
          }

          let content: ContentBlock[] = [];
          let stop_reason = "end_turn";

          if (typeof reply === "string") {
            content = [{ type: "text", text: reply }];
          } else if (reply) {
            ({ content, stop_reason } = reply);
          }

          const blocks = content.map((block) => {
            if (block.type !== "text") return { block, deltas: [] };
            const deltas = Array.isArray(block.text) ? block.text : [block.text];
            return { block: { ...block, text: deltas.join("") }, deltas };
          });

          return {
            async *[Symbol.asyncIterator]() {
              for (const { deltas } of blocks) {
                for (const text of deltas) {
                  yield {
                    type: "content_block_delta",
                    delta: { type: "text_delta", text },
                  };
                }
              }
            },
            async finalMessage() {
              return {
                content: blocks.map((b) => b.block),
                stop_reason,
              };
            },
          };
        },
      },
    } as unknown as Anthropic;
  }
}
