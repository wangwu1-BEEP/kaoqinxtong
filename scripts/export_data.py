#!/usr/bin/env python3
"""
数据导出脚本 - 将所有数据导出为 JSON
用于迁移和备份
"""

import json
import os
import sys

# 添加项目路径
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

def export_all_data():
    """导出所有数据"""
    data = {
        "face_embeddings": [],
        "students": [],
        "app_config": {
            "face_verify_threshold": "50",
            "face_unique_threshold": "35",
            "face_model_type": "lbph"
        },
        "export_time": str(datetime.now())
    }
    
    # 1. 导出人脸数据
    face_data_path = os.path.join(os.path.dirname(__file__), "..", "python-face", "face_data")
    meta_file = os.path.join(face_data_path, "meta.json")
    models_dir = os.path.join(face_data_path, "models")
    
    if os.path.exists(meta_file):
        with open(meta_file, 'r') as f:
            meta = json.load(f)
            data["face_embeddings"] = meta
        print(f"✓ 已导出 {len(meta)} 个用户的人脸数据")
    
    # 2. 导出模型文件列表
    if os.path.exists(models_dir):
        model_files = []
        for f in os.listdir(models_dir):
            if f.endswith('.yml') or f.endswith('.xml'):
                model_files.append(f)
        data["model_files"] = model_files
        print(f"✓ 已记录 {len(model_files)} 个模型文件")
    
    # 保存导出文件
    export_file = os.path.join(face_data_path, "cloud_backup.json")
    with open(export_file, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    
    print(f"\n✓ 数据已导出到: {export_file}")
    print(f"  - 人脸数据: {len(data['face_embeddings'])} 条")
    print(f"  - 模型文件: {len(data['model_files'])} 个")
    
    return data

if __name__ == "__main__":
    from datetime import datetime
    export_all_data()
