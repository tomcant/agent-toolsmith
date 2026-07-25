import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createAgent } from "#/agent";
import { LlmClientSpy } from "../doubles/llm-client-spy.ts";
import { collect, makeTool } from "../helpers.ts";

describe("agent creation", () => {
  let toolDir: string;
  let sessionDir: string;

  beforeEach(async () => {
    toolDir = await mkdtemp(join(tmpdir(), "tools-"));
    sessionDir = await mkdtemp(join(tmpdir(), "sessions-"));
  });

  afterEach(async () => {
    await rm(toolDir, { recursive: true, force: true });
    await rm(sessionDir, { recursive: true, force: true });
  });

  test("registers the builtin tools", async () => {
    const llm = new LlmClientSpy([
      [
        { type: "text_delta", text: "Reply" },
        { type: "complete", response: [{ type: "text", text: "Reply" }] },
      ],
    ]);
    const agent = await createAgent(llm, { toolDir, sessionDir });

    await collect(agent.turn("User message"));

    expect(llm.calls[0]?.tools?.map((t) => t.name)).toEqual(["evolve", "inspect"]);
  });

  test("registers the extra tools", async () => {
    const llm = new LlmClientSpy([
      [
        { type: "text_delta", text: "Reply" },
        { type: "complete", response: [{ type: "text", text: "Reply" }] },
      ],
    ]);
    const extraTools = [makeTool("extra-tool")];
    const agent = await createAgent(llm, { extraTools, toolDir, sessionDir });

    await collect(agent.turn("User message"));

    expect(llm.calls[0]?.tools?.map((t) => t.name)).toContain("extra-tool");
    expect(agent.listTools().map((t) => t.name)).toEqual(["extra-tool"]);
  });

  test("has no startup notices when every tool loads", async () => {
    const agent = await createAgent(new LlmClientSpy(), { toolDir, sessionDir });

    expect(agent.startupNotices()).toEqual([]);
  });

  test("reports tools that failed to load as startup notices", async () => {
    await Bun.write(join(toolDir, "broken.ts"), "invalid js {");

    const agent = await createAgent(new LlmClientSpy(), { toolDir, sessionDir });

    const notices = agent.startupNotices();
    expect(notices).toHaveLength(1);
    expect(notices[0]).toContain("broken.ts");
  });
});
