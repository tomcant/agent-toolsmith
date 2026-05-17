import { Box, Text } from "ink";
import type { ReactNode } from "react";

type FrameProps = {
  label: string;
  color: string;
  width: number;
  children: ReactNode;
};

export function Frame({ label, color, width, children }: FrameProps) {
  const overhead = `╭─ ${label} ╮`.length;
  const dashes = Math.max(1, width - overhead);

  return (
    <Box flexDirection="column" width={width}>
      <Box width={width}>
        <Text color={color}>
          ╭─ {label} {"─".repeat(dashes)}╮
        </Text>
      </Box>
      <Box
        flexDirection="column"
        width={width}
        paddingX={1}
        borderStyle="round"
        borderTop={false}
        borderColor={color}
      >
        {children}
      </Box>
    </Box>
  );
}
