import { appendFile } from "node:fs/promises";
import type { Message } from "../types.ts";

type SessionRecord = Message | { kind: "error"; message: string };

export class SessionLog {
  constructor(private readonly path: string) {}

  async write(record: SessionRecord): Promise<void> {
    const line = `${JSON.stringify({ time: new Date().toISOString(), ...record })}\n`;
    await appendFile(this.path, line);
  }
}
