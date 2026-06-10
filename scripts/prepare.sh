#!/bin/bash
set -Eeuo pipefail

COZE_WORKSPACE_PATH="${COZE_WORKSPACE_PATH:-$(pwd)}"

cd "${COZE_WORKSPACE_PATH}"

echo "Installing dependencies..."
pnpm install --prefer-frozen-lockfile --prefer-offline --loglevel debug --reporter=append-only
if command -v coze > /dev/null 2>&1 && coze check-bins --help > /dev/null 2>&1; then
  coze check-bins --fix
fi

# 安装 Python 依赖
echo "Installing Python dependencies..."
pip3 install -q opencv-contrib-python flask flask-cors numpy scipy pydub 2>/dev/null || echo "Warning: Python dependencies install failed, face/voice API may not work"
