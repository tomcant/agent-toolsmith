import type Anthropic from "@anthropic-ai/sdk";
import type { Tool } from "#/tools/types.ts";
import type { LlmEvent, Message, MessagePart } from "./types.ts";

export class LlmClient {
  constructor(
    private readonly sdk: Anthropic,
    private readonly model: string,
    private readonly systemPrompt?: string,
  ) {}

  async *send(messages: Message[], tools?: Tool[]): AsyncGenerator<LlmEvent> {
    const stream = this.sdk.messages.stream({
      model: this.model,
      max_tokens: 8192,
      messages,
      ...(this.systemPrompt ? { system: this.systemPrompt } : {}),
      ...(tools && tools.length > 0
        ? { tools: tools.map(({ execute, ...sdkTool }) => sdkTool) }
        : {}),
    });

    for await (const event of stream) {
      if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
        yield { type: "delta", text: event.delta.text };
      }
    }

    const response = await stream.finalMessage();

    const content = response.content.flatMap((block): MessagePart[] => {
      switch (block.type) {
        case "text":
          return [
            {
              type: "text",
              text: block.text,
            },
          ];
        case "tool_use":
          return [
            {
              type: "tool_use",
              id: block.id,
              name: block.name,
              input: block.input,
            },
          ];
        default:
          return [];
      }
    });

    yield {
      type: "complete",
      response: {
        message: { role: "assistant", content },
        stop_reason: response.stop_reason ?? "end_turn",
      },
    };
  }
}
