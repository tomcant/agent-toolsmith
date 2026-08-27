import OpenAI from "openai";
import type { ToolInput, ToolMetadata } from "#/agent/tools/types.ts";
import type { LlmClient, LlmEvent, Message, MessagePart } from "#/agent/types.ts";
import type { LlmAdapter } from "./types.ts";

export const openaiAdapter: LlmAdapter = {
  matchesApiKey: (apiKey) => apiKey.startsWith("sk-") && !apiKey.startsWith("sk-ant-"),

  fromApiKey(apiKey, systemPrompt, model) {
    return new OpenAiLlmClient(new OpenAI({ apiKey }), model ?? "gpt-5-mini", systemPrompt);
  },

  tryFromEnv(env, systemPrompt) {
    const apiKey = env.OPENAI_API_KEY;
    if (!apiKey) return null;

    // A custom base URL means a proxy or gateway, whose keys use their own format.
    if (!env.OPENAI_BASE_URL && !this.matchesApiKey(apiKey)) {
      return null;
    }

    return this.fromApiKey(apiKey, systemPrompt, env.MODEL);
  },
};

export class OpenAiLlmClient implements LlmClient {
  readonly provider = "openai";

  constructor(
    private readonly sdk: OpenAI,
    readonly model: string,
    private readonly systemPrompt?: string,
  ) {}

  async *send(
    messages: Message[],
    tools?: ToolMetadata[],
    signal?: AbortSignal,
  ): AsyncGenerator<LlmEvent> {
    const stream = await this.sdk.responses.create(
      {
        model: this.model,
        stream: true,
        input: messages.flatMap(toSdkInputItems),
        ...(tools && tools.length > 0 ? { tools: tools.map(toSdkTool) } : {}),
        ...(this.systemPrompt ? { instructions: this.systemPrompt } : {}),
      },
      { signal },
    );

    const toolCalls = new Map<number, { callId: string; name: string; args: string }>();
    let response: MessagePart[] | undefined;

    for await (const event of stream) {
      switch (event.type) {
        case "response.output_text.delta":
          yield {
            type: "text_delta",
            text: event.delta,
          };
          break;

        case "response.output_item.added":
          if (event.item.type === "function_call") {
            toolCalls.set(event.output_index, {
              callId: event.item.call_id,
              name: event.item.name,
              args: "",
            });
          }
          break;

        case "response.function_call_arguments.delta": {
          const call = toolCalls.get(event.output_index);
          if (call) call.args += event.delta;
          break;
        }

        case "response.output_item.done": {
          const call = toolCalls.get(event.output_index);
          if (call) {
            const args = event.item.type === "function_call" ? event.item.arguments : call.args;
            yield {
              type: "tool_call",
              id: call.callId,
              name: call.name,
              input: args ? JSON.parse(args) : {},
            };
            toolCalls.delete(event.output_index);
          }
          break;
        }

        case "response.completed":
          response = fromSdkOutput(event.response.output);
          break;

        case "response.failed":
          throw new Error(event.response.error?.message ?? "OpenAI response failed");

        case "response.incomplete":
          throw new Error(
            event.response.incomplete_details?.reason ?? "OpenAI response was incomplete",
          );
      }
    }

    if (response) {
      yield {
        type: "complete",
        response,
      };
    }
  }
}

function toSdkInputItems(message: Message): OpenAI.Responses.ResponseInputItem[] {
  return message.content.map((part): OpenAI.Responses.ResponseInputItem => {
    if (part.type === "text") {
      return {
        role: message.role,
        content: part.text,
      };
    }
    if (part.type === "tool_call") {
      return {
        type: "function_call",
        call_id: part.id,
        name: part.name,
        arguments: JSON.stringify(part.input),
      };
    }
    return {
      type: "function_call_output",
      call_id: part.toolCallId,
      output: part.content,
    };
  });
}

function toSdkTool(tool: ToolMetadata): OpenAI.Responses.FunctionTool {
  return {
    type: "function",
    name: tool.name,
    description: tool.description,
    parameters: tool.inputSchema,
    strict: false,
  };
}

function fromSdkOutput(output: OpenAI.Responses.ResponseOutputItem[]): MessagePart[] {
  return output.flatMap((item): MessagePart[] => {
    if (item.type === "message") {
      return item.content.flatMap((part): MessagePart[] =>
        part.type === "output_text" ? [{ type: "text", text: part.text }] : [],
      );
    }
    if (item.type === "function_call") {
      return [
        {
          type: "tool_call",
          id: item.call_id,
          name: item.name,
          input: (item.arguments ? JSON.parse(item.arguments) : {}) as ToolInput,
        },
      ];
    }
    return [];
  });
}
