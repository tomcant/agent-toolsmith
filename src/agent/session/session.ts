import { randomBytes } from "node:crypto";
import { mkdir } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";

const DEFAULT_ROOT = join(homedir(), ".self-evolving-agent", "sessions");

export async function createSessionPath(root: string = DEFAULT_ROOT): Promise<string> {
  await mkdir(root, { recursive: true });
  const suffix = randomBytes(3).toString("hex");
  const filename = `${toFilenameSafeTimestamp(new Date())}-${suffix}.jsonl`;
  return join(root, filename);
}

function toFilenameSafeTimestamp(date: Date): string {
  return date.toISOString().replace(/[:.]/g, "-");
}
