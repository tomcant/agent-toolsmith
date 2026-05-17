import { homedir } from "node:os";
import { Box, Text } from "ink";
import pkg from "../../../package.json" with { type: "json" };

export function Banner() {
  return (
    <Box flexDirection="column" paddingTop={1} paddingX={1}>
      <Text color="cyan" bold>
        Self-Evolving Agent <Text dimColor>v{pkg.version}</Text>
      </Text>
      <Text dimColor>{currentWorkingDirectory()}</Text>
    </Box>
  );
}

function currentWorkingDirectory() {
  const cwd = process.cwd();
  const home = homedir();

  if (cwd === home) {
    return "~";
  }

  if (cwd.startsWith(`${home}/`)) {
    return `~${cwd.slice(home.length)}`;
  }

  return cwd;
}
