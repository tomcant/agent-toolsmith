import { mkdir, mkdtemp } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";

const DEFAULT_ROOT = join(homedir(), ".self-evolving-agent", "sessions");

export async function createSessionDir(root: string = DEFAULT_ROOT): Promise<string> {
  await mkdir(root, { recursive: true });
  const dirPrefix = `${toFilenameSafeTimestamp(new Date())}-`;
  return mkdtemp(join(root, dirPrefix));
}

function toFilenameSafeTimestamp(date: Date): string {
  return date.toISOString().replace(/[:.]/g, "-");
}
