#!/bin/bash
set -eo pipefail

COZE_WORKSPACE_PATH="${COZE_WORKSPACE_PATH:-$(pwd)}"
cd "${COZE_WORKSPACE_PATH}"

PORT=5000

echo "=== Starting Next.js production server ==="
npm run start &
NEXT_PID=$!

echo "=== Installing Python dependencies ==="
pip3 install -q opencv-contrib-python flask flask-cors numpy scipy pydub 2>/dev/null || echo "Python deps warning"

echo "=== Starting Face Recognition Service (port 5001) ==="
if [ -f "${COZE_WORKSPACE_PATH}/python-face/face_api.py" ]; then
  cd "${COZE_WORKSPACE_PATH}/python-face"
  python3 face_api.py > /dev/null 2>&1 &
  cd "${COZE_WORKSPACE_PATH}"
fi

echo "=== All services started ==="
echo "Frontend: http://localhost:${PORT}"
echo "Face API: http://localhost:5001"

wait $NEXT_PID
