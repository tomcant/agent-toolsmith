# Self-Evolving AI Agent

A general-purpose AI agent that evolves itself when required.

## Prerequisites

- [Bun](https://bun.sh) JavaScript runtime
- [Anthropic](https://platform.claude.com) API key

## Setup

Install dependencies:

```sh
bun install
```

## Usage

Start an interactive chat with the agent:

```sh
bun run src/index.ts
```

## Development

```sh
bun test    # run all tests
bun check   # run Biome checker
bun format  # run Biome formatter
bun tsc     # run TS type checker
```

See [docs/TESTING.md](docs/TESTING.md) for an overview of testing philosophy and conventions.

Pre-commit checks are managed with [prek](https://github.com/j178/prek), a Rust re-implementation of [pre-commit](https://github.com/pre-commit/pre-commit). Run all pre-commit checks manually with:

```sh
prek -a  # check format, lint, types and run tests
```
