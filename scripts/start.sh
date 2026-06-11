#!/bin/bash
set -eo pipefail

COZE_WORKSPACE_PATH="${COZE_WORKSPACE_PATH:-$(pwd)}"
cd "${COZE_WORKSPACE_PATH}"

# Start Next.js production server on port 5000
echo "=== Starting Next.js production server ==="
PORT=5000 pnpm start &

# Start Python services in background
echo "=== Starting Python services ==="

# Install Python dependencies if needed
if command -v python3 &>/dev/null; then
  python3 -c "import cv2; from cv2.face import LBPHFaceRecognizer_create" 2>/dev/null || {
    echo "Installing Python dependencies..."
    pip3 install -q opencv-contrib-python flask flask-cors numpy scipy pydub 2>/dev/null || echo "Warning: Python dependencies install failed"
  }

  # Start face recognition service (port 5001)
  if [ -f "${COZE_WORKSPACE_PATH}/python-face/face_api.py" ]; then
    python3 "${COZE_WORKSPACE_PATH}/python-face/face_api.py" > /app/work/logs/bypass/face-api.log 2>&1 &
    echo "Face recognition service started on port 5001"
  fi

  # Start voice recognition service (port 5002)
  if [ -f "${COZE_WORKSPACE_PATH}/python-voice/voice_api.py" ]; then
    python3 "${COZE_WORKSPACE_PATH}/python-voice/voice_api.py" > /app/work/logs/bypass/voice-api.log 2>&1 &
    echo "Voice recognition service started on port 5002"
  fi
fi

# Wait for all background processes
wait
