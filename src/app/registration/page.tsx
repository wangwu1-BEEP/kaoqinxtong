'use client';
/* eslint-disable @typescript-eslint/no-explicit-any */

import { useState, useEffect } from 'react';
import { Camera, ArrowLeft, CheckCircle, AlertCircle, User, Shield, Scan } from 'lucide-react';
import FaceRecognition from '@/components/attendance/FaceRecognition';
import { getCurrentUser, StoredUser } from '@/lib/userUtils';
import { getStudents, updateStudentRegistration, updateStudentRegistrationById } from '@/lib/sharedData';
import { syncRegistrationStatus } from '@/lib/syncUtils';
import { cn } from '@/lib/utils';

type Step = 'status' | 'face';

export default function RegistrationPage() {
  const [user, setUser] = useState<StoredUser | null>(null);
  const [step, setStep] = useState<Step>('status');
  const [isLoading, setIsLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    const currentUser = getCurrentUser();
    if (!currentUser) {
      window.location.href = '/login';
      return;
    }
    setUser(currentUser);
    setIsLoading(false);
  }, []);

  const getRegistrationStatus = () => {
    const students = getStudents();
    const student = students.find((s) => s.username === user?.username);
    return {
      faceRegistered: (student as any)?.faceRegistered || false,
    };
  };

  const handleFaceComplete = (result?: { success: boolean; message?: string }) => {
    console.log('[handleFaceComplete] 被调用, result:', result);
    if (!user) {
      alert('用户信息无效，请重新登录');
      return;
    }
    if (!result?.success) {
      alert(result?.message || '人脸注册失败，请重试');
      return;
    }
    console.log('[handleFaceComplete] 开始处理注册状态');
    let success = false;
    if (user.id) {
      success = updateStudentRegistrationById(user.id, 'face');
      console.log('[handleFaceComplete] updateStudentRegistrationById:', success);
    }
    if (!success) {
      success = updateStudentRegistration(user.username, 'face');
      console.log('[handleFaceComplete] updateStudentRegistration:', success);
    }
    if (success) {
      const message = result?.message || '人脸注册成功！';
      console.log('[handleFaceComplete]', message);
      syncRegistrationStatus(user.id, { face_registered: true }).catch(err =>
        console.error('[handleFaceComplete] 同步云端失败:', err)
      );
    } else {
      console.error('[handleFaceComplete] 人脸注册失败');
    }
    console.log('[handleFaceComplete] 准备切换到status步骤');
    setStep('status');
    setRefreshKey(k => k + 1);
  };

  if (isLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center relative" style={{ background: 'linear-gradient(135deg, #0a0a1a, #1a1a3e, #0a0a1a)' }}>
        <div className="flex flex-col items-center gap-4">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center animate-pulse" style={{ background: 'linear-gradient(135deg, #667eea, #764ba2)', boxShadow: '0 0 30px rgba(102,126,234,0.4)' }}>
            <Shield className="w-8 h-8 text-white" />
          </div>
          <div className="text-white/60 text-sm">加载中...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative" style={{ background: 'linear-gradient(135deg, #0a0a1a, #1a1a3e, #0a0a1a)', color: '#fff' }}>
      {/* 背景动效 */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full opacity-20 blur-3xl" style={{ background: 'radial-gradient(circle, #667eea, transparent)' }} />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 rounded-full opacity-15 blur-3xl" style={{ background: 'radial-gradient(circle, #764ba2, transparent)' }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full opacity-5 blur-3xl" style={{ background: 'radial-gradient(circle, #06b6d4, transparent)' }} />
      </div>

      {/* 顶部导航 */}
      <div className="relative z-10 p-4 flex items-center gap-4 border-b backdrop-blur-xl" style={{ borderColor: 'rgba(255,255,255,0.06)', background: 'rgba(255,255,255,0.02)' }}>
        {step !== 'status' && (
          <button
            onClick={() => setStep('status')}
            className="p-2.5 rounded-xl border backdrop-blur-xl transition-all duration-300 hover:border-white/20"
            style={{ background: 'rgba(255,255,255,0.05)', borderColor: 'rgba(255,255,255,0.08)' }}
          >
            <ArrowLeft className="w-5 h-5 text-white/60" />
          </button>
        )}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #667eea, #764ba2)', boxShadow: '0 4px 15px rgba(102,126,234,0.3)' }}>
            <Shield className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-white/90">生物识别注册</h1>
            <p className="text-xs text-white/40">
              {step === 'status' && '查看注册状态'}
              {step === 'face' && '人脸注册'}
            </p>
          </div>
        </div>
      </div>

      {/* 内容区域 */}
      <div className="relative z-10 p-4 max-w-lg mx-auto">
        {step === 'status' && (
          <StatusStep key={refreshKey} user={user} onStartFace={() => setStep('face')} />
        )}
        {step === 'face' && (
          <FaceStep user={user} onComplete={handleFaceComplete} onBack={() => setStep('status')} />
        )}
      </div>
    </div>
  );
}

// 状态查看步骤
function StatusStep({
  user,
  onStartFace
}: {
  user: StoredUser | null;
  onStartFace: () => void;
}) {
  const [faceRegistered, setFaceRegistered] = useState(false);

  useEffect(() => {
    const students = getStudents();
    const student = students.find((s) => s.username === user?.username);
    setFaceRegistered((student as any)?.faceRegistered || false);
  }, [user?.username]);

  return (
    <div className="space-y-5 mt-4">
      {/* 用户信息卡片 */}
      <div className="rounded-2xl p-5 text-center border backdrop-blur-xl relative overflow-hidden" style={{ background: 'rgba(255,255,255,0.04)', borderColor: 'rgba(255,255,255,0.06)' }}>
        {/* 背景装饰 */}
        <div className="absolute top-0 left-0 right-0 h-20 opacity-20" style={{ background: 'linear-gradient(135deg, #667eea, #764ba2)' }} />
        <div className="relative">
          <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-3 border-2" style={{ background: 'linear-gradient(135deg, #667eea, #764ba2)', borderColor: 'rgba(255,255,255,0.2)', boxShadow: '0 8px 30px rgba(102,126,234,0.3)' }}>
            <User className="w-10 h-10 text-white" />
          </div>
          <div className="font-bold text-xl text-white/90">{user?.name || '学生'}</div>
          <div className="text-sm text-white/40 mt-1">{user?.className || '未分配班级'}</div>
        </div>
      </div>

      {/* 状态卡片 */}
      <div className="grid grid-cols-2 gap-4">
        <StatusCard icon={Scan} title="人脸注册" completed={faceRegistered} gradient={['#3b82f6', '#2563eb']} />
      </div>

      {/* 操作按钮 */}
      <div className="space-y-3">
        {!faceRegistered && (
          <button
            onClick={onStartFace}
            className="w-full py-4 rounded-2xl font-semibold flex items-center justify-center gap-3 text-white transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]"
            style={{ background: 'linear-gradient(135deg, #3b82f6, #2563eb)', boxShadow: '0 8px 25px rgba(59,130,246,0.35)' }}
          >
            <Camera className="w-6 h-6" />
            注册人脸
          </button>
        )}
        {faceRegistered && (
          <button
            onClick={() => window.location.href = '/student'}
            className="w-full py-4 rounded-2xl font-semibold flex items-center justify-center gap-3 text-white transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]"
            style={{ background: 'linear-gradient(135deg, #667eea, #764ba2)', boxShadow: '0 8px 25px rgba(102,126,234,0.35)' }}
          >
            <CheckCircle className="w-6 h-6" />
            完成注册，前往首页
          </button>
        )}
      </div>

      {/* 说明 */}
      <div className="rounded-2xl p-5 border backdrop-blur-xl" style={{ background: 'rgba(255,255,255,0.03)', borderColor: 'rgba(255,255,255,0.06)' }}>
        <h3 className="font-semibold mb-3 text-white/80 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-amber-400" />
          注册说明
        </h3>
        <ul className="space-y-3 text-sm text-white/50">
          <li className="flex items-start gap-3">
            <Scan className="w-4 h-4 mt-0.5 flex-shrink-0 text-blue-400" />
            <span>人脸注册需要面对摄像头完成活体检测</span>
          </li>
        </ul>
      </div>
    </div>
  );
}

// 状态卡片
function StatusCard({ icon: Icon, title, completed, gradient }: { icon: typeof Camera; title: string; completed: boolean; gradient: string[] }) {
  return (
    <div className="p-5 rounded-2xl text-center border backdrop-blur-xl transition-all duration-300 hover:border-white/10" style={{ background: completed ? 'rgba(16,185,129,0.08)' : 'rgba(255,255,255,0.03)', borderColor: completed ? 'rgba(16,185,129,0.2)' : 'rgba(255,255,255,0.06)' }}>
      <div
        className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-3 transition-all duration-500"
        style={{
          background: completed ? 'linear-gradient(135deg, #10b981, #059669)' : `linear-gradient(135deg, ${gradient[0]}, ${gradient[1]})`,
          boxShadow: completed ? '0 6px 20px rgba(16,185,129,0.35)' : '0 6px 20px rgba(107,114,128,0.2)',
        }}
      >
        {completed ? <CheckCircle className="w-7 h-7 text-white" /> : <Icon className="w-7 h-7 text-white" />}
      </div>
      <div className="font-semibold text-white/90">{title}</div>
      <div className={cn('text-sm mt-1 font-medium', completed ? 'text-emerald-400' : 'text-white/40')}>
        {completed ? '已完成' : '未完成'}
      </div>
    </div>
  );
}

// 人脸注册步骤
function FaceStep({ user, onComplete, onBack }: { user: StoredUser | null; onComplete: (result?: { success: boolean; message?: string }) => void; onBack: () => void }) {
  return (
    <div className="space-y-4 mt-4">
      <div className="text-center">
        <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-3" style={{ background: 'linear-gradient(135deg, #3b82f6, #2563eb)', boxShadow: '0 8px 25px rgba(59,130,246,0.35)' }}>
          <Camera className="w-8 h-8 text-white" />
        </div>
        <h2 className="text-xl font-bold text-white/90">人脸注册</h2>
        <p className="text-sm text-white/40 mt-1">请面对摄像头，完成人脸采集和活体检测</p>
      </div>
      <FaceRecognition
        purpose="registration"
        onRecognitionComplete={onComplete}
        selectedAttendanceType="check_in"
      />
    </div>
  );
}
