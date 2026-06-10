#!/usr/bin/env python3
"""
人脸数据迁移脚本
将本地人脸数据迁移到 Supabase 数据库
"""

import json
import os
import sys

# 添加项目路径
sys.path.insert(0, '/workspace/projects/projects')

from supabase import create_client, Client

SUPABASE_URL = "https://thyqqimknhevdoppziij.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRoeXFxaW1rbmhldmRvcHB6aWlqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDU1MTk1MDYsImV4cCI6MjA2MTA5NTUwNn0.XIxiVQ2LZvY8iYL4eAQwMVsS4AQ6bG1H1T6bO4pP7k8"

def migrate_face_data():
    """迁移人脸数据到数据库"""
    print("连接 Supabase...")
    supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
    
    # 读取本地数据
    meta_path = '/workspace/projects/projects/python-face/face_data/meta.json'
    models_dir = '/workspace/projects/projects/python-face/face_data/models'
    
    if not os.path.exists(meta_path):
        print("❌ 本地数据不存在")
        return
    
    with open(meta_path, 'r', encoding='utf-8') as f:
        meta = json.load(f)
    
    print(f"找到 {len(meta)} 个用户数据")
    
    # 迁移每个用户
    migrated = 0
    for user_id, user_data in meta.items():
        model_path = os.path.join(models_dir, f"{user_id}.yml")
        
        if not os.path.exists(model_path):
            print(f"⚠️ 模型文件不存在: {user_id}")
            continue
        
        # 读取模型数据
        with open(model_path, 'r', encoding='utf-8') as f:
            model_content = f.read()
        
        # 存储到数据库
        data = {
            'id': user_id,
            'user_id': user_id,
            'username': user_data.get('name', ''),
            'embedding': {'yaml': model_content},
            'model_type': 'lbph',
            'face_size': 150,
            'sample_count': user_data.get('sampleCount', 5)
        }
        
        try:
            # 检查是否已存在
            existing = supabase.table('face_embeddings').select('id').eq('id', user_id).execute()
            if existing.data:
                supabase.table('face_embeddings').update(data).eq('id', user_id).execute()
                print(f"✅ 更新: {user_data.get('name')} ({user_id})")
            else:
                supabase.table('face_embeddings').insert(data).execute()
                print(f"✅ 新增: {user_data.get('name')} ({user_id})")
            migrated += 1
        except Exception as e:
            print(f"❌ 失败: {user_id} - {e}")
    
    print(f"\n迁移完成: {migrated}/{len(meta)} 个用户")
    
    # 保存配置
    config_data = [
        {'key': 'face_verify_threshold', 'value': '50', 'description': '人脸验证阈值'},
        {'key': 'face_unique_threshold', 'value': '35', 'description': '人脸唯一性阈值'},
        {'key': 'face_model_type', 'value': 'lbph', 'description': '人脸识别模型类型'}
    ]
    
    for config in config_data:
        supabase.table('app_config').upsert(config, on_conflict='key').execute()
    
    print("✅ 配置已保存到数据库")

def update_face_api_for_cloud():
    """更新 face_api.py 支持云端数据"""
    print("\n更新 face_api.py 支持云端数据...")
    
    # 读取现有代码
    with open('/workspace/projects/projects/python-face/face_api.py', 'r', encoding='utf-8') as f:
        content = f.read()
    
    # 添加云端支持（这需要较大的代码改动）
    # 暂时标记为待完成
    print("⚠️ 云端支持需要较大代码改动，请在部署后手动配置")
    print("📝 建议：在生产环境使用 Docker 部署并挂载持久化存储")

if __name__ == '__main__':
    migrate_face_data()
