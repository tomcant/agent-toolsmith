<p align="center">
  <img src="logo.svg" alt="Agent Toolsmith" width="100%">
</p>

# Agent Toolsmith

A general-purpose AI agent that writes its own tools.

It starts with one built-in tool, `evolve`, and writes the rest as it needs them. When it hits a task it can't do yet, it writes a new tool, saves it to disk and uses it right away. New tools persist across sessions, so the agent's capabilities grow the more you use it.

> [!CAUTION]
> This is a personal experiment for didactic purposes only. It's rough around the edges and not battle-tested in any way. Tool code runs in-process with your privileges — there is no sandbox (for now). The system prompt instructs the model not to write tools that delete data, leak secrets, or make irreversible changes unless asked, but of course this cannot be trusted.

## How It Works

The agent runs a standard agentic loop — stream a response, run any tool calls, feed the results back — until the model stops calling tools:

```
User input → Agent.turn() → LLM (stream) → text + tool calls
                  ▲                                │
                  │                                ▼
           tool results ◀───────────── execute tools (registry)
```

What makes it self-evolving is the `evolve` tool. When the model needs a capability it doesn't have, it defines one:

```
Task needs a capability the agent lacks
            │
            ▼
  Agent calls `evolve` { name, description, inputSchema, code }
            │
            ▼
  Code staged to a temp file → imported → validated
            │
            ├─ invalid ─→ error returned, nothing changes
            │
            ▼
  Promoted to ~/.agent-toolsmith/tools/<name>.ts
            │
            ▼
  Registered and callable immediately — available in this and future sessions
```

The `code` is the body of an `async (input) => { ... }` function that must return a string. Because it runs inside that function, tools use dynamic `import()` to reach Node built-ins; the `Bun` global, `fetch`, and the usual Node/Web globals are all available. Calling `evolve` again with an existing name replaces that tool, so the model can improve and/or fix existing tools.

## Tech Stack

- TypeScript
- Bun
- React 19
- Ink 7

## Prerequisites

- [Bun](https://bun.sh) JavaScript runtime
- [Anthropic](https://platform.claude.com) API key

## Setup

Install dependencies:

```sh
bun install
```

Start an interactive chat:

```sh
bun run src/index.ts
```

The agent prompts for your Anthropic API key on launch if it isn't already set. To skip the prompt, set it in your environment beforehand:

```sh
export ANTHROPIC_API_KEY="sk-ant-..."
```

### Standalone binary

Compile a self-contained executable (bundles the Bun runtime and all dependencies):

```sh
bun run build
./agent
```

## Usage

Type a message to chat with the agent. It will create and run tools as needed.

### Slash commands

| Command                | Description            |
| ---------------------- | ---------------------- |
| `/tools`               | List available tools   |
| `/tools remove <name>` | Remove a tool          |
| `/clear`               | Clear the conversation |
| `/exit`, `/quit`       | Exit the agent         |

Press `Esc` to abort an in-flight response or close the overlay. Press `Ctrl+C` to quit.

## Storage

| Path                              | Contents                                      |
| --------------------------------- | --------------------------------------------- |
| `~/.agent-toolsmith/tools/`       | Evolved tools, one TypeScript file per tool   |
| `~/.agent-toolsmith/sessions/`    | Per-session JSONL transcripts                 |

## Development

```sh
bun test     # run all tests
bun check    # lint with Biome
bun format   # format with Biome
bun tsc      # type-check with TypeScript
```

Tests follow the classical (Detroit) school — behavior-focused, real objects over mocks, AAA pattern. See [docs/TESTING.md](docs/TESTING.md) for the full conventions.

Pre-commit checks are managed with [prek](https://github.com/j178/prek). Run them manually with:

```sh
prek -a  # lint, type-check, and test
```

CI runs the same lint, type-check, and test suite on every push via GitHub Actions.

### Demo mode

Run the agent against a fake LLM client with scripted scenarios and sample tools — no API key required:

```sh
bun demo
```

This sets `DEMO=1`, which swaps in `DemoLlmClient` so you can explore the TUI and tool flow offline.
