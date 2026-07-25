import type { AddToolInput, ToolStore } from "./store.ts";
import type { Tool } from "./types.ts";
import { validateMetadata } from "./validate.ts";

export class ToolRegistry {
  private readonly tools = new Map<string, Tool>();
  private readonly builtins = new Set<string>();

  constructor(private readonly store: ToolStore) {}

  list(): Tool[] {
    return [...this.tools.values()];
  }

  get(name: string): Tool | undefined {
    return this.tools.get(name);
  }

  isBuiltin(name: string): boolean {
    return this.builtins.has(name);
  }

  async source(name: string): Promise<string> {
    if (!this.tools.has(name)) {
      throw new Error(`Unknown tool: ${name}`);
    }

    if (this.builtins.has(name)) {
      throw new Error(`Cannot read source of builtin tool: ${name}`);
    }

    return this.store.read(name);
  }

  register(tool: Tool, opts: { builtin?: boolean } = {}): void {
    if (this.builtins.has(tool.name)) {
      throw new Error(`Cannot overwrite builtin tool: ${tool.name}`);
    }

    if (this.tools.has(tool.name) && !opts.builtin) {
      throw new Error(`Tool already registered: ${tool.name}`);
    }

    this.tools.set(tool.name, tool);
    if (opts.builtin) this.builtins.add(tool.name);
  }

  async add(input: AddToolInput): Promise<void> {
    validateMetadata(input);

    if (typeof input.code !== "string" || input.code.length === 0) {
      throw new Error("code must be a non-empty string");
    }

    if (this.builtins.has(input.name)) {
      throw new Error(`Cannot overwrite builtin tool: ${input.name}`);
    }

    await this.store.save(input);
    this.tools.set(input.name, await this.store.load(input.name));
  }

  async remove(name: string): Promise<void> {
    if (!this.tools.has(name)) {
      throw new Error(`Unknown tool: ${name}`);
    }

    if (this.builtins.has(name)) {
      throw new Error(`Cannot remove builtin tool: ${name}`);
    }

    await this.store.delete(name);
    this.tools.delete(name);
  }
}
