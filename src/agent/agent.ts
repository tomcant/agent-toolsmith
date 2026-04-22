import type { LlmClient } from "#/llm/client.ts";
import type { Message, MessagePart } from "#/llm/types.ts";
import type { ToolRegistry } from "#/tools/registry.ts";
import type { AgentEvent } from "./types.ts";

type ToolResult = { content: string; is_error: boolean };

export class Agent {
  private conversation: Message[] = [];

  constructor(
    private readonly client: LlmClient,
    private readonly registry: ToolRegistry,
  ) {}

  async *turn(input: string): AsyncGenerator<AgentEvent> {
    const messages: Message[] = [
      ...this.conversation,
      { role: "user", content: [{ type: "text", text: input }] },
    ];

    while (true) {
      const { message, stop_reason } = await this.client.send(messages, this.registry.list());
      messages.push(message);

      for (const block of message.content) {
        const event = toEvent(block);
        if (event) yield event;
      }

      if (stop_reason !== "tool_use") {
        break;
      }

      const content: MessagePart[] = [];

      for (const block of message.content) {
        if (block.type !== "tool_use") continue;
        const result = await this.executeTool(block.name, block.input);
        content.push({ type: "tool_result", tool_use_id: block.id, ...result });
        yield { type: "tool_result", id: block.id, ...result };
      }

      messages.push({ role: "user", content });
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
      return { type: "text", text: block.text };
    case "tool_use":
      return { type: "tool_call", id: block.id, name: block.name, input: block.input };
    default:
      return undefined;
  }
}
