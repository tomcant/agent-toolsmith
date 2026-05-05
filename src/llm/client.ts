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
      messages: messages.map(toSdkMessage),
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

    yield {
      type: "complete",
      response: fromSdkMessageContent((await stream.finalMessage()).content),
    };
  }
}

function toSdkMessage(message: Message): Anthropic.MessageParam {
  return {
    role: message.role,
    content: message.content.map((part) => {
      if (part.type === "text") {
        return {
          type: "text",
          text: part.text,
        };
      }
      if (part.type === "tool_call") {
        return {
          type: "tool_use",
          id: part.id,
          name: part.name,
          input: part.input,
        };
      }
      return {
        type: "tool_result",
        tool_use_id: part.tool_call_id,
        content: part.content,
        is_error: part.is_error,
      };
    }),
  };
}

function fromSdkMessageContent(content: Anthropic.ContentBlock[]): MessagePart[] {
  return content.flatMap((block): MessagePart[] => {
    if (block.type === "text") {
      return [
        {
          type: "text",
          text: block.text,
        },
      ];
    }
    if (block.type === "tool_use") {
      return [
        {
          type: "tool_call",
          id: block.id,
          name: block.name,
          input: block.input,
        },
      ];
    }
    return [];
  });
}
