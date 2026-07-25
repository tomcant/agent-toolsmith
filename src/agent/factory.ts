import { Agent } from "./agent.ts";
import { createSession } from "./session.ts";
import { evolve } from "./tools/builtins/evolve.ts";
import { inspect } from "./tools/builtins/inspect.ts";
import { createToolDir } from "./tools/dir.ts";
import { createToolRegistry } from "./tools/factory.ts";
import type { Tool } from "./tools/types.ts";
import type { LlmClient } from "./types.ts";

type CreateAgentOptions = {
  extraTools?: Tool[];
  toolDir?: string;
  sessionDir?: string;
};

export async function createAgent(
  llmClient: LlmClient,
  options: CreateAgentOptions = {},
): Promise<Agent> {
  const toolDir = await createToolDir(options.toolDir);
  const { registry: toolRegistry, skipped } = await createToolRegistry(toolDir);

  for (const tool of options.extraTools ?? []) {
    toolRegistry.register(tool);
  }
  toolRegistry.register(evolve(toolRegistry), { builtin: true });
  toolRegistry.register(inspect(toolRegistry), { builtin: true });

  const session = await createSession(options.sessionDir);

  const notices = skipped.map(({ file, reason }) => `Skipped tool "${file}": ${reason}`);

  return new Agent(llmClient, toolRegistry, session, notices);
}
