'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Camera, CameraOff, CheckCircle, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getCurrentUser } from '@/lib/userUtils';
import * as faceapi from 'face-api.js';

interface FaceRecognitionProps {
  onRecognitionComplete?: (result: { success: boolean; message: string }) => void;
  selectedAttendanceType?: 'check_in' | 'check_out';
  enableLivenessDetection?: boolean;
  purpose?: 'registration' | 'checkin';
}

// 模型加载状态
let modelsLoaded = false;
let modelsLoading = false;

export default function FaceRecognition({
  onRecognitionComplete,
  purpose = 'checkin',
}: FaceRecognitionProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const isProcessingRef = useRef(false);
  const labeledDescriptorsRef = useRef<faceapi.LabeledFaceDescriptors[]>([]);

  const [status, setStatus] = useState<string>('正在初始化...');
  const [isCameraReady, setIsCameraReady] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [lastResult, setLastResult] = useState<{ success: boolean; message: string } | null>(null);
  const [mounted, setMounted] = useState(false);
  const [detectedFace, setDetectedFace] = useState(false);
  const [checkingStatus, setCheckingStatus] = useState<string>('');
  const [modelsReady, setModelsReady] = useState(false);
  const faceCheckIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // 加载 face-api.js 模型
  const loadModels = useCallback(async () => {
    if (modelsLoaded) {
      setModelsReady(true);
      return;
    }
    if (modelsLoading) {
      // 等待其他请求完成
      while (!modelsLoaded) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      setModelsReady(true);
      return;
    }
    
    modelsLoading = true;
    setStatus('正在加载人脸识别模型...');
    
    try {
      // 从 CDN 加载模型
      const MODEL_URL = 'https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights';
      
      await Promise.all([
        faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
        faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
        faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
      ]);
      
      modelsLoaded = true;
      setModelsReady(true);
      console.log('[FaceAPI] 模型加载成功');
    } catch (err) {
      console.error('[FaceAPI] 模型加载失败:', err);
      setStatus('模型加载失败，请刷新重试');
    }
    modelsLoading = false;
  }, []);

  // 初始化
  useEffect(() => {
    setMounted(true);
    loadModels();
    
    return () => {
      stopCamera();
      if (faceCheckIntervalRef.current) {
        clearInterval(faceCheckIntervalRef.current);
      }
    };
  }, [loadModels]);

  // 摄像头初始化
  useEffect(() => {
    if (!mounted || !modelsReady) return;
    initCamera();
    return () => {
      stopCamera();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mounted, modelsReady]);

  // 从本地存储加载已注册的人脸描述符
  const loadRegisteredFaces = useCallback(() => {
    const user = getCurrentUser();
    if (!user) return;
    
    const storedData = localStorage.getItem(`face_${user.id}`);
    if (!storedData) {
      labeledDescriptorsRef.current = [];
      return;
    }
    
    try {
      const userData = JSON.parse(storedData);
      if (userData.descriptors && Array.isArray(userData.descriptors)) {
        // 恢复 LabeledFaceDescriptors
        labeledDescriptorsRef.current = userData.descriptors.map(
          (d: { label: string; descriptors: number[][] }) =>
            new faceapi.LabeledFaceDescriptors(d.label, d.descriptors.map(
              (arr: number[]) => new Float32Array(arr)
            ))
        );
      }
    } catch (err) {
      console.error('[FaceAPI] 加载已注册人脸失败:', err);
    }
  }, []);

  // 人脸检测（使用 face-api.js）
  const detectFace = useCallback(async (video: HTMLVideoElement): Promise<faceapi.FaceDetection | null> => {
    if (!modelsReady) return null;
    
    try {
      const options = new faceapi.TinyFaceDetectorOptions({
        inputSize: 320,
        scoreThreshold: 0.5,
      });
      
      const detection = await faceapi
        .detectSingleFace(video, options)
        .withFaceLandmarks()
        .withFaceDescriptor();
      
      return detection || null;
    } catch (err) {
      return null;
    }
  }, [modelsReady]);

  // 注册人脸
  const handleRegister = useCallback(async () => {
    if (isProcessingRef.current || !modelsReady) return;
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

    const video = videoRef.current;
    if (!video) {
      setLastResult({ success: false, message: '摄像头未就绪' });
      isProcessingRef.current = false;
      setIsProcessing(false);
      return;
    }

    try {
      setCheckingStatus('正在检测人脸...');
      
      // 采集多帧
      const detections: faceapi.WithFaceDescriptor<faceapi.WithFaceLandmarks<faceapi.FaceDetection, faceapi.FaceLandmarks68>>[] = [];
      
      for (let i = 0; i < 5; i++) {
        const detection = await detectFace(video);
        if (detection) {
          detections.push(detection);
        }
        if (i < 4) {
          await new Promise(resolve => setTimeout(resolve, 300));
        }
      }

      if (detections.length < 3) {
        setLastResult({ success: false, message: '人脸采集失败，请确保正面对着摄像头，光线充足' });
        isProcessingRef.current = false;
        setIsProcessing(false);
        return;
      }

      setCheckingStatus('正在保存人脸数据...');

      // 计算平均描述符
      const descriptors = detections.map(d => Array.from(d.descriptor));
      const avgDescriptor = descriptors.reduce((acc, d) => {
        return acc.map((val, i) => val + d[i] /descriptors.length);
      }, new Array(128).fill(0));

      // 保存到本地存储
      const labeledDescriptor = new faceapi.LabeledFaceDescriptors(user.name, [new Float32Array(avgDescriptor)]);
      const userData = {
        id: user.id,
        name: user.name,
        username: user.username,
        descriptors: [{ label: user.name, descriptors }],
        registeredAt: new Date().toISOString(),
      };
      
      localStorage.setItem(`face_${user.id}`, JSON.stringify(userData));
      
      // 更新内存中的描述符
      labeledDescriptorsRef.current = [labeledDescriptor];
      
      setLastResult({ success: true, message: '人脸注册成功！' });
      
      if (onRecognitionComplete) {
        onRecognitionComplete({ success: true, message: '人脸注册成功' });
        setTimeout(() => window.location.reload(), 1500);
      }
    } catch (err) {
      console.error('[FaceAPI] 注册失败:', err);
      setLastResult({
        success: false,
        message: '注册失败: ' + (err instanceof Error ? err.message : String(err)),
      });
    }

    isProcessingRef.current = false;
    setIsProcessing(false);
    setCheckingStatus('');
  }, [detectFace, modelsReady, onRecognitionComplete]);

  // 人脸验证
  const handleVerify = useCallback(async () => {
    if (isProcessingRef.current || !modelsReady) return;
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

    // 加载已注册的人脸
    loadRegisteredFaces();
    
    if (labeledDescriptorsRef.current.length === 0) {
      setLastResult({ success: false, message: '请先注册人脸' });
      isProcessingRef.current = false;
      setIsProcessing(false);
      return;
    }

    const video = videoRef.current;
    if (!video) {
      setLastResult({ success: false, message: '摄像头未就绪' });
      isProcessingRef.current = false;
      setIsProcessing(false);
      return;
    }

    try {
      setCheckingStatus('正在验证人脸...');
      
      const detection = await detectFace(video);
      
      if (!detection) {
        setLastResult({ success: false, message: '未检测到人脸，请正面对着摄像头' });
        isProcessingRef.current = false;
        setIsProcessing(false);
        return;
      }

      // 使用 faceMatcher 进行比对
      const faceMatcher = new faceapi.FaceMatcher(labeledDescriptorsRef.current, 0.6);
      const match = faceMatcher.findBestMatch(detection.descriptor);
      
      if (match.label !== 'unknown') {
        setLastResult({ success: true, message: `验证通过: ${match.label}` });
        
        if (onRecognitionComplete) {
          onRecognitionComplete({ success: true, message: '人脸验证通过' });
        }
      } else {
        setLastResult({ success: false, message: '人脸验证失败，不是注册用户' });
      }
    } catch (err) {
      console.error('[FaceAPI] 验证失败:', err);
      setLastResult({ success: false, message: '验证失败，请重试' });
    }

    isProcessingRef.current = false;
    setIsProcessing(false);
    setCheckingStatus('');
  }, [detectFace, loadRegisteredFaces, modelsReady, onRecognitionComplete]);

  const initCamera = async () => {
    setStatus('正在请求摄像头权限...');
    try {
      if (!window.isSecureContext) {
        setStatus('请使用 HTTPS 访问以使用摄像头功能');
        return;
      }

      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setStatus('您的浏览器不支持摄像头访问');
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
          setStatus('摄像头已就绪');
          startFaceCheck();
          
          // 注册模式自动开始
          if (purpose === 'registration') {
            setTimeout(() => handleRegister(), 2000);
          }
        };
      }
    } catch (err) {
      console.error('摄像头初始化失败:', err);
      if (err instanceof DOMException) {
        if (err.name === 'NotAllowedError') {
          setStatus('摄像头权限被拒绝');
        } else if (err.name === 'NotFoundError') {
          setStatus('未检测到摄像头设备');
        } else {
          setStatus(`摄像头错误: ${err.message}`);
        }
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

  const toggleCamera = useCallback(() => {
    if (isCameraReady) {
      stopCamera();
    } else {
      initCamera();
    }
  }, [isCameraReady, stopCamera]);

  // 定时人脸检测
  const startFaceCheck = useCallback(async () => {
    if (faceCheckIntervalRef.current) {
      clearInterval(faceCheckIntervalRef.current);
    }

    faceCheckIntervalRef.current = setInterval(async () => {
      if (!videoRef.current || videoRef.current.readyState < 2 || isProcessingRef.current || !modelsReady) return;

      const video = videoRef.current;
      const detection = await detectFace(video);
      setDetectedFace(!!detection);
    }, 1000);
  }, [detectFace, modelsReady]);

  const isRegisterMode = purpose === 'registration';

  if (!mounted) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-pulse text-muted-foreground">加载中...</div>
      </div>
    );
  }

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

        {/* 模型加载状态 */}
        {!modelsReady && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/80">
            <div className="text-center text-white">
              <div className="animate-spin w-8 h-8 border-2 border-white/30 border-t-white rounded-full mx-auto mb-3" />
              <p className="text-sm">{status}</p>
            </div>
          </div>
        )}

        {/* 人脸检测指示器 */}
        {isCameraReady && modelsReady && (
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

        {/* 摄像头未开启 */}
        {!isCameraReady && modelsReady && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/80">
            <div className="text-center text-white">
              <Camera className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p className="text-sm">{status}</p>
            </div>
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

        {isCameraReady && modelsReady && (
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
          ? '请正面对着摄像头，保持光线充足'
          : '请正面对着摄像头进行人脸验证'}
      </p>
    </div>
  );
}
