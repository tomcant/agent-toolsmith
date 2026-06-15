import { Box, Text } from "ink";
import pkg from "../../../package.json" with { type: "json" };

const LOGO = [
  "░        ░░  ░░░░  ░░░      ░░░  ░░░░░░░░  ░░░░  ░░        ░",
  "▒  ▒▒▒▒▒▒▒▒  ▒▒▒▒  ▒▒  ▒▒▒▒  ▒▒  ▒▒▒▒▒▒▒▒  ▒▒▒▒  ▒▒  ▒▒▒▒▒▒▒",
  "▓      ▓▓▓▓▓  ▓▓  ▓▓▓  ▓▓▓▓  ▓▓  ▓▓▓▓▓▓▓▓▓  ▓▓  ▓▓▓      ▓▓▓",
  "█  ██████████    ████  ████  ██  ██████████    ████  ███████",
  "█        █████  ██████      ███        █████  █████        █",
];

const GRADIENT = [
  [0x22, 0xd3, 0xee], // cyan
  [0x3b, 0x82, 0xf6], // blue
  [0xa8, 0x55, 0xf7], // purple
  [0xec, 0x48, 0x99], // pink
] as const;

export function Banner() {
  const width = Math.max(...LOGO.map((line) => line.length));

  return (
    <Box flexDirection="column" paddingX={1} paddingTop={1}>
      {LOGO.map((line) => (
        <GradientLine key={line} text={line.padEnd(width)} span={width} />
      ))}
      <Box marginTop={1}>
        <GradientLine text="Self-Evolving Agent" span={width} bold />
        <Text dimColor> v{pkg.version}</Text>
      </Box>
    </Box>
  );
}

type GradientLineProps = {
  text: string;
  span: number;
  bold?: boolean;
};

function GradientLine({ text, span, bold }: GradientLineProps) {
  const chars = [...text].map((char, column) => ({
    char,
    column,
    color: colorAt(span <= 1 ? 0 : column / (span - 1)),
  }));

  return (
    <Text bold={bold}>
      {chars.map(({ char, column, color }) => (
        <Text key={column} color={color}>
          {char}
        </Text>
      ))}
    </Text>
  );
}

// Maps t in [0, 1] to a hex colour by interpolating between the gradient stops.
function colorAt(t: number): string {
  const clamped = Math.max(0, Math.min(1, t));
  const scaled = clamped * (GRADIENT.length - 1);
  const lower = Math.min(Math.floor(scaled), GRADIENT.length - 2);
  const fraction = scaled - lower;

  const [r1, g1, b1] = GRADIENT[lower] ?? GRADIENT[0];
  const [r2, g2, b2] = GRADIENT[lower + 1] ?? GRADIENT[0];

  const channel = (a: number, b: number) =>
    Math.round(a + (b - a) * fraction)
      .toString(16)
      .padStart(2, "0");

  return `#${channel(r1, r2)}${channel(g1, g2)}${channel(b1, b2)}`;
}
