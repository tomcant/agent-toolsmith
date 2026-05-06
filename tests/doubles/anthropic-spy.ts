import type Anthropic from "@anthropic-ai/sdk";

type StreamArgs = {
  model: string;
  max_tokens: number;
  messages: Anthropic.MessageParam[];
  tools?: Anthropic.Tool[];
  system?: string;
};

type SpyReply = string | Error | { content: ContentBlock[]; stop_reason: string };

type ContentBlock =
  | { type: "text"; text: string | string[] }
  | { type: "tool_use"; id: string; name: string; input?: unknown }
  | { type: "thinking"; thinking: string };

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
              for (const [index, { block, deltas }] of blocks.entries()) {
                if (block.type === "text") {
                  for (const text of deltas) {
                    yield {
                      type: "content_block_delta",
                      delta: { type: "text_delta", text },
                      index,
                    };
                  }
                } else if (block.type === "tool_use") {
                  yield {
                    type: "content_block_start",
                    content_block: {
                      type: "tool_use",
                      id: block.id,
                      name: block.name,
                      input: {},
                    },
                    index,
                  };
                  yield {
                    type: "content_block_delta",
                    delta: {
                      type: "input_json_delta",
                      partial_json: JSON.stringify(block.input ?? {}),
                    },
                    index,
                  };
                  yield { type: "content_block_stop", index };
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
