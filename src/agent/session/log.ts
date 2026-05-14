import { appendFile } from "node:fs/promises";
import { join } from "node:path";
import type { Message } from "../types.ts";

type SessionRecord = Message | { kind: "error"; message: string };

export class SessionLog {
  private readonly path: string;

  constructor(dir: string) {
    this.path = join(dir, "session.jsonl");
  }

  async write(record: SessionRecord): Promise<void> {
    const line = `${JSON.stringify({ time: new Date().toISOString(), ...record })}\n`;
    await appendFile(this.path, line);
  }
}
