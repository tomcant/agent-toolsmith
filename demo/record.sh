#!/usr/bin/env bash

set -euo pipefail

root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$root"

for cmd in vhs gifsicle; do
  if ! command -v "$cmd" >/dev/null; then
    echo "$cmd not found" >&2
    exit 1
  fi
done

if [[ -z "${ANTHROPIC_API_KEY:-}" && -z "${OPENAI_API_KEY:-}" ]]; then
  echo "set ANTHROPIC_API_KEY or OPENAI_API_KEY" >&2
  exit 1
fi

bun run build

rm -rf demo/.home
mkdir -p demo/.home/.agent-toolsmith/tools

HOME="$root/demo/.home" vhs demo/demo.tape

# A terminal recording is mostly unchanged pixels, but the spinner animates for
# as long as the model is thinking, which defeats interframe compression. Lossy
# quantisation is what keeps the file small.
gifsicle -O3 --lossy=120 --colors 128 -b demo/demo.gif

echo "demo/demo.gif — $(du -h demo/demo.gif | cut -f1)"
