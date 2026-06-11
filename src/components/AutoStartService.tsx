'use client';

import { useEffect, useState } from 'react';

interface ServiceStatus {
  faceService: boolean;
  message: string;
}

export default function AutoStartService() {
  const [status, setStatus] = useState<ServiceStatus | null>(null);
  const [showGuide, setShowGuide] = useState(false);

  const checkServices = async () => {
    try {
      const faceRes = await fetch('https://applies-citations-cgi-trio.trycloudflare.com/health', {
        method: 'GET',
        signal: AbortSignal.timeout(3000),
      });

      if (faceRes.ok) {
        return { faceService: true, message: '人脸服务正常' };
      }
    } catch {
      // 服务未运行
    }
    return { faceService: false, message: '人脸服务未启动' };
  };

  useEffect(() => {
    const init = async () => {
      const result = await checkServices();
      setStatus(result);

      // 如果服务未运行，3秒后显示启动指南
      if (!result.faceService) {
        setTimeout(() => {
          setShowGuide(true);
        }, 3000);
      }
    };

    init();
  }, []);

  // 只在本地环境显示
  if (typeof window === 'undefined') return null;

  return (
    <>
      {/* 启动指南模态框 */}
      {showGuide && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
        }}>
          <div style={{
            background: 'white',
            padding: '24px',
            borderRadius: '12px',
            maxWidth: '500px',
            width: '90%',
            boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
          }}>
            <h2 style={{ margin: '0 0 16px 0', color: '#333' }}>
              🔧 启动人脸服务
            </h2>
            
            <p style={{ color: '#666', marginBottom: '16px' }}>
              人脸服务未启动。请按以下步骤启动：
            </p>

            <div style={{
              background: '#f5f5f5',
              padding: '16px',
              borderRadius: '8px',
              fontFamily: 'monospace',
              fontSize: '14px',
              marginBottom: '16px',
            }}>
              <p><strong>步骤1：</strong>打开命令提示符</p>
              <p style={{ color: '#888' }}>按 Win+R，输入 cmd，回车</p>
              
              <p style={{ marginTop: '12px' }}><strong>步骤2：</strong>运行以下命令</p>
              <code style={{ 
                display: 'block',
                background: '#333',
                color: '#0f0',
                padding: '12px',
                borderRadius: '4px',
                marginTop: '8px',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-all',
              }}>
{`cd python-face
python face_api.py`}
              </code>
            </div>

            <p style={{ color: '#888', fontSize: '12px' }}>
              💡 提示：命令提示符窗口会保持打开状态，不要关闭它
            </p>

            <button
              onClick={() => setShowGuide(false)}
              style={{
                width: '100%',
                padding: '12px',
                background: '#2563eb',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                fontSize: '16px',
                cursor: 'pointer',
                marginTop: '8px',
              }}
            >
              我已启动服务
            </button>
          </div>
        </div>
      )}
    </>
  );
}
