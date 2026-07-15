import { Box, Text } from "ink";
import type { ReactNode } from "react";
import { theme } from "../theme.ts";

type OverlayProps = {
  title: string;
  children: ReactNode;
};

export function Overlay({ title, children }: OverlayProps) {
  return (
    <Box flexDirection="column" borderStyle="round" borderColor={theme.accent} paddingX={1}>
      <Box marginBottom={1}>
        <Text color={theme.accent} bold>
          {`▌ ${title}`}
        </Text>
      </Box>
      {children}
      <Box marginTop={1}>
        <Text dimColor>Esc to close</Text>
      </Box>
    </Box>
  );
}
