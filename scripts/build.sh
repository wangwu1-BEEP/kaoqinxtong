#!/bin/bash
set -eo pipefail

COZE_WORKSPACE_PATH="${COZE_WORKSPACE_PATH:-$(pwd)}"
cd "${COZE_WORKSPACE_PATH}"

echo "=== Step 1: Installing Node.js dependencies ==="
pnpm install --prefer-frozen-lockfile --prefer-offline 2>&1 | tail -5

echo "=== Step 2: Building Next.js project ==="
pnpm next build 2>&1 | tail -10

echo "=== Step 3: Bundling server with tsup ==="
pnpm tsup src/server.ts --format cjs --platform node --target node20 --outDir dist --no-splitting --no-minify 2>&1 | tail -5

echo "=== Step 4: Installing Python core dependencies ==="
if command -v python3 &>/dev/null; then
  pip3 install --quiet opencv-contrib-python-headless flask flask-cors numpy 2>&1 | tail -3 || echo "Warning: Python core deps install failed"
else
  echo "Warning: python3 not found, Python features will not work"
fi

echo "=== Build completed ==="
