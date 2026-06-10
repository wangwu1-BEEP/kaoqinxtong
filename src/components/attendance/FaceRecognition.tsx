'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Camera, CameraOff, CheckCircle, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getCurrentUser } from '@/lib/userUtils';

interface FaceRecognitionProps {
  onRecognitionComplete?: (result: { success: boolean; message: string }) => void;
  selectedAttendanceType?: 'check_in' | 'check_out';
  enableLivenessDetection?: boolean;
  purpose?: 'registration' | 'checkin';
}

/**
 * 人脸识别组件
 * 
 * 核心逻辑：
 * - 前端负责摄像头采集、拍照
 * - 后端 Python OpenCV LBPH 负责人脸检测、注册、验证
 * - 注册：发送5张图片到后端，LBPH检查唯一性后保存并训练
 * - 验证：发送3张图片到后端，LBPH做1:1比对
 */
export default function FaceRecognition({
  onRecognitionComplete,
  purpose = 'checkin',
}: FaceRecognitionProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const isProcessingRef = useRef(false);

  const [status, setStatus] = useState<string>('正在初始化...');
  const [isCameraReady, setIsCameraReady] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [lastResult, setLastResult] = useState<{ success: boolean; message: string } | null>(null);
  const [mounted, setMounted] = useState(false);
  const [detectedFace, setDetectedFace] = useState(false);
  const [checkingStatus, setCheckingStatus] = useState<string>('');
  const faceCheckIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // 初始化
  useEffect(() => {
    setMounted(true);
    return () => {
      stopCamera();
      if (faceCheckIntervalRef.current) {
        clearInterval(faceCheckIntervalRef.current);
      }
    };
  }, []);

  // 摄像头初始化
  useEffect(() => {
    if (!mounted) return;
    initCamera();
    return () => {
      stopCamera();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mounted]);

  const initCamera = async () => {
    setStatus('正在请求摄像头权限...');
    try {
      if (!window.isSecureContext) {
        setStatus('当前页面非安全上下文（HTTP），浏览器禁止访问摄像头。请使用 HTTPS 地址访问');
        return;
      }

      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setStatus('您的浏览器不支持摄像头访问，请使用最新版 Chrome/Edge 浏览器');
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: 'user'
        }
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          videoRef.current?.play();
          setIsCameraReady(true);
          setStatus('摄像头已就绪，请正面对着摄像头');
          startFaceCheck();
        };
      }
    } catch (err) {
      console.error('摄像头初始化失败:', err);
      if (err instanceof DOMException) {
        if (err.name === 'NotAllowedError') {
          setStatus('摄像头权限被拒绝，请在浏览器设置中允许访问摄像头');
        } else if (err.name === 'NotFoundError') {
          setStatus('未检测到摄像头设备');
        } else if (err.name === 'NotReadableError') {
          setStatus('摄像头被其他应用占用，请关闭其他使用摄像头的应用后重试');
        } else {
          setStatus(`摄像头错误: ${err.message}`);
        }
      } else {
        setStatus('摄像头初始化失败，请刷新页面重试');
      }
    }
  };

  const stopCamera = useCallback(() => {
    if (faceCheckIntervalRef.current) {
      clearInterval(faceCheckIntervalRef.current);
      faceCheckIntervalRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setIsCameraReady(false);
  }, []);

  // 定时向后端检测人脸（每2秒）
  const startFaceCheck = useCallback(() => {
    if (faceCheckIntervalRef.current) {
      clearInterval(faceCheckIntervalRef.current);
    }

    faceCheckIntervalRef.current = setInterval(async () => {
      if (!videoRef.current || videoRef.current.readyState < 2 || isProcessingRef.current) return;

      try {
        const image = captureFrame();
        if (!image) return;

        const res = await fetch('https://applies-citations-cgi-trio.trycloudflare.com/api/face/detect', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ image }),
        });
        const data = await res.json();
        setDetectedFace(data.success === true && data.faceDetected === true);
      } catch {
        // 静默忽略
      }
    }, 2000);
  }, []);

  // 从摄像头捕获一帧，返回base64
  const captureFrame = useCallback((): string | null => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || video.readyState < 2) return null;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    // 镜像翻转
    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(video, 0, 0);
    ctx.setTransform(1, 0, 0, 1, 0, 0);

    return canvas.toDataURL('image/jpeg', 0.85);
  }, []);

  // 捕获多帧图像
  const captureMultipleFrames = useCallback(async (count: number, intervalMs: number = 200): Promise<string[]> => {
    const frames: string[] = [];
    for (let i = 0; i < count; i++) {
      const frame = captureFrame();
      if (frame) {
        frames.push(frame);
      }
      if (i < count - 1) {
        await new Promise(resolve => setTimeout(resolve, intervalMs));
      }
    }
    return frames;
  }, [captureFrame]);

  // 注册人脸
  const handleRegister = useCallback(async () => {
    if (isProcessingRef.current) return;
    isProcessingRef.current = true;
    setIsProcessing(true);
    setCheckingStatus('正在采集人脸图像...');
    setLastResult(null);

    const user = getCurrentUser();
    if (!user) {
      setLastResult({ success: false, message: '未找到用户信息，请重新登录' });
      isProcessingRef.current = false;
      setIsProcessing(false);
      return;
    }

    try {
      // 采集5帧图像
      const images = await captureMultipleFrames(5, 200);
      if (images.length < 3) {
        setLastResult({ success: false, message: '人脸采集失败，请确保正面对着摄像头，光线充足' });
        isProcessingRef.current = false;
        setIsProcessing(false);
        return;
      }

      setCheckingStatus('正在注册人脸...');

      // 发送到后端注册
      const res = await fetch('https://applies-citations-cgi-trio.trycloudflare.com/api/face/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          images,
          userId: user.id,
          username: user.username,
          name: user.name,
        }),
      });

      const data = await res.json();

      if (data.success) {
        setLastResult({ success: true, message: data.message || '人脸注册成功！' });
        if (onRecognitionComplete) {
          onRecognitionComplete({ success: true, message: '人脸注册成功' });
        }
      } else {
        // 注册失败：人脸已被他人注册 或 其他错误
        setLastResult({ success: false, message: data.error || '注册失败' });
      }
    } catch (err) {
      setLastResult({
        success: false,
        message: '注册失败: ' + (err instanceof Error ? err.message : String(err)),
      });
    }

    isProcessingRef.current = false;
    setIsProcessing(false);
    setCheckingStatus('');
  }, [captureMultipleFrames, onRecognitionComplete]);

  // 人脸签到验证（严格1:1）
  const handleVerify = useCallback(async () => {
    if (isProcessingRef.current) return;
    isProcessingRef.current = true;
    setIsProcessing(true);
    setCheckingStatus('正在采集人脸图像...');
    setLastResult(null);

    const user = getCurrentUser();
    if (!user) {
      setLastResult({ success: false, message: '未找到用户信息，请重新登录' });
      isProcessingRef.current = false;
      setIsProcessing(false);
      return;
    }

    try {
      // 采集3帧图像用于验证
      const images = await captureMultipleFrames(3, 200);
      if (images.length < 1) {
        setLastResult({ success: false, message: '人脸采集失败，请确保正面对着摄像头' });
        isProcessingRef.current = false;
        setIsProcessing(false);
        return;
      }

      setCheckingStatus('正在验证人脸...');

      // 使用第一帧做验证（后端LBPH 1:1比对）
      const res = await fetch('https://applies-citations-cgi-trio.trycloudflare.com/api/face/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image: images[0],
          userId: user.id,
        }),
      });

      const data = await res.json();

      if (data.success === false) {
        // API本身失败（如图像解码失败、模型未训练等）
        setLastResult({ success: false, message: data.error || '验证失败' });
        if (onRecognitionComplete) {
          onRecognitionComplete({ success: false, message: data.error || '验证失败' });
        }
      } else if (data.verified) {
        // 1:1验证通过
        const similarity = data.similarity ? data.similarity.toFixed(1) : '';
        const msg = similarity ? `人脸验证通过！(相似度: ${similarity}%)` : '人脸验证通过！';
        setLastResult({ success: true, message: msg });
        if (onRecognitionComplete) {
          onRecognitionComplete({ success: true, message: '人脸验证通过' });
        }
      } else {
        // 1:1验证失败
        setLastResult({ success: false, message: data.message || '人脸验证失败，与注册人脸不匹配' });
        if (onRecognitionComplete) {
          onRecognitionComplete({ success: false, message: data.message || '人脸验证失败' });
        }
      }
    } catch (err) {
      setLastResult({
        success: false,
        message: '验证失败: ' + (err instanceof Error ? err.message : String(err)),
      });
    }

    isProcessingRef.current = false;
    setIsProcessing(false);
    setCheckingStatus('');
  }, [captureMultipleFrames, onRecognitionComplete]);

  const toggleCamera = useCallback(() => {
    if (isCameraReady) {
      stopCamera();
    } else {
      initCamera();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isCameraReady, stopCamera]);

  if (!mounted) return null;

  const isRegisterMode = purpose === 'registration';

  return (
    <div className="space-y-4">
      {/* 摄像头画面 */}
      <div className="relative rounded-2xl overflow-hidden bg-black aspect-video">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="w-full h-full object-cover"
          style={{ transform: 'scaleX(-1)' }}
        />
        <canvas ref={canvasRef} className="hidden" />

        {/* 人脸检测指示器 */}
        {isCameraReady && (
          <div className={cn(
            "absolute top-3 right-3 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium",
            detectedFace
              ? "bg-green-500/20 text-green-400 border border-green-500/30"
              : "bg-yellow-500/20 text-yellow-400 border border-yellow-500/30"
          )}>
            <div className={cn(
              "w-2 h-2 rounded-full",
              detectedFace ? "bg-green-400 animate-pulse" : "bg-yellow-400"
            )} />
            {detectedFace ? '已检测到人脸' : '未检测到人脸'}
          </div>
        )}

        {/* 处理中遮罩 */}
        {isProcessing && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/60">
            <div className="text-center text-white">
              <div className="animate-spin w-10 h-10 border-4 border-white/30 border-t-white rounded-full mx-auto mb-3" />
              <p className="text-sm">{checkingStatus || '处理中...'}</p>
            </div>
          </div>
        )}

        {/* 摄像头未开启 */}
        {!isCameraReady && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/80">
            <div className="text-center text-white">
              <Camera className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p className="text-sm">{status}</p>
            </div>
          </div>
        )}
      </div>

      {/* 操作按钮 */}
      <div className="flex items-center gap-3">
        <button
          onClick={toggleCamera}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-muted hover:bg-muted/80 transition-colors text-sm"
        >
          {isCameraReady ? <CameraOff className="w-4 h-4" /> : <Camera className="w-4 h-4" />}
          {isCameraReady ? '关闭摄像头' : '开启摄像头'}
        </button>

        {isCameraReady && (
          <button
            onClick={isRegisterMode ? handleRegister : handleVerify}
            disabled={isProcessing}
            className={cn(
              "flex items-center gap-2 px-6 py-2 rounded-xl text-sm font-medium transition-all",
              isProcessing
                ? "bg-muted text-muted-foreground cursor-not-allowed"
                : "bg-primary text-primary-foreground hover:bg-primary/90"
            )}
          >
            {isProcessing ? (
              <>
                <div className="animate-spin w-4 h-4 border-2 border-current border-t-transparent rounded-full" />
                {isRegisterMode ? '采集中...' : '验证中...'}
              </>
            ) : (
              <>
                <CheckCircle className="w-4 h-4" />
                {isRegisterMode ? '注册人脸' : '人脸验证'}
              </>
            )}
          </button>
        )}
      </div>

      {/* 结果显示 */}
      {lastResult && (
        <div className={cn(
          "flex items-center gap-2 p-3 rounded-xl text-sm",
          lastResult.success
            ? "bg-green-500/10 text-green-600 border border-green-500/20"
            : "bg-red-500/10 text-red-600 border border-red-500/20"
        )}>
          {lastResult.success ? <CheckCircle className="w-4 h-4 shrink-0" /> : <XCircle className="w-4 h-4 shrink-0" />}
          {lastResult.message}
        </div>
      )}

      {/* 提示信息 */}
      <p className="text-xs text-muted-foreground">
        {isRegisterMode
          ? '请正面对着摄像头，保持光线充足，系统将采集多帧数据提高识别准确率'
          : '请正面对着摄像头进行人脸验证，系统将严格比对您注册的人脸数据（1:1验证）'}
      </p>
    </div>
  );
}
