# AGENTS.md

This is the repository for Agent Toolsmith, a general-purpose AI agent that writes its own tools

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

## Testing

- **Framework:** Bun's built-in test runner (`bun:test`)
- **Philosophy:** Classical (Detroit) school — behavior-focused, real objects over mocks, AAA pattern

Always follow the rules and conventions in `docs/TESTING.md` when writing tests.
