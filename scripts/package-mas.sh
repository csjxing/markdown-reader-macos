#!/usr/bin/env bash
set -euo pipefail
PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$PROJECT_DIR"
BUILD_NUMBER="${BUILD_NUMBER:-$(node -p "require('./electron-builder.json').buildVersion")}"
OUTPUT_DIR="${OUTPUT_DIR:-$PROJECT_DIR/releases/mas-$BUILD_NUMBER}"
if [[ -e "$OUTPUT_DIR" ]]; then
  echo "Output already exists; choose a new OUTPUT_DIR: $OUTPUT_DIR" >&2
  exit 1
fi
MAS_ARCH="${MAS_ARCH:-arm64}"
case "$MAS_ARCH" in arm64|x64|universal) ;; *) echo "Unsupported MAS_ARCH: $MAS_ARCH" >&2; exit 1;; esac
npm run typecheck
npm test
npm run build
npx electron-builder --mac mas "--$MAS_ARCH" "--config.buildVersion=$BUILD_NUMBER" "--config.directories.output=$OUTPUT_DIR"
