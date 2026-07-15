import { Box, Text } from "ink";
import { memo, useEffect, useState } from "react";
import pkg from "../../../package.json" with { type: "json" };
import { theme } from "../theme.ts";

type Cell = { char: string; color: string };
type Column = { index: number; speed: number; tail: number; starts: number[]; reveal: number };

// Matrix rain colors, bright head to dark tail.
const HEAD = "#CFFFD6";
const BRIGHT = theme.accent;
const MID = "#13C23C";
const DIM = "#0A7A28";
const FAINT = "#064F18";

// The wordmark's three rows, fading top to bottom.
const WORDMARK_ROW_COLORS = ["#7CFF97", "#46D062", "#0FA02D"] as const;

// Half-width glyphs only — every one is a single terminal cell, so falling rain
// never knocks the wordmark out of alignment.
const RAIN = [..."ｱｲｳｴｵｶｷｸｹｺﾊﾋﾌﾍﾎﾔﾕﾗﾘﾜﾝ0123456789:=+*<>|╱╲"];

// Three-row block font (half-height blocks) — only the glyphs TOOLSMITH needs.
const FONT: Record<string, [string, string, string]> = {
  T: ["▀▀█▀▀", "  █  ", "  ▀  "],
  O: ["▄▀▀▀▄", "█   █", " ▀▀▀ "],
  L: ["█    ", "█    ", "▀▀▀▀▀"],
  S: ["▄▀▀▀▀", " ▀▀▀▄", "▀▀▀▀ "],
  M: ["█▄ ▄█", "█ ▀ █", "▀   ▀"],
  I: ["▀▀█▀▀", "  █  ", "▀▀▀▀▀"],
  H: ["█   █", "█▀▀▀█", "▀   ▀"],
};

// Rows per FONT glyph, and so the height of the assembled wordmark.
const WORDMARK_HEIGHT = 3;

// Each row joins the letters' glyph rows, one blank column apart for kerning.
const WORDMARK_ROWS = Array.from({ length: WORDMARK_HEIGHT }, (_, row) =>
  [..."TOOLSMITH"].map((char) => FONT[char]?.[row] ?? " ").join(" "),
);
const WIDTH = WORDMARK_ROWS[0]?.length ?? 0;

// The settled wordmark. null cells are gaps the rain falls straight through;
// lit cells carry their row's color.
const WORDMARK: (Cell | null)[][] = WORDMARK_ROWS.map((line, row) =>
  [...line].map((char) =>
    char === " " ? null : { char, color: WORDMARK_ROW_COLORS[row] ?? BRIGHT },
  ),
);

// The field is taller than the wordmark: open sky above and ground below, so
// the rain streams in from off-screen and carries on past the letters.
const SKY = 3;
const GROUND = 2;
const WORDMARK_TOP = SKY;

// Staggered drops per column, so the rain stays dense instead of leaving gaps.
const DROPS_PER_COLUMN = 2;

// The intro runs in three acts: the rain falls alone, then the wordmark decodes
// out of it left-to-right, then the rain thins away and the logo settles.
const FRAME_MS = 60;
const REVEAL_START = 20;
const REVEAL_PER_COLUMN = 0.4;
const FADE_START = REVEAL_START + Math.ceil(WIDTH * REVEAL_PER_COLUMN) + 2;
// The fade lasts exactly as many frames as there are sky and ground rows to
// peel, so the field loses precisely one row per frame — no stalled frames, no
// double drops — whatever the field height.
const FRAMES = FADE_START + SKY + GROUND;

// Per-column stream parameters, all derived from the PRNG so every render of a
// given frame is identical — no flicker across React re-renders.
const COLUMNS: Column[] = Array.from({ length: WIDTH }, (_, index) => ({
  index,
  speed: 0.35 + prng(index * 7 + 1) * 0.4,
  tail: 5 + Math.floor(prng(index * 3 + 2) * 5),
  starts: Array.from(
    { length: DROPS_PER_COLUMN },
    (_, drop) => -prng(index * 13 + drop * 101 + 5) * (SKY + 8) - drop * (SKY + 4),
  ),
  reveal: REVEAL_START + Math.floor(index * REVEAL_PER_COLUMN + prng(index * 19 + 7) * 2),
}));

