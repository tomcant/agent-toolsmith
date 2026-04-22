import { afterEach, describe, expect, setSystemTime, test } from "bun:test";
import { getCurrentTime } from "#/tools/builtins/get-current-time.ts";

describe("get-current-time tool", () => {
  afterEach(() => {
    setSystemTime();
  });

  test("returns the current time as an ISO 8601 string", async () => {
    const now = new Date("2026-04-22T10:30:00.000Z");
    setSystemTime(now);

    const result = await getCurrentTime.execute({});

    expect(result).toBe("2026-04-22T10:30:00.000Z");
  });
});
