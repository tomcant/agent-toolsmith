import type { LlmClient } from "#/llm/client.ts";
import type { Message, MessagePart } from "#/llm/types.ts";
import type { SessionLog, SessionRecord } from "#/session/log.ts";
import type { ToolRegistry } from "#/tools/registry.ts";
import type { AgentEvent } from "./types.ts";

type ToolResult = { content: string; is_error: boolean };

export class Agent {
  private conversation: Message[] = [];

  constructor(
    private readonly client: LlmClient,
    private readonly registry: ToolRegistry,
    private readonly log: SessionLog,
  ) {}

  async *turn(input: string): AsyncGenerator<AgentEvent> {
    await this.log.write({ kind: "user", text: input });

    const messages: Message[] = [
      ...this.conversation,
      { role: "user", content: [{ type: "text", text: input }] },
    ];

    while (true) {
      try {
        const { message, stop_reason } = await this.client.send(messages, this.registry.list());
        messages.push(message);

        for (const block of message.content) {
          const event = toEvent(block);
          if (event) {
            await this.log.write(toSessionRecord(event));
            yield event;
          }
        }

        if (stop_reason !== "tool_use") {
          break;
        }

        const content: MessagePart[] = [];

        for (const block of message.content) {
          if (block.type !== "tool_use") {
            continue;
          }

          const result = await this.executeTool(block.name, block.input);
          content.push({ type: "tool_result", tool_use_id: block.id, ...result });

          const event: AgentEvent = { type: "tool_result", id: block.id, ...result };
          await this.log.write(toSessionRecord(event));
          yield event;
        }

        messages.push({ role: "user", content });
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        await this.log.write({ kind: "error", message });
        throw err;
      }
    }

    this.conversation = messages;
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
    case "tool_use":
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
        id: event.id,
        content: event.content,
        is_error: event.is_error,
      };
  }
}