export const Banner = memo(function Banner() {
  const animate = process.stdout.isTTY === true && !process.env.TOOLSMITH_NO_INTRO;
  const [frame, setFrame] = useState(animate ? 0 : FRAMES);

  useEffect(() => {
    if (!animate) {
      return;
    }
    let current = 0;
    const timer = setInterval(() => {
      current += 1;
      setFrame(current);
      if (current >= FRAMES) {
        clearInterval(timer);
      }
    }, FRAME_MS);
    return () => clearInterval(timer);
  }, [animate]);

  return (
    <Box flexDirection="column" paddingX={1} paddingTop={1}>
      {renderFrame(frame).map(({ key, cells }) => (
        <Text key={key}>
          {cells.map(({ key: cellKey, char, color }) => (
            <Text key={cellKey} color={color}>
              {char}
            </Text>
          ))}
        </Text>
      ))}
      <Box marginTop={1}>
        <Text bold color={MID}>
          Agent Toolsmith
        </Text>
        <Text dimColor> v{pkg.version}</Text>
      </Box>
    </Box>
  );
});

// Build the visible field for one frame. Keys are field coordinates, so as the
// window narrows React reconciles rows and cells instead of remounting them.
function renderFrame(frame: number) {
  const elapsed = fadeElapsed(frame);
  const fade = elapsed / (SKY + GROUND);
  const { top, bottom } = visibleRows(elapsed);
  return Array.from({ length: bottom - top + 1 }, (_, index) => {
    const row = top + index;
    return {
      key: `row-${row}`,
      cells: COLUMNS.map((col) => ({
        key: `${row}-${col.index}`,
        ...fieldCell(row, col, frame, fade),
      })),
    };
  });
}

// Frames elapsed into the fade, capped at SKY + GROUND. Doubles as the count of
// rows peeled so far, keeping the thinning tail and shrinking field in lock-step.
function fadeElapsed(frame: number): number {
  return Math.min(SKY + GROUND, Math.max(0, frame - FADE_START));
}

// The field window as sky and ground peel away, one row per frame. The peeled
// count is split across the two edges (rather than rounded independently) so no
// frame drops two rows and the wordmark always stays inside the window.
function visibleRows(removed: number): { top: number; bottom: number } {
  const skyRemoved = Math.round((removed * SKY) / (SKY + GROUND));
  return {
    top: skyRemoved,
    bottom: WORDMARK_TOP + WORDMARK_HEIGHT - 1 + GROUND - (removed - skyRemoved),
  };
}

// One field cell: a revealed wordmark glyph, else the falling rain, else a dark
// gap. A wordmark cell flashes bright on the frame it locks, then settles.
function fieldCell(row: number, col: Column, frame: number, fade: number): Cell {
  const target = WORDMARK[row - WORDMARK_TOP]?.[col.index];
  if (target && frame >= col.reveal) {
    return frame === col.reveal ? { char: target.char, color: HEAD } : target;
  }
  return rainAt(row, col, frame, fade) ?? { char: " ", color: FAINT };
}

// The rain at one cell: the nearest drop head above it wins (brightest glyph).
// Returns null where no stream reaches.
function rainAt(row: number, col: Column, frame: number, fade: number): Cell | null {
  if (fade >= 1) {
    return null;
  }
  // Color keys off the full tail, but the lit cutoff shrinks with the fade, so
  // the rain visibly thins as it clears.
  const fadedTail = col.tail * (1 - fade);
  let nearest: number | null = null;
  for (const start of col.starts) {
    const distance = Math.floor(start + col.speed * frame - row);
    if (distance < 0 || distance > fadedTail) {
      continue;
    }
    if (nearest === null || distance < nearest) {
      nearest = distance;
    }
  }
  if (nearest === null) {
    return null;
  }
  return {
    char: glyphAt(row, col.index, Math.floor(frame / 2)),
    color: streamColor(nearest, col.tail),
  };
}

// A rain glyph for this cell. The bucket (frames/2) holds it steady for a beat,
// so streams shimmer rather than strobe every frame.
function glyphAt(row: number, col: number, bucket: number): string {
  return RAIN[Math.floor(prng(row * 131 + col * 17 + bucket * 7 + 3) * RAIN.length)] ?? " ";
}

// A two-cell bright head, then the body fades MID → DIM → FAINT. The cutoffs
// scale with the tail so every stop shows whatever its length (see TAIL).
function streamColor(distance: number, tail: number): string {
  if (distance <= 0) return HEAD;
  if (distance === 1) return BRIGHT;
  if (distance <= tail * 0.5) return MID;
  if (distance <= tail * 0.85) return DIM;
  return FAINT;
}

// Small deterministic PRNG (splitmix-ish) mapping an integer to [0, 1).
function prng(n: number): number {
  let x = Math.imul(n ^ 0x9e3779b9, 2654435761);
  x ^= x >>> 15;
  x = Math.imul(x, 2246822519);
  x ^= x >>> 13;
  return (x >>> 0) / 4294967296;
}
