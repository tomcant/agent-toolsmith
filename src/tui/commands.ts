export function isExitCommand(input: string): boolean {
  return ["/exit", "/quit"].includes(input.trim());
}
