import type { Session } from "./session.ts";
import type { ToolRegistry } from "./tools/registry.ts";
import type { ToolMetadata } from "./tools/types.ts";
import type { AgentEvent, LlmClient, Message, MessagePart, ModelInfo } from "./types.ts";

type ToolResult = { content: string; is_error: boolean };

export class Agent {
  private messages: Message[] = [];

  constructor(
    private readonly client: LlmClient,
    private readonly registry: ToolRegistry,
    private readonly session: Session,
    private readonly notices: string[] = [],
  ) {}

  modelInfo(): ModelInfo {
    return { provider: this.client.provider, model: this.client.model };
  }

  startupNotices(): string[] {
    return this.notices;
  }

  listTools(): ToolMetadata[] {
    return this.toolMetadata().filter((tool) => !this.registry.isBuiltin(tool.name));
  }

  async removeTool(name: string): Promise<void> {
    await this.registry.remove(name);
  }

  async clear(): Promise<void> {
    this.messages = [];
    await this.session.log({ kind: "cleared" });
  }

  async *turn(input: string, signal?: AbortSignal): AsyncGenerator<AgentEvent> {
    const userMessage: Message = {
      role: "user",
      content: [{ type: "text", text: input }],
    };
    const messages: Message[] = [...this.messages, userMessage];
    await this.session.log(userMessage);

    while (true) {
      if (signal?.aborted) break;
      try {
        const stream = this.client.send(messages, this.toolMetadata(), signal);
        let finalResponse: MessagePart[] | undefined;

        for await (const event of stream) {
          switch (event.type) {
            case "text_delta":
              yield { type: "text", text: event.text };
              break;

            case "tool_call":
              yield {
                type: "tool_call",
                id: event.id,
                name: event.name,
                input: event.input,
              };
              break;

            case "complete":
              finalResponse = event.response;
              break;
          }
        }

        if (!finalResponse) {
          throw new Error("LLM stream ended without a response");
        }

        const assistantMessage: Message = {
          role: "assistant",
          content: finalResponse,
        };
        messages.push(assistantMessage);
        await this.session.log(assistantMessage);

        const toolResults = yield* this.executeTools(finalResponse, signal);
        if (toolResults.length === 0) break;

        const toolResultsMessage: Message = {
          role: "user",
          content: toolResults,
        };
        messages.push(toolResultsMessage);
        await this.session.log(toolResultsMessage);
      } catch (err) {
        if (signal?.aborted) break;
        const message = err instanceof Error ? err.message : String(err);
        await this.session.log({ kind: "error", message });
        throw err;
      }
    }

    if (signal?.aborted) {
      await this.session.log({ kind: "aborted" });
      return;
    }

    this.messages = messages;
  }

  private toolMetadata(): ToolMetadata[] {
    return this.registry.list().map(({ execute, ...meta }) => meta);
  }

  private async *executeTools(
    blocks: MessagePart[],
    signal?: AbortSignal,
  ): AsyncGenerator<AgentEvent, MessagePart[]> {
    const toolResults: MessagePart[] = [];

    for (const block of blocks) {
      if (block.type !== "tool_call") continue;
      if (signal?.aborted) break;

      const tool = this.registry.get(block.name);
      let result: ToolResult;

      if (!tool) {
        result = { content: `Unknown tool: ${block.name}`, is_error: true };
      } else {
        try {
          const content = await tool.execute(block.input);
          result = { content, is_error: false };
        } catch (err) {
          const content = err instanceof Error ? err.message : String(err);
          result = { content, is_error: true };
        }
      }

      const toolResult = {
        type: "tool_result",
        tool_call_id: block.id,
        ...result,
      } as const;

      toolResults.push(toolResult);
      yield toolResult;
    }

    return toolResults;
  }
}
