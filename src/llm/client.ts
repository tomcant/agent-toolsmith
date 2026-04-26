import type Anthropic from "@anthropic-ai/sdk";
import type { Tool } from "#/tools/types.ts";
import type { LlmResponse, Message, MessagePart } from "./types.ts";

export class LlmClient {
  constructor(
    private readonly sdk: Anthropic,
    private readonly model: string,
    private readonly systemPrompt?: string,
  ) {}

  async send(messages: Message[], tools?: Tool[]): Promise<LlmResponse> {
    const response = await this.sdk.messages.create({
      model: this.model,
      max_tokens: 8192,
      messages,
      ...(this.systemPrompt ? { system: this.systemPrompt } : {}),
      ...(tools && tools.length > 0
        ? { tools: tools.map(({ execute, ...sdkTool }) => sdkTool) }
        : {}),
    });

    const content = response.content.flatMap((block): MessagePart[] => {
      if (block.type === "text") {
        return [{ type: "text", text: block.text }];
      }
      if (block.type === "tool_use") {
        return [{ type: "tool_use", id: block.id, name: block.name, input: block.input }];
      }
      return [];
    });

    return {
      message: { role: "assistant", content },
      stop_reason: response.stop_reason ?? "end_turn",
    };
  }
}
