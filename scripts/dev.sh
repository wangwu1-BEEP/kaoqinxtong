#!/bin/bash
set -Eeuo pipefail


PORT=5000
COZE_WORKSPACE_PATH="${COZE_WORKSPACE_PATH:-$(pwd)}"
DEPLOY_RUN_PORT=5000


cd "${COZE_WORKSPACE_PATH}"

kill_port_if_listening() {
    local pids
    pids=$(ss -H -lntp 2>/dev/null | awk -v port="${DEPLOY_RUN_PORT}" '$4 ~ ":"port"$"' | grep -o 'pid=[0-9]*' | cut -d= -f2 | paste -sd' ' - || true)
    if [[ -z "${pids}" ]]; then
      echo "Port ${DEPLOY_RUN_PORT} is free."
      return
    fi
    echo "Port ${DEPLOY_RUN_PORT} in use by PIDs: ${pids} (SIGKILL)"
    echo "${pids}" | xargs -I {} kill -9 {}
    sleep 1
    pids=$(ss -H -lntp 2>/dev/null | awk -v port="${DEPLOY_RUN_PORT}" '$4 ~ ":"port"$"' | grep -o 'pid=[0-9]*' | cut -d= -f2 | paste -sd' ' - || true)
    if [[ -n "${pids}" ]]; then
      echo "Warning: port ${DEPLOY_RUN_PORT} still busy after SIGKILL, PIDs: ${pids}"
    else
      echo "Port ${DEPLOY_RUN_PORT} cleared."
    fi
}

echo "Clearing port ${PORT} before start."
kill_port_if_listening

# 启动 Python OpenCV 人脸识别服务 (端口 5001)
FACE_API_DIR="${COZE_WORKSPACE_PATH}/python-face"
if [ -f "${FACE_API_DIR}/face_api.py" ]; then
  echo "Starting Python Face Recognition API on port 5001 (background)..."
  (cd "${FACE_API_DIR}" && FACE_API_PORT=5001 python3 face_api.py > /app/work/logs/bypass/face-api.log 2>&1 &)
fi

# 启动 Python 3D-Speaker 声纹识别服务 (端口 5002)
VOICE_API_DIR="${COZE_WORKSPACE_PATH}/python-voice"
if [ -f "${VOICE_API_DIR}/voice_api.py" ]; then
  echo "Starting Python Voice Recognition API on port 5002 (background)..."
  (cd "${VOICE_API_DIR}" && VOICE_API_PORT=5002 python3 voice_api.py > /app/work/logs/bypass/voice-api.log 2>&1 &)
fi

echo "Starting HTTP service on port ${PORT} for dev..."

PORT=$PORT pnpm tsx watch src/server.ts
