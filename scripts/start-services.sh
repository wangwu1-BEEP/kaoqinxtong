#!/bin/bash
# 智能考勤系统 - 服务启动脚本
# 自动安装依赖并启动人脸识别服务

set -e

PROJECT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
FACE_API_DIR="$PROJECT_DIR/python-face"
FACE_PORT=5001
FACE_LOG="$PROJECT_DIR/logs/face-api.log"

# 创建日志目录
mkdir -p "$PROJECT_DIR/logs"

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log() {
    echo -e "${GREEN}[$(date '+%H:%M:%S')]${NC} $1"
}

warn() {
    echo -e "${YELLOW}[$(date '+%H:%M:%S')] WARNING:${NC} $1"
}

error() {
    echo -e "${RED}[$(date '+%H:%M:%S')] ERROR:${NC} $1"
}

# 检查并安装系统依赖
check_system_deps() {
    log "检查系统依赖..."
    
    # 安装 libgl1（OpenCV 需要）
    if ! dpkg -l | grep -q libgl1; then
        log "安装 libgl1..."
        apt-get update -qq || true
        apt-get install -y libgl1 libglib2.0-0 2>/dev/null || true
    fi
    
    # 安装 ffmpeg（音频处理需要）
    if ! command -v ffprobe &> /dev/null; then
        log "安装 ffmpeg..."
        apt-get install -y ffmpeg 2>/dev/null || true
    fi
}

# 安装 Python 依赖
install_python_deps() {
    log "安装 Python 依赖..."
    
    # 安装 opencv-contrib-python 完整版（包含 face 模块）
    pip3 install flask flask-cors opencv-contrib-python scipy numpy --quiet 2>/dev/null || {
        warn "opencv-contrib-python 安装失败，尝试 opencv-python-headless..."
        pip3 install flask flask-cors opencv-python-headless scipy numpy --quiet
    }
    
    # 验证 cv2 模块
    if python3 -c "import cv2; print('OpenCV version:', cv2.__version__)" 2>/dev/null; then
        log "OpenCV 安装成功"
    else
        error "OpenCV 安装失败"
        exit 1
    fi
    
    # 验证 face 模块
    if python3 -c "import cv2; assert hasattr(cv2, 'face'), 'cv2.face missing'" 2>/dev/null; then
        log "cv2.face 模块可用（LBPH）"
    else
        warn "cv2.face 模块不可用，将使用备用方案"
    fi
    
    # 下载 Haar Cascade 模型（如果缺失）
    if [ ! -f "$FACE_API_DIR/models/haarcascade_frontalface_default.xml" ]; then
        log "下载 Haar Cascade 模型..."
        curl -s -o "$FACE_API_DIR/models/haarcascade_frontalface_default.xml" \
            "https://raw.githubusercontent.com/opencv/opencv/master/data/haarcascades/haarcascade_frontalface_default.xml" || true
    fi
}

# 停止现有服务
stop_services() {
    log "停止现有服务..."
    pkill -f "face_api.py" 2>/dev/null || true
    sleep 1
}

# 启动人脸识别服务
start_face_service() {
    log "启动人脸识别服务（端口 $FACE_PORT）..."
    
    cd "$FACE_API_DIR"
    FACE_API_PORT=$FACE_PORT nohup python3 face_api.py > "$FACE_LOG" 2>&1 &
    
    sleep 3
    
    # 检查服务是否启动成功
    if curl -s "http://localhost:$FACE_PORT/api/face/health" | grep -q "status"; then
        log "人脸识别服务启动成功"
        curl -s "http://localhost:$FACE_PORT/api/face/health" | python3 -c "import sys,json; d=json.load(sys.stdin); print(f'  - 已注册用户: {d.get(\"registered_users\",0)}')" 2>/dev/null || true
    else
        error "人脸识别服务启动失败，请检查日志: $FACE_LOG"
        cat "$FACE_LOG" | tail -20
        exit 1
    fi
}

# 检查服务状态
check_status() {
    log "检查服务状态..."
    
    if curl -s "http://localhost:$FACE_PORT/api/face/health" | grep -q "status"; then
        log "人脸识别服务: 运行中"
        curl -s "http://localhost:$FACE_PORT/api/face/health" | python3 -c "import sys,json; d=json.load(sys.stdin); print(f'  版本: {d.get(\"opencv_version\",\"?\")}'); print(f'  用户: {d.get(\"registered_users\",0)}'); print(f'  检测: {d.get(\"detection\",\"?\")}')" 2>/dev/null || true
    else
        error "人脸识别服务: 未运行"
    fi
    
    if curl -s "http://localhost:5000" -o /dev/null -w "%{http_code}" | grep -q "200"; then
        log "前端服务: 运行中 (端口 5000)"
    else
        warn "前端服务: 可能未运行"
    fi
}

# 主逻辑
case "${1:-start}" in
    start)
        check_system_deps
        install_python_deps
        stop_services
        start_face_service
        log "所有服务启动完成"
        ;;
    restart)
        stop_services
        sleep 2
        install_python_deps
        start_face_service
        log "服务重启完成"
        ;;
    stop)
        stop_services
        log "服务已停止"
        ;;
    status)
        check_status
        ;;
    *)
        echo "用法: $0 {start|restart|stop|status}"
        exit 1
        ;;
esac
