import type { SessionLog } from "./session/log.ts";
import type { ToolRegistry } from "./tools/registry.ts";
import type { ToolMetadata } from "./tools/types.ts";
import type { AgentEvent, LlmClient, Message, MessagePart } from "./types.ts";

type ToolResult = { content: string; is_error: boolean };

export class Agent {
  private messages: Message[] = [];

  constructor(
    private readonly client: LlmClient,
    private readonly registry: ToolRegistry,
    private readonly log: SessionLog,
  ) {}

  listTools(): ToolMetadata[] {
    return this.registry.list().map(({ execute, ...meta }) => meta);
  }

  async removeTool(name: string): Promise<void> {
    await this.registry.remove(name);
  }

  async *turn(input: string): AsyncGenerator<AgentEvent> {
    const userMessage: Message = {
      role: "user",
      content: [{ type: "text", text: input }],
    };
    const messages: Message[] = [...this.messages, userMessage];
    await this.log.write(userMessage);

    while (true) {
      try {
        const stream = this.client.send(messages, this.listTools());
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
        await this.log.write(assistantMessage);

        const toolResults = yield* this.executeTools(finalResponse);
        if (toolResults.length === 0) break;

        const toolResultsMessage: Message = {
          role: "user",
          content: toolResults,
        };
        messages.push(toolResultsMessage);
        await this.log.write(toolResultsMessage);
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        await this.log.write({ kind: "error", message });
        throw err;
      }
    }

    this.messages = messages;
  }

  private async *executeTools(blocks: MessagePart[]): AsyncGenerator<AgentEvent, MessagePart[]> {
    const toolResults: MessagePart[] = [];

    for (const block of blocks) {
      if (block.type !== "tool_call") continue;

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
