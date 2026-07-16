import { writeSync } from "node:fs";

type ColorScheme = "light" | "dark";

let current: ColorScheme = "dark";

export async function initColorScheme() {
  current = await detectColorScheme();
}

export function isLightScheme() {
  return current === "light";
}

// biome-ignore lint/suspicious/noControlCharactersInRegex: matching a terminal escape sequence
const OSC_11_RESPONSE = /\x1b\]11;rgb:([0-9a-f]+)\/([0-9a-f]+)\/([0-9a-f]+)/i;
// biome-ignore lint/suspicious/noControlCharactersInRegex: matching a terminal escape sequence
const DA1_RESPONSE = /\x1b\[\?[0-9;]*c/;

/*
 * Query the terminal's background color via OSC 11 and classify it light or dark.
 *
 * There's no way to know if or when an OSC 11 reply is coming, so we send a DA1
 * query right after as a sentinel — a query virtually every terminal answers,
 * even ones that ignore OSC 11. Replies come back in order, so seeing the DA1
 * reply means the OSC 11 reply has either arrived or it won't. Without it we'd
 * give up on a timeout, and a reply arriving after that would land on stdin
 * once the UI is reading it and be misread as the user typing.
 *
 * Falls back to dark if the terminal answers neither query.
 */
function detectColorScheme(): Promise<ColorScheme> {
  // Need stdout to send queries and stdin to read replies on the terminal.
  if (!process.stdout.isTTY || !process.stdin.isTTY) {
    return Promise.resolve("dark");
  }

  return new Promise<ColorScheme>((resolve) => {
    const timeout = setTimeout(() => {
      restore();
      resolve("dark");
    }, 200);

    let response = "";

    function onData(data: Buffer) {
      response += data.toString();
      if (!DA1_RESPONSE.test(response)) return;

      restore();
      resolve(classify(response));
    }

    function restore() {
      clearTimeout(timeout);
      process.stdin.off("data", onData);
      process.stdin.setRawMode(false);
      process.stdin.pause();
    }

    process.stdin.setRawMode(true);
    process.stdin.resume();
    process.stdin.on("data", onData);
    writeSync(process.stdout.fd, "\x1b]11;?\x07\x1b[c");
  });
}

function classify(response: string): ColorScheme {
  const match = response.match(OSC_11_RESPONSE);
  if (!match) return "dark";

  const [, rHex, gHex, bHex] = match;
  if (!rHex || !gHex || !bHex) return "dark";

  const r = normaliseChannel(rHex);
  const g = normaliseChannel(gHex);
  const b = normaliseChannel(bHex);

  // Perceived brightness (ITU-R BT.601 luma), weighting green highest and
  // blue lowest to match the eye's sensitivity, in the channels' 0–1 range.
  const luminance = 0.299 * r + 0.587 * g + 0.114 * b;

  return luminance > 0.5 ? "light" : "dark";
}

// Each channel is scaled to 16^n - 1 for its digit count n, so normalise by
// that maximum rather than assuming a fixed width (replies range 1–4 digits).
function normaliseChannel(hex: string): number {
  return parseInt(hex, 16) / (16 ** hex.length - 1);
}
