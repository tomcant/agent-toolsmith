import { appendFile } from "node:fs/promises";
import { join } from "node:path";

export type SessionRecord =
  | { kind: "user"; text: string }
  | { kind: "assistant"; text: string }
  | { kind: "tool_call"; id: string; name: string; input: unknown }
  | { kind: "tool_result"; id: string; content: string; is_error: boolean }
  | { kind: "error"; message: string };

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
