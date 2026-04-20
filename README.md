# Self-Evolving AI Agent

A general-purpose AI agent that evolves itself when required.

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

Type `/quit`, `/exit` or press Ctrl+C to quit.

## Development

```sh
bun test    # run all tests
bun lint    # run Biome linter
bun format  # run Biome formatter
```

See [docs/TESTING.md](docs/TESTING.md) for an overview of testing philosophy and conventions.

Pre-commit checks are managed with [prek](https://github.com/j178/prek), a Rust re-implementation of [pre-commit](https://github.com/pre-commit/pre-commit). Run all pre-commit checks manually with:

```sh
prek -a  # format, lint, test
```
