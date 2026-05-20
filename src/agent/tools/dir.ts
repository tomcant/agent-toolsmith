import { mkdir } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";

const DEFAULT_ROOT = join(homedir(), ".self-evolving-agent", "tools");

export async function createToolDir(root: string = DEFAULT_ROOT): Promise<string> {
  await mkdir(root, { recursive: true });
  return root;
}
