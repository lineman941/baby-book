#!/usr/bin/env bash
#
# apply-config.sh — install the tailored Desktop Commander config on this machine.
#
# Desktop Commander reads its settings from ~/.claude-server-commander/config.json
# on macOS/Linux (and %USERPROFILE%\.claude-server-commander\config.json on Windows).
# This script copies config.json (next to it) into that location, backing up any
# existing config first.
#
# Usage:  ./apply-config.sh
#
set -euo pipefail

SRC="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/config.json"
DEST_DIR="${HOME}/.claude-server-commander"
DEST="${DEST_DIR}/config.json"

if [ ! -f "$SRC" ]; then
  echo "error: config.json not found next to this script ($SRC)" >&2
  exit 1
fi

mkdir -p "$DEST_DIR"

if [ -f "$DEST" ]; then
  BACKUP="${DEST}.bak.$(date +%Y%m%d%H%M%S)"
  cp "$DEST" "$BACKUP"
  echo "backed up existing config -> $BACKUP"
fi

cp "$SRC" "$DEST"
echo "installed tailored config -> $DEST"
echo
echo "Restart Desktop Commander (or reload the plugin) so it picks up the new settings."
