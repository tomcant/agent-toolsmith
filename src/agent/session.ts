import { randomBytes } from "node:crypto";
import { appendFile, mkdir } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import type { Message } from "./types.ts";

const DEFAULT_ROOT = join(homedir(), ".self-evolving-agent", "sessions");

type SessionRecord = Message | { kind: "error"; message: string };

export class Session {
  constructor(private readonly path: string) {}

  async log(record: SessionRecord): Promise<void> {
    const line = `${JSON.stringify({ time: new Date().toISOString(), ...record })}\n`;
    await appendFile(this.path, line);
  }
}

export async function createSession(root: string = DEFAULT_ROOT): Promise<Session> {
  await mkdir(root, { recursive: true });
  const suffix = randomBytes(3).toString("hex");
  const filename = `${toFilenameSafeTimestamp(new Date())}-${suffix}.jsonl`;
  return new Session(join(root, filename));
}

function toFilenameSafeTimestamp(date: Date): string {
  return date.toISOString().replace(/[:.]/g, "-");
}
