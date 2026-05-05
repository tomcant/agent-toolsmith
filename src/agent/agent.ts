import type { LlmClient } from "#/llm/client.ts";
import type { Message, MessagePart } from "#/llm/types.ts";
import type { SessionLog, SessionRecord } from "#/session/log.ts";
import type { ToolRegistry } from "#/tools/registry.ts";
import type { AgentEvent } from "./types.ts";

type ToolResult = { content: string; is_error: boolean };

export class Agent {
  private messages: Message[] = [];

  constructor(
    private readonly client: LlmClient,
    private readonly registry: ToolRegistry,
    private readonly log: SessionLog,
  ) {}

  async *turn(input: string): AsyncGenerator<AgentEvent> {
    await this.log.write({ kind: "user", text: input });

    const messages: Message[] = [
      ...this.messages,
      { role: "user", content: [{ type: "text", text: input }] },
    ];

    while (true) {
      try {
        const stream = this.client.send(messages, this.registry.list());
        let response: MessagePart[] | undefined;
        let hasStreamedText = false;

        for await (const event of stream) {
          if (event.type === "delta") {
            yield { type: "text", text: event.text };
            hasStreamedText = true;
          } else {
            response = event.response;
          }
        }

        if (!response) {
          throw new Error("LLM stream ended without a response");
        }

        messages.push({ role: "assistant", content: response });

        const toolResults: MessagePart[] = [];

        for (const block of response) {
          const event = toEvent(block);
          if (!event) continue;

          await this.log.write(toSessionRecord(event));

          if (event.type !== "text" || !hasStreamedText) {
            yield event;
          }

          if (block.type !== "tool_call") {
            continue;
          }

          const result = await this.executeTool(block.name, block.input);

          toolResults.push({
            type: "tool_result",
            tool_call_id: block.id,
            ...result,
          });

          const resultEvent: AgentEvent = {
            type: "tool_result",
            tool_call_id: block.id,
            ...result,
          };
          await this.log.write(toSessionRecord(resultEvent));
          yield resultEvent;
        }

        if (toolResults.length === 0) {
          break;
        }

        messages.push({ role: "user", content: toolResults });
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        await this.log.write({ kind: "error", message });
        throw err;
      }
    }

    this.messages = messages;
  }

  private async executeTool(name: string, input: unknown): Promise<ToolResult> {
    const tool = this.registry.get(name);

    if (!tool) {
      return { content: `Unknown tool: ${name}`, is_error: true };
    }

    try {
      const content = await tool.execute(input);
      return { content, is_error: false };
    } catch (err) {
      const content = err instanceof Error ? err.message : String(err);
      return { content, is_error: true };
    }
  }
}

function toEvent(block: MessagePart): AgentEvent | undefined {
  switch (block.type) {
    case "text":
      return {
        type: "text",
        text: block.text,
      };
    case "tool_call":
      return {
        type: "tool_call",
        id: block.id,
        name: block.name,
        input: block.input,
      };
    default:
      return undefined;
  }
}

function toSessionRecord(event: AgentEvent): SessionRecord {
  switch (event.type) {
    case "text":
      return {
        kind: "assistant",
        text: event.text,
      };
    case "tool_call":
      return {
        kind: "tool_call",
        id: event.id,
        name: event.name,
        input: event.input,
      };
    case "tool_result":
      return {
        kind: "tool_result",
        tool_call_id: event.tool_call_id,
        content: event.content,
        is_error: event.is_error,
      };
  }
}
