# Testing

Tests use Bun's built-in test runner (`bun:test`) and are located in `tests/`.

```bash
bun test # run all tests
```

## Philosophy

We follow the **classical (Detroit) school** of testing. The unit under test is a unit of **behaviour**, not a unit of code. A single test might exercise multiple functions or classes working together — that's fine and expected.

**Test through the public API.** Tests interact with the system the same way callers would. We don't test private methods or assert on internal state.

**Real objects over mocks.** We prefer stubs and fakes over mocks, and use test doubles only for true external boundaries: `globalThis.fetch`, the system clock, the filesystem (when we need to control it). Internal collaborators are never replaced with test doubles — if something is hard to test without mocking internals, that's a signal to reconsider the design.

**Focus on behaviours that matter.** We don't chase coverage metrics. Tests exist where they catch real bugs and document real behaviours. Thin glue code is not tested because we'd be testing our mocks, not our code.

## Test Structure

Every test follows **Arrange-Act-Assert** with blank line separation:

```typescript
test("behaviour", async () => {
  // Arrange
  ...

  // Act
  ...

  // Assert
  ...
});
```

Multiple assertions in a single test are fine when they verify different facets of the same behaviour.

## Test Doubles

We use precise terminology for test doubles: "Stub" for pre-configured responses, "Spy" for recording interactions. "Mock" is not a catch-all.

We never replace types we don't own with test doubles. Where we need to isolate from external services, we inject our own abstractions and stub those.

## Patterns and Conventions

Import from `"bun:test"` — same API shape as Jest/Vitest (`describe`, `test`, `expect`, `beforeEach`, `afterEach`).

### System Clock Control

Bun's `setSystemTime()` controls `Date.now()` and `new Date()`. Always reset it in `afterEach`:

```typescript
afterEach(() => {
  setSystemTime(); // restores real time
});
```

### Environment Variable Isolation

Tests that touch `process.env` save and restore values:

```typescript
let savedVar: string | undefined;
beforeEach(() => {
  savedVar = process.env.VAR;
  delete process.env.VAR;
});
afterEach(() => {
  if (savedVar !== undefined) process.env.VAR = savedVar;
  else delete process.env.VAR;
});
```

## Fixtures

Static test data lives in `tests/fixtures/`. Use fixtures for sample inputs that would be noisy inline (e.g. file inputs).

## Adding Tests

1. **Identify the behaviour** you want to verify — not the function, the behaviour
2. **Determine the boundary**: if it touches an external service (network, API, system clock), inject a double. If it's internal code, use the real thing
3. **Create the test file** in `tests/` named `{feature}.test.ts`
4. **Use temp directories** for any filesystem operations
5. **Follow AAA** with blank line separation
6. **Name tests** to describe the behaviour: "missing config triggers error", not "test getConfig"
7. **Run the full suite** after: `bun test`
