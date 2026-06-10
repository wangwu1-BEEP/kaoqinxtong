#!/usr/bin/env python3
"""
人脸识别服务 - 每用户独立LBPH模型方案

核心设计：
1. 注册时：为每个用户创建独立的LBPH模型，训练该用户的人脸图片
2. 注册唯一性检查：用所有已有用户的LBPH模型预测新图片，如果任何模型confidence低于阈值，说明此人已注册
3. 验证(打卡)时：只加载当前用户的LBPH模型做predict，confidence低于阈值则通过
   - 纯1:1验证，不涉及任何其他用户
4. 人脸检测：OpenCV DNN SSD + Haar Cascade回退
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
import cv2
import numpy as np
import base64
import os
import json
import logging
import sys

app = Flask(__name__)
CORS(app)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# ====== 配置 ======
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
FACE_DATA_DIR = os.environ.get('FACE_DATA_DIR', os.path.join(BASE_DIR, 'face_data'))
MODELS_DIR = os.path.join(FACE_DATA_DIR, 'models')
META_FILE = os.path.join(FACE_DATA_DIR, 'meta.json')

# LBPH参数
LBPH_RADIUS = 1
LBPH_NEIGHBORS = 8
LBPH_GRID_X = 8
LBPH_GRID_Y = 8

# 阈值配置（从环境变量读取，默认值）
VERIFY_THRESHOLD = float(os.environ.get('VERIFY_THRESHOLD', '50.0'))      # 验证阈值
UNIQUENESS_THRESHOLD = float(os.environ.get('UNIQUENESS_THRESHOLD', '35.0'))  # 唯一性检查阈值
FACE_SIZE = 150             # 统一人脸裁剪尺寸
MIN_SAMPLES = 3             # 注册最少需要3次有效人脸采样

# 创建目录
os.makedirs(MODELS_DIR, exist_ok=True)

# ====== DNN人脸检测模型 ======
face_net = None
haar_cascade = None

def load_detection_models():
    """加载人脸检测模型"""
    global face_net, haar_cascade
    try:
        caffemodel = os.path.join(BASE_DIR, 'models', 'res10_300x300_ssd_iter_140000.caffemodel')
        prototxt = os.path.join(BASE_DIR, 'models', 'deploy.prototxt')
        if os.path.exists(caffemodel) and os.path.exists(prototxt):
            face_net = cv2.dnn.readNetFromCaffe(prototxt, caffemodel)
            logger.info("DNN SSD人脸检测模型加载成功")
        else:
            logger.warning(f"DNN模型文件不存在: {caffemodel}")
    except Exception as e:
        logger.error(f"DNN模型加载失败: {e}")
    
    try:
        haar_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_frontalface_default.xml')
        if haar_cascade.empty():
            haar_cascade = None
            logger.warning("Haar Cascade加载失败")
        else:
            logger.info("Haar Cascade加载成功")
    except Exception as e:
        logger.error(f"Haar Cascade加载失败: {e}")

def decode_image(image_data):
    """解码base64图像"""
    try:
        if ',' in image_data:
            image_data = image_data.split(',')[1]
        img_bytes = base64.b64decode(image_data)
        nparr = np.frombuffer(img_bytes, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        return img
    except Exception as e:
        logger.error(f"图像解码失败: {e}")
        return None

def detect_face(img):
    """检测人脸并返回裁剪的灰度人脸图像，如果检测不到返回None"""
    if img is None:
        return None
    
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    h, w = gray.shape[:2]
    
    # 方法1: DNN SSD
    if face_net is not None:
        try:
            blob = cv2.dnn.blobFromImage(img, 1.0, (300, 300), (104.0, 177.0, 123.0))
            face_net.setInput(blob)
            detections = face_net.forward()
            
            best_conf = 0
            best_box = None
            for i in range(detections.shape[2]):
                conf = detections[0, 0, i, 2]
                if conf > best_conf:
                    best_conf = conf
                    box = detections[0, 0, i, 3:7] * np.array([w, h, w, h])
                    best_box = box.astype(int)
            
            if best_box is not None and best_conf > 0.5:
                x1, y1, x2, y2 = best_box
                # 扩大裁剪范围10%
                pad_x = int((x2 - x1) * 0.1)
                pad_y = int((y2 - y1) * 0.1)
                x1 = max(0, x1 - pad_x)
                y1 = max(0, y1 - pad_y)
                x2 = min(w, x2 + pad_x)
                y2 = min(h, y2 + pad_y)
                face = gray[y1:y2, x1:x2]
                if face.size > 0:
                    return cv2.resize(face, (FACE_SIZE, FACE_SIZE))
        except Exception as e:
            logger.error(f"DNN检测失败: {e}")
    
    # 方法2: Haar Cascade回退
    if haar_cascade is not None:
        try:
            faces = haar_cascade.detectMultiScale(gray, scaleFactor=1.1, minNeighbors=5, minSize=(30, 30))
            if len(faces) > 0:
                # 选择最大的人脸
                areas = [w * h for (x, y, w, h) in faces]
                idx = np.argmax(areas)
                x, y, fw, fh = faces[idx]
                # 扩大裁剪范围
                pad_x = int(fw * 0.1)
                pad_y = int(fh * 0.1)
                x1 = max(0, x - pad_x)
                y1 = max(0, y - pad_y)
                x2 = min(gray.shape[1], x + fw + pad_x)
                y2 = min(gray.shape[0], y + fh + pad_y)
                face = gray[y1:y2, x1:x2]
                if face.size > 0:
                    return cv2.resize(face, (FACE_SIZE, FACE_SIZE))
        except Exception as e:
            logger.error(f"Haar检测失败: {e}")
    
    return None

# ====== 元数据管理 ======
def load_meta():
    """加载注册元数据"""
    if os.path.exists(META_FILE):
        try:
            with open(META_FILE, 'r') as f:
                return json.load(f)
        except:
            pass
    return {}

def save_meta(meta):
    """保存注册元数据"""
    os.makedirs(os.path.dirname(META_FILE), exist_ok=True)
    with open(META_FILE, 'w') as f:
        json.dump(meta, f, ensure_ascii=False, indent=2)

# ====== LBPH模型管理（每用户独立） ======
def get_model_path(user_id):
    """获取用户模型文件路径"""
    safe_id = user_id.replace('/', '_').replace('\\', '_')
    return os.path.join(MODELS_DIR, f'{safe_id}.yml')

def get_user_model(user_id):
    """加载用户的独立LBPH模型"""
    model_path = get_model_path(user_id)
    if os.path.exists(model_path):
        model = cv2.face.LBPHFaceRecognizer_create(
            radius=LBPH_RADIUS, neighbors=LBPH_NEIGHBORS,
            grid_x=LBPH_GRID_X, grid_y=LBPH_GRID_Y
        )
        try:
            model.read(model_path)
            return model
        except Exception as e:
            logger.error(f"加载用户模型失败 {user_id}: {e}")
    return None

def train_user_model(user_id, face_images):
    """为用户训练独立的LBPH模型并保存"""
    model = cv2.face.LBPHFaceRecognizer_create(
        radius=LBPH_RADIUS, neighbors=LBPH_NEIGHBORS,
        grid_x=LBPH_GRID_X, grid_y=LBPH_GRID_Y
    )
    labels = np.array([0] * len(face_images), dtype=np.int32)
    model.train(face_images, labels)
    
    model_path = get_model_path(user_id)
    model.save(model_path)
    logger.info(f"用户 {user_id} 的LBPH模型训练完成并保存")
    return model

def check_uniqueness(face_image):
    """
    检查人脸唯一性：用所有已注册用户的模型预测新图片
    如果任何已有模型预测confidence < UNIQUENESS_THRESHOLD，说明此人已注册
    返回: (is_unique: bool, matched_user: str or None, matched_name: str or None)
    """
    meta = load_meta()
    if not meta:
        return True, None, None
    
    for user_id, user_info in meta.items():
        model = get_user_model(user_id)
        if model is None:
            continue
        
        try:
            label, confidence = model.predict(face_image)
            logger.info(f"唯一性检查: 与用户 {user_id}({user_info.get('name','')}) 的confidence={confidence:.2f}, label={label}")
            if confidence < UNIQUENESS_THRESHOLD:
                logger.info(f"唯一性检查不通过! confidence={confidence:.2f} < {UNIQUENESS_THRESHOLD}, 该人脸已被 {user_info.get('name', user_id)} 注册")
                return False, user_id, user_info.get('name', user_id)
        except Exception as e:
            logger.error(f"唯一性检查预测失败 {user_id}: {e}")
            continue
    
    return True, None, None

# ====== API路由 ======

@app.route('/api/face/health', methods=['GET'])
def health():
    meta = load_meta()
    return jsonify({
        'status': 'ok',
        'recognizer': 'LBPH per-user (OpenCV)',
        'opencv_version': cv2.__version__,
        'registered_users': len(meta),
        'verify_threshold': VERIFY_THRESHOLD,
        'uniqueness_threshold': UNIQUENESS_THRESHOLD,
        'detection': 'DNN SSD + Haar Cascade',
        'model_loaded': face_net is not None
    })

@app.route('/api/face/detect', methods=['POST'])
def detect():
    """人脸检测API"""
    data = request.get_json() or {}
    image_data = data.get('image', '')
    
    img = decode_image(image_data)
    if img is None:
        return jsonify({'success': False, 'error': '无法解码图像'})
    
    face = detect_face(img)
    if face is None:
        return jsonify({'success': False, 'error': '未检测到人脸，请正面对着摄像头'})
    
    return jsonify({
        'success': True,
        'message': '检测到人脸',
        'faceDetected': True
    })

@app.route('/api/face/register', methods=['POST'])
def register():
    """
    人脸注册API
    1. 检测所有图片中的人脸
    2. 检查唯一性（该人脸是否已被他人注册）
    3. 为该用户训练独立LBPH模型
    """
    data = request.get_json() or {}
    user_id = data.get('userId', '')
    username = data.get('username', '')
    name = data.get('name', username)
    images = data.get('images', [])
    
    if not user_id:
        return jsonify({'success': False, 'error': '缺少用户ID'})
    
    # 步骤0: 检查该用户是否已经注册过
    meta = load_meta()
    if user_id in meta:
        logger.info(f"用户 {user_id} 尝试重复注册")
        return jsonify({
            'success': False,
            'error': '您已经注册过人脸，请直接使用人脸打卡',
            'already_registered': True,
            'name': meta[user_id].get('name', '')
        })
    
    if len(images) < MIN_SAMPLES:
        return jsonify({'success': False, 'error': f'至少需要{MIN_SAMPLES}张人脸图片'})
    
    # 步骤1: 检测人脸
    face_images = []
    for i, img_data in enumerate(images):
        img = decode_image(img_data)
        if img is None:
            continue
        face = detect_face(img)
        if face is not None:
            face_images.append(face)
    
    if len(face_images) < MIN_SAMPLES:
        return jsonify({
            'success': False,
            'error': f'有效人脸采样不足(需要至少{MIN_SAMPLES}次, 实际{len(face_images)}次), 请保持正面对着摄像头'
        })
    
    # 步骤2: 检查唯一性
    # 用每个已注册用户的模型预测第一张人脸图片
    is_unique, matched_id, matched_name = check_uniqueness(face_images[0])
    logger.info(f"唯一性检查结果: is_unique={is_unique}, matched_id={matched_id}, matched_name={matched_name}, 当前注册用户={user_id}")
    
    if not is_unique:
        # 但如果是同一个用户重新注册（更新），允许
        if matched_id == user_id:
            logger.info(f"用户 {user_id} 更新人脸注册")
        else:
            logger.info(f"拒绝注册! 该人脸已被 {matched_name}({matched_id}) 注册")
            return jsonify({
                'success': False,
                'error': f'该人脸已被用户「{matched_name}」注册，每人只能注册一个账号',
                'duplicate': True,
                'matchedUser': matched_name
            })
    
    # 步骤3: 训练该用户的独立LBPH模型
    try:
        train_user_model(user_id, face_images)
    except Exception as e:
        logger.error(f"训练模型失败: {e}")
        return jsonify({'success': False, 'error': f'人脸模型训练失败: {str(e)}'})
    
    # 保存元数据
    meta = load_meta()
    meta[user_id] = {
        'username': username,
        'name': name,
        'sampleCount': len(face_images),
        'registeredAt': str(np.datetime64('now'))
    }
    save_meta(meta)
    
    logger.info(f"用户 {user_id}({name}) 注册成功，{len(face_images)}张人脸采样")
    return jsonify({
        'success': True,
        'message': '人脸注册成功',
        'sampleCount': len(face_images)
    })

@app.route('/api/face/verify', methods=['POST'])
def verify():
    """
    人脸验证API - 严格1:1验证
    
    只加载当前用户的LBPH模型，预测打卡图片的confidence。
    confidence < VERIFY_THRESHOLD → 验证通过
    confidence >= VERIFY_THRESHOLD → 验证失败
    
    不涉及任何其他用户的模型或数据。
    """
    data = request.get_json() or {}
    user_id = data.get('userId', '')
    image_data = data.get('image', '')
    
    if not user_id:
        return jsonify({'success': False, 'error': '缺少用户ID'})
    
    if not image_data:
        return jsonify({'success': False, 'error': '缺少人脸图片'})
    
    # 步骤1: 检测人脸
    img = decode_image(image_data)
    if img is None:
        return jsonify({'success': False, 'error': '无法解码图像'})
    
    face = detect_face(img)
    if face is None:
        return jsonify({'success': False, 'error': '未检测到人脸，请正面对着摄像头'})
    
    # 步骤2: 加载该用户的LBPH模型
    model = get_user_model(user_id)
    if model is None:
        meta = load_meta()
        if user_id not in meta:
            return jsonify({'success': False, 'error': '您尚未注册人脸，请先注册'})
        else:
            return jsonify({'success': False, 'error': '人脸模型加载失败，请重新注册'})
    
    # 步骤3: 1:1验证 - 只用该用户的模型预测
    try:
        label, confidence = model.predict(face)
    except Exception as e:
        logger.error(f"预测失败: {e}")
        return jsonify({'success': False, 'error': '人脸验证预测失败'})
    
    logger.info(f"1:1验证: 用户={user_id}, confidence={confidence:.2f}, 阈值={VERIFY_THRESHOLD}")
    
    # 判定结果
    verified = confidence < VERIFY_THRESHOLD
    
    if verified:
        return jsonify({
            'success': True,
            'verified': True,
            'confidence': round(float(confidence), 2),
            'message': '人脸验证通过',
            'threshold': VERIFY_THRESHOLD
        })
    else:
        return jsonify({
            'success': True,
            'verified': False,
            'confidence': round(float(confidence), 2),
            'message': f'人脸验证失败，与注册人脸不匹配(confidence={confidence:.1f}, 需要<{VERIFY_THRESHOLD})',
            'threshold': VERIFY_THRESHOLD
        })

@app.route('/api/face/check-registration', methods=['POST'])
def check_registration():
    """检查用户是否已注册人脸"""
    data = request.get_json() or {}
    user_id = data.get('userId', '')
    
    if not user_id:
        return jsonify({'registered': False})
    
    meta = load_meta()
    model = get_user_model(user_id)
    
    if user_id in meta and model is not None:
        return jsonify({
            'registered': True,
            'name': meta[user_id].get('name', ''),
            'sampleCount': meta[user_id].get('sampleCount', 0)
        })
    
    return jsonify({'registered': False})

@app.route('/api/face/delete', methods=['POST'])
def delete_user():
    """删除用户的注册数据"""
    data = request.get_json() or {}
    user_id = data.get('userId', '')
    
    if not user_id:
        return jsonify({'success': False, 'error': '缺少用户ID'})
    
    # 删除模型文件
    model_path = get_model_path(user_id)
    if os.path.exists(model_path):
        os.remove(model_path)
    
    # 删除元数据
    meta = load_meta()
    if user_id in meta:
        del meta[user_id]
        save_meta(meta)
    
    return jsonify({'success': True, 'message': '用户数据已删除'})

# ====== 启动 ======
if __name__ == '__main__':
    load_detection_models()
    
    logger.info("="*50)
    logger.info("人脸识别服务启动")
    logger.info(f"OpenCV版本: {cv2.__version__}")
    logger.info(f"DNN检测: {'已加载' if face_net else '未加载'}")
    logger.info(f"Haar检测: {'已加载' if haar_cascade else '未加载'}")
    logger.info(f"验证阈值: {VERIFY_THRESHOLD}")
    logger.info(f"唯一性阈值: {UNIQUENESS_THRESHOLD}")
    logger.info(f"数据目录: {FACE_DATA_DIR}")
    logger.info("="*50)
    
    app.run(host='0.0.0.0', port=5001, debug=False)
