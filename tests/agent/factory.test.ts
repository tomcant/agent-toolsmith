import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createAgent } from "#/agent";
import { LlmClientSpy } from "../doubles/llm-client-spy.ts";
import { collect, makeTool } from "../helpers.ts";

describe("agent creation", () => {
  let toolDir: string;
  let sessionsRootDir: string;

  beforeEach(async () => {
    toolDir = await mkdtemp(join(tmpdir(), "tools-"));
    sessionsRootDir = await mkdtemp(join(tmpdir(), "sessions-root-"));
  });

  afterEach(async () => {
    await rm(toolDir, { recursive: true, force: true });
    await rm(sessionsRootDir, { recursive: true, force: true });
  });

  test("registers the evolve tool", async () => {
    const llm = new LlmClientSpy([
      [
        { type: "text_delta", text: "Reply" },
        { type: "complete", response: [{ type: "text", text: "Reply" }] },
      ],
    ]);
    const agent = await createAgent(llm, { toolDir, sessionsRootDir });

    await collect(agent.turn("User message"));

    expect(llm.calls[0]?.tools?.map((t) => t.name)).toEqual(["evolve"]);
  });

  test("registers the extra tools", async () => {
    const llm = new LlmClientSpy([
      [
        { type: "text_delta", text: "Reply" },
        { type: "complete", response: [{ type: "text", text: "Reply" }] },
      ],
    ]);
    const extraTools = [makeTool("extra-tool")];
    const agent = await createAgent(llm, { extraTools, toolDir, sessionsRootDir });

    await collect(agent.turn("User message"));

    expect(llm.calls[0]?.tools?.map((t) => t.name)).toContain("extra-tool");
  });
});
