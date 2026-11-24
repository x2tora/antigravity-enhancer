#!/usr/bin/env sh
# Antigravity Enhancer - macOS & Linux CLI Installer Entrypoint
set -e

SCRIPT_DIR="$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)"
CLI_SCRIPT="$SCRIPT_DIR/installer/install.mjs"

if command -v node >/dev/null 2>&1; then
  exec node "$CLI_SCRIPT" "$@"
fi

for ELECTRON_BIN in \
  "/Applications/Antigravity.app/Contents/MacOS/Antigravity" \
  "$HOME/Applications/Antigravity.app/Contents/MacOS/Antigravity" \
  "/opt/Antigravity/antigravity" \
  "/opt/antigravity/antigravity" \
  "/usr/lib/antigravity/antigravity"
do
  if [ -x "$ELECTRON_BIN" ]; then
    ELECTRON_RUN_AS_NODE=1 exec "$ELECTRON_BIN" "$CLI_SCRIPT" "$@"
  fi
done

echo "[ERROR] Node.js or Antigravity binary not found. Install Node.js 18+ or pass --app-dir." >&2
exit 1
