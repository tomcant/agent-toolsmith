# AGENTS.md

This is the repository for Agent Toolsmith, a general-purpose AI agent that writes its own tools.

## Commands

| Task   | Command                |
| ------ | ---------------------- |
| Run    | `bun run src/index.ts` |
| Test   | `bun test`             |
| Lint   | `bun check`            |
| Format | `bun format`           |

## Conventions

- **Language:** TypeScript
- **Package manager:** Bun
- **Bun APIs:**
  - `Bun.spawn()` for child processes
  - `Bun.file().text()` for reading files
  - `Bun.write()` for writing files

## Architecture

Three layers — the **agent core**, a **pluggable LLM adapter**, and the **terminal UI** — held apart by two small interfaces. The agent drives the conversation without knowing which model backs it or how its output is shown: it reaches the model through `LlmClient` and emits a stream of `AgentEvent`s the UI renders. Everything else plugs into one of those two seams.

**`LlmClient`** (`agent/types.ts`) — a single `send(messages, tools, signal)` method returning an async stream of `text_delta`, `tool_call`, and a final `complete` event. To add a provider, write an `LlmAdapter` (`adapters/llm/types.ts`) and list it in `adapters/llm/index.ts`; `resolveLlmClientFromEnv` picks the first whose environment keys are present, and `resolveLlmClientFromApiKey` picks the one whose `matchesApiKey` recognises a raw key given as input.

**`Tool`** (`agent/tools/types.ts`) — `{ name, description, inputSchema, execute }`. The registry holds tools in memory; the store persists evolved ones to disk as TypeScript and reloads them on launch. `evolve` is itself just a built-in tool that writes to the registry — the same seam every evolved tool flows through.

```
src/
├── index.ts                 Entry point — resolve an LLM client, construct the agent, render the TUI
│
├── agent/
│   ├── agent.ts             Agentic loop — turn() streams events, runs tools, feeds results back
│   ├── factory.ts           createAgent() — assembles registry, built-ins, and session
│   ├── session.ts           JSONL session logging
│   ├── types.ts             Core interfaces — LlmClient, AgentEvent, Message
│   └── tools/
│       ├── registry.ts      In-memory tool registry (register / add / remove / list)
│       ├── store.ts         Persists tools to disk; stage → validate → promote
│       ├── factory.ts       createToolRegistry() — loads saved tools on launch
│       ├── validate.ts      Tool name and metadata validation
│       ├── types.ts         Tool / ToolMetadata types
│       └── builtins/
│           ├── evolve.ts    The self-evolution tool
│           └── tool.ts.tpl  Template evolved tools are rendered into
│
├── adapters/
│   └── llm/
│       ├── index.ts         Provider selection — from env keys, or from a raw key given as input
│       ├── types.ts         LlmAdapter — how a provider is discovered and constructed
│       ├── anthropic.ts     Anthropic implementation of LlmClient
│       └── openai.ts        OpenAI (Responses API) implementation of LlmClient
│
├── tui/                     OpenTUI/React terminal UI — App, components, slash commands, transcript
└── demo/                    Fake LlmClient, sample tools, and scripted scenarios (env DEMO=1)
```

## Testing

- **Framework:** Bun's built-in test runner (`bun:test`)
- **Philosophy:** Classical (Detroit) school — behavior-focused, real objects over mocks, AAA pattern

Always follow the rules and conventions in `docs/TESTING.md` when writing tests.
