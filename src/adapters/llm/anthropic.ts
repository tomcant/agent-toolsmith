import Anthropic from "@anthropic-ai/sdk";
import type { ToolInput, ToolMetadata } from "#/agent/tools/types.ts";
import type { LlmClient, LlmEvent, Message, MessagePart } from "#/agent/types.ts";
import type { LlmAdapter } from "./types.ts";

export const anthropicAdapter: LlmAdapter = {
  matchesApiKey: (apiKey) => apiKey.startsWith("sk-ant-"),

  fromApiKey(apiKey, systemPrompt, model) {
    return new AnthropicLlmClient(
      new Anthropic({ apiKey }),
      model ?? "claude-sonnet-4-6",
      systemPrompt,
    );
  },

  tryFromEnv(env, systemPrompt) {
    const apiKey = env.ANTHROPIC_API_KEY;
    if (!apiKey) return null;

    // A custom base URL means a proxy or gateway, whose keys use their own format.
    if (!env.ANTHROPIC_BASE_URL && !this.matchesApiKey(apiKey)) {
      return null;
    }

    return this.fromApiKey(apiKey, systemPrompt, env.MODEL);
  },
};

export class AnthropicLlmClient implements LlmClient {
  readonly provider = "anthropic";

  constructor(
    private readonly sdk: Anthropic,
    readonly model: string,
    private readonly systemPrompt?: string,
  ) {}

  async *send(
    messages: Message[],
    tools?: ToolMetadata[],
    signal?: AbortSignal,
  ): AsyncGenerator<LlmEvent> {
    const stream = this.sdk.messages.stream(
      {
        model: this.model,
        max_tokens: 8192,
        messages: messages.map(toSdkMessage),
        ...(tools && tools.length > 0 ? { tools: tools.map(toSdkTool) } : {}),
        ...(this.systemPrompt ? { system: this.systemPrompt } : {}),
      },
      { signal },
    );

    const toolBlocks = new Map<number, { id: string; name: string; json: string }>();

    for await (const event of stream) {
      switch (event.type) {
        case "content_block_start":
          if (event.content_block.type === "tool_use") {
            toolBlocks.set(event.index, {
              id: event.content_block.id,
              name: event.content_block.name,
              json: "",
            });
          }
          break;

        case "content_block_delta":
          if (event.delta.type === "text_delta") {
            yield {
              type: "text_delta",
              text: event.delta.text,
            };
            break;
          }
          if (event.delta.type === "input_json_delta") {
            const block = toolBlocks.get(event.index);
            if (block) block.json += event.delta.partial_json;
          }
          break;

        case "content_block_stop": {
          const block = toolBlocks.get(event.index);
          if (block) {
            yield {
              type: "tool_call",
              id: block.id,
              name: block.name,
              input: block.json ? JSON.parse(block.json) : {},
            };
            toolBlocks.delete(event.index);
          }
          break;
        }
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
        tool_use_id: part.toolCallId,
        content: part.content,
        is_error: part.isError,
      };
    }),
  };
}

function toSdkTool(tool: ToolMetadata): Anthropic.Tool {
  return {
    name: tool.name,
    description: tool.description,
    input_schema: tool.inputSchema,
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
          input: block.input as ToolInput,
        },
      ];
    }
    return [];
  });
}
