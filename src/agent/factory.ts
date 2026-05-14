import { Agent } from "./agent.ts";
import { SessionLog } from "./session/log.ts";
import { createSessionDir } from "./session/session.ts";
import { addTool } from "./tools/builtins/add-tool.ts";
import { createToolsDir } from "./tools/dir.ts";
import { createToolRegistry } from "./tools/discovery.ts";
import type { LlmClient } from "./types.ts";

export async function createAgent(llmClient: LlmClient): Promise<Agent> {
  const toolsDir = await createToolsDir();
  const toolRegistry = await createToolRegistry(toolsDir);
  toolRegistry.register(addTool(toolsDir, toolRegistry));

  const sessionDir = await createSessionDir();
  const sessionLog = new SessionLog(sessionDir);

  return new Agent(llmClient, toolRegistry, sessionLog);
}
