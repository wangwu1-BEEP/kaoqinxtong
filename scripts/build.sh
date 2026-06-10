#!/bin/bash
set -eo pipefail

COZE_WORKSPACE_PATH="${COZE_WORKSPACE_PATH:-$(pwd)}"
cd "${COZE_WORKSPACE_PATH}"

echo "=== Step 1: Installing Node.js dependencies ==="
npm install --legacy-peer-deps 2>&1 | tail -5

echo "=== Step 2: Building Next.js project ==="
npm run build 2>&1 | tail -10

echo "=== Step 3: Installing Python core dependencies ==="
if command -v python3 &>/dev/null; then
  pip3 install --quiet opencv-contrib-python flask flask-cors numpy scipy pydub 2>&1 | tail -3 || echo "Warning: Python deps install"
else
  echo "Warning: python3 not found"
fi

echo "=== Build completed ==="
