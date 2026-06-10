#!/usr/bin/env python3
"""
将本地人脸数据迁移到 Supabase 数据库
"""
import json
import os
import sys
import subprocess
import urllib.request
import urllib.parse

# Supabase 配置
SUPABASE_URL = "https://thyqqimknhevdoppziij.supabase.co"
API_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRoeXFxaW1rbmhldmRvcHB6aWlqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDU1MTk1MDYsImV4cCI6MjA2MTA5NTUwNn0.XIxiVQ2LZvY8iYL4eAQwMVsS4AQ6bG1H1T6bO4pP7k8"

def query_supabase(table, params=""):
    """查询 Supabase"""
    url = f"{SUPABASE_URL}/rest/v1/{table}?{params}"
    req = urllib.request.Request(url)
    req.add_header("apikey", API_KEY)
    req.add_header("Authorization", f"Bearer {API_KEY}")
    try:
        with urllib.request.urlopen(req, timeout=10) as response:
            return json.loads(response.read().decode())
    except Exception as e:
        print(f"查询失败: {e}")
        return []

def upsert_supabase(table, data):
    """插入/更新 Supabase 数据"""
    url = f"{SUPABASE_URL}/rest/v1/{table}"
    req = urllib.request.Request(url, data=json.dumps(data).encode(), method="POST")
    req.add_header("apikey", API_KEY)
    req.add_header("Authorization", f"Bearer {API_KEY}")
    req.add_header("Content-Type", "application/json")
    req.add_header("Prefer", "resolution=merge-duplicates")
    try:
        with urllib.request.urlopen(req, timeout=10) as response:
            return True
    except Exception as e:
        print(f"插入失败: {e}")
        return False

def migrate_face_data():
    """迁移人脸数据"""
    data_dir = "/workspace/projects/projects/python-face/face_data"
    meta_file = os.path.join(data_dir, "meta.json")
    models_dir = os.path.join(data_dir, "models")
    
    if not os.path.exists(meta_file):
        print("错误: meta.json 不存在")
        return
    
    with open(meta_file, 'r', encoding='utf-8') as f:
        meta = json.load(f)
    
    print(f"开始迁移 {len(meta)} 个用户的人脸数据...")
    
    success_count = 0
    for user_id, info in meta.items():
        # 构建人脸嵌入数据
        embedding_data = {
            "id": f"face-{user_id}",
            "user_id": user_id,
            "username": info.get("username", ""),
            "model_type": "lbph",
            "face_size": info.get("face_size", 150),
            "sample_count": info.get("sample_count", 0),
            "created_at": info.get("created_at", ""),
            "updated_at": info.get("updated_at", "")
        }
        
        # 从本地模型文件读取嵌入数据
        model_file = os.path.join(models_dir, f"{user_id}.yml")
        if os.path.exists(model_file):
            embedding_data["model_file"] = model_file
        
        if upsert_supabase("face_embeddings", embedding_data):
            success_count += 1
            print(f"✓ 迁移用户: {info.get('username', '')} ({user_id})")
        else:
            print(f"✗ 迁移失败: {user_id}")
    
    print(f"\n迁移完成: {success_count}/{len(meta)} 个用户")

def migrate_config():
    """迁移配置"""
    configs = [
        {"key": "face_verify_threshold", "value": "50", "description": "人脸验证阈值"},
        {"key": "face_unique_threshold", "value": "35", "description": "人脸唯一性阈值"},
        {"key": "face_model_type", "value": "lbph", "description": "人脸识别模型类型"}
    ]
    
    print("\n迁移配置...")
    for config in configs:
        upsert_supabase("app_config", config)
        print(f"✓ {config['key']} = {config['value']}")

if __name__ == "__main__":
    print("=" * 50)
    print("人脸数据迁移工具")
    print("=" * 50)
    
    migrate_face_data()
    migrate_config()
    
    print("\n" + "=" * 50)
    print("迁移完成!")
    print("=" * 50)
