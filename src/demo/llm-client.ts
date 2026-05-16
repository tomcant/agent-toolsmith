import type { Tool } from "#/agent/tools/types.ts";
import type { LlmClient, LlmEvent, Message } from "#/agent/types.ts";
import { runScenario } from "./scenarios.ts";

export class DemoLlmClient implements LlmClient {
  async *send(messages: Message[], _tools?: Tool[]): AsyncGenerator<LlmEvent> {
    if (messages.at(-1)?.content.some((part) => part.type === "tool_result")) {
      yield { type: "complete", response: [] };
      return;
    }
    yield* runScenario(lastUserMessage(messages));
  }
}

function lastUserMessage(messages: Message[]): string {
  for (let i = messages.length - 1; i >= 0; i--) {
    const message = messages[i];
    if (!message || message.role !== "user") {
      continue;
    }
    for (const part of message.content) {
      if (part.type === "text") {
        return part.text.trim().toLowerCase();
      }
    }
  }
  return "";
}
