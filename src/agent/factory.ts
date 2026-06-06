import { Agent } from "./agent.ts";
import { SessionLog } from "./session/log.ts";
import { createSessionDir } from "./session/session.ts";
import { evolve } from "./tools/builtins/evolve.ts";
import { createToolDir } from "./tools/dir.ts";
import { createToolRegistry } from "./tools/factory.ts";
import type { Tool } from "./tools/types.ts";
import type { LlmClient } from "./types.ts";

export async function createAgent(llmClient: LlmClient, extraTools: Tool[] = []): Promise<Agent> {
  const toolDir = await createToolDir();
  const toolRegistry = await createToolRegistry(toolDir);

  for (const tool of extraTools) {
    toolRegistry.register(tool, { builtin: true });
  }
  toolRegistry.register(evolve(toolRegistry), { builtin: true });

  const sessionDir = await createSessionDir();
  const sessionLog = new SessionLog(sessionDir);

  return new Agent(llmClient, toolRegistry, sessionLog);
}
