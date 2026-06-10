'use client';

import { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Camera, Mic, CheckCircle, Clock, Calendar, X, Shield, Scan, Fingerprint, MapPin, Loader2, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getCurrentUser, SharedStudent } from '@/lib/userUtils';
import { saveAttendanceRecord, updateStudentRegistration, getClassTimetable, getClassAnnouncements, addNotification, getParents } from '@/lib/sharedData';
import { syncAttendanceRecord } from '@/lib/syncUtils';
import FaceRecognition from '@/components/attendance/FaceRecognition';
import { RecognitionResult } from '@/types/attendance';
import { useGeolocation, formatLocation, type LocationData } from '@/hooks/useGeolocation';

type Step = 'select-type' | 'select-attendance' | 'face' | 'success';
type AttendanceType = 'check_in' | 'check_out' | 'leave' | 'go_out';

export default function CheckinPage() {
  const [user, setUser] = useState<SharedStudent | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [step, setStep] = useState<Step>('select-type');
  const [attendanceType, setAttendanceType] = useState<AttendanceType>('check_in');
  const [checkinType, setCheckinType] = useState<'face'>('face');
  const [capturedLocation, setCapturedLocation] = useState<LocationData | null>(null);
  const geo = useGeolocation({ autoFetch: true });

  useEffect(() => {
    const currentUser = getCurrentUser() as SharedStudent | null;
    if (!currentUser) {
      window.location.href = '/login';
      return;
    }
    setUser(currentUser);
    setIsLoading(false);
  }, []);

  // 持续同步定位数据
  useEffect(() => {
    if (geo.location) {
      setCapturedLocation(geo.location);
    }
  }, [geo.location]);

  const handleGoBack = () => {
    window.location.href = '/student';
  };

  const handleSelectCheckin = (type: 'face') => {
    setCheckinType(type);
    setStep('select-attendance');
  };

  const handleSelectAttendance = (type: AttendanceType) => {
    setAttendanceType(type);
    setStep(checkinType || 'face');
  };

  const handleSuccess = () => {
    if (!user || !checkinType) return;

    const record = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      studentId: user.id,
      studentName: user.name || '学生',
      classId: user.classId || '',
      className: user.className || '',
      type: attendanceType,
      method: checkinType,
      verified: true,
      timestamp: new Date().toISOString(),
      // 定位信息
      latitude: capturedLocation?.latitude,
      longitude: capturedLocation?.longitude,
      locationAccuracy: capturedLocation?.accuracy,
    };
    saveAttendanceRecord(record);
    syncAttendanceRecord(record).catch(err => console.error('[Checkin] 同步考勤记录失败:', err));

    setStep('success');
  };

  if (isLoading) {
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
        <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full opacity-15 blur-3xl" style={{ background: 'radial-gradient(circle, #667eea, transparent)' }} />
        <div className="absolute bottom-1/3 right-1/3 w-80 h-80 rounded-full opacity-10 blur-3xl" style={{ background: 'radial-gradient(circle, #06b6d4, transparent)' }} />
      </div>

      {/* 顶部 */}
      <div className="relative z-10 p-4 border-b backdrop-blur-xl" style={{ borderColor: 'rgba(255,255,255,0.06)', background: 'rgba(255,255,255,0.02)' }}>
        <div className="flex items-center justify-between max-w-lg mx-auto">
          <button
            onClick={handleGoBack}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl border backdrop-blur-xl transition-all duration-300 hover:border-white/20"
            style={{ background: 'rgba(255,255,255,0.05)', borderColor: 'rgba(255,255,255,0.08)' }}
          >
            <ArrowLeft className="w-5 h-5 text-white/60" />
            <span className="text-white/60 text-sm">返回</span>
          </button>
          <div className="text-right">
            <div className="text-base font-semibold text-white/90">{user?.name || '学生'}</div>
            <div className="text-xs text-white/40">考勤打卡</div>
          </div>
        </div>
      </div>

      {/* 内容区 */}
      <div className="relative z-10 px-4 pb-4 max-w-lg mx-auto">
        {step === 'select-type' && (
          <SelectTypeStep onSelect={handleSelectCheckin} />
        )}
        {step === 'select-attendance' && (
          <SelectAttendanceStep onSelect={handleSelectAttendance} location={capturedLocation} locationError={geo.error} locationLoading={geo.loading} />
        )}
        {step === 'face' && checkinType === 'face' && (
          <FaceCheckinStepFull onSuccess={handleSuccess} />
        )}
        {step === 'success' && (
          <SuccessStep attendanceType={attendanceType} studentName={user?.name || '学生'} studentId={user?.id || ''} location={capturedLocation} locationError={geo.error} />
        )}
      </div>
    </div>
  );
}

// 选择打卡方式
function SelectTypeStep({ onSelect }: { onSelect: (type: 'face') => void }) {
  return (
    <div className="space-y-5 mt-6">
      <div className="text-center mb-8">
        <div className="w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ background: 'linear-gradient(135deg, #667eea, #764ba2)', boxShadow: '0 8px 30px rgba(102,126,234,0.35)' }}>
          <Shield className="w-10 h-10 text-white" />
        </div>
        <h2 className="text-2xl font-bold text-white/90">选择打卡方式</h2>
        <p className="text-sm text-white/40 mt-2">请选择生物识别验证方式</p>
      </div>

      <button
        onClick={() => onSelect('face')}
        className="w-full p-5 rounded-2xl flex items-center gap-5 border backdrop-blur-xl transition-all duration-300 hover:scale-[1.02] hover:border-blue-500/25 group"
        style={{ background: 'rgba(59,130,246,0.06)', borderColor: 'rgba(59,130,246,0.15)' }}
      >
        <div className="w-16 h-16 rounded-2xl flex items-center justify-center flex-shrink-0 transition-transform duration-300 group-hover:scale-110" style={{ background: 'linear-gradient(135deg, #3b82f6, #2563eb)', boxShadow: '0 6px 20px rgba(59,130,246,0.35)' }}>
          <Scan className="w-8 h-8 text-white" />
        </div>
        <div className="text-left flex-1">
          <div className="text-lg font-semibold text-white/90">人脸识别打卡</div>
          <div className="text-sm text-white/40 mt-1">使用摄像头进行人脸识别验证</div>
        </div>
        <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.05)' }}>
          <ArrowLeft className="w-4 h-4 text-white/30 rotate-180" />
        </div>
      </button>

    </div>
  );
}

// 选择考勤类型
function SelectAttendanceStep({ onSelect, location, locationError, locationLoading }: { onSelect: (type: AttendanceType) => void; location: LocationData | null; locationError: { code: number; message: string } | null; locationLoading: boolean }) {
  const attendanceTypes = [
    { type: 'check_in' as const, label: '上课打卡', desc: '课程开始时签到', icon: Clock, gradient: ['#3b82f6', '#2563eb'] },
    { type: 'check_out' as const, label: '下课打卡', desc: '课程结束时签退', icon: CheckCircle, gradient: ['#10b981', '#059669'] },
  ];

  return (
    <div className="space-y-5 mt-6">
      <div className="text-center mb-6">
        <h2 className="text-xl font-bold text-white/90">选择考勤类型</h2>
        <p className="text-sm text-white/40 mt-1">请选择本次打卡类型</p>
      </div>

      {/* 定位状态提示 */}
      <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl border backdrop-blur-xl"
        style={{
          background: location ? 'rgba(16,185,129,0.06)' : 'rgba(245,158,11,0.06)',
          borderColor: location ? 'rgba(16,185,129,0.15)' : 'rgba(245,158,11,0.15)',
        }}>
        {locationLoading && !location && (
          <>
            <Loader2 className="w-4 h-4 text-amber-400 animate-spin flex-shrink-0" />
            <span className="text-xs text-amber-300/70">正在获取定位信息...</span>
          </>
        )}
        {location && (
          <>
            <MapPin className="w-4 h-4 text-emerald-400 flex-shrink-0" />
            <span className="text-xs text-emerald-300/70">已获取定位: {formatLocation(location)} (±{Math.round(location.accuracy)}m)</span>
          </>
        )}
        {!locationLoading && !location && locationError && (
          <>
            <MapPin className="w-4 h-4 text-amber-400 flex-shrink-0" />
            <span className="text-xs text-amber-300/70">{locationError.message}</span>
          </>
        )}
        {!locationLoading && !location && !locationError && (
          <>
            <MapPin className="w-4 h-4 text-white/30 flex-shrink-0" />
            <span className="text-xs text-white/30">定位功能未启用</span>
          </>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        {attendanceTypes.map((item) => (
          <button
            key={item.type}
            onClick={() => onSelect(item.type)}
            className="p-5 rounded-2xl text-left border backdrop-blur-xl transition-all duration-300 hover:scale-[1.02] group"
            style={{ background: 'rgba(255,255,255,0.04)', borderColor: 'rgba(255,255,255,0.06)' }}
          >
            <div
              className="w-12 h-12 rounded-2xl flex items-center justify-center mb-3 transition-transform duration-300 group-hover:scale-110"
              style={{ background: `linear-gradient(135deg, ${item.gradient[0]}, ${item.gradient[1]})`, boxShadow: `0 4px 15px ${item.gradient[0]}40` }}
            >
              <item.icon className="w-6 h-6 text-white" />
            </div>
            <div className="font-semibold text-white/90">{item.label}</div>
            <div className="text-xs text-white/40 mt-1">{item.desc}</div>
          </button>
        ))}
      </div>
    </div>
  );
}

// 完整人脸识别打卡
function FaceCheckinStepFull({ onSuccess }: { onSuccess: () => void }) {
  const handleRecognitionComplete = (result: RecognitionResult) => {
    if (result.success) {
      onSuccess();
    }
  };

  return (
    <div className="space-y-4 mt-4">
      <div className="text-center">
        <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-3" style={{ background: 'linear-gradient(135deg, #3b82f6, #2563eb)', boxShadow: '0 8px 25px rgba(59,130,246,0.35)' }}>
          <Scan className="w-8 h-8 text-white" />
        </div>
        <h2 className="text-xl font-bold text-white/90">人脸识别打卡</h2>
        <p className="text-sm text-white/40 mt-1">请将面部对准摄像头完成识别</p>
      </div>

      <FaceRecognition
        onRecognitionComplete={handleRecognitionComplete}
        selectedAttendanceType="check_in"
        enableLivenessDetection={true}
      />
    </div>
  );
}


// 打卡成功
function SuccessStep({ attendanceType, studentName, studentId, location, locationError }: { attendanceType: AttendanceType; studentName: string; studentId: string; location: LocationData | null; locationError: { code: number; message: string } | null }) {
  const labels: Record<AttendanceType, string> = {
    'check_in': '上课打卡',
    'check_out': '下课打卡',
    'leave': '请假',
    'go_out': '外出',
  };

  // 迟到/缺勤时通知家长
  useEffect(() => {
    const isAbnormal = attendanceType === 'leave' || attendanceType === 'go_out';
    if (isAbnormal && studentId) {
      const parents = getParents();
      const relatedParents = parents.filter(p => p.childId === studentId || (p.childrenIds && p.childrenIds.includes(studentId)));
      relatedParents.forEach(parent => {
        addNotification({
          userId: parent.id,
          title: `${studentName}考勤异常通知`,
          message: `${studentName}于${new Date().toLocaleString('zh-CN')}进行了【${labels[attendanceType]}】操作，请关注。`,
          type: 'attendance_alert',
          read: false,
        });
      });
    }
  }, [attendanceType, studentId, studentName]);

  return (
    <div className="flex flex-col items-center justify-center py-16">
      {/* 成功动画 - 扩散光环 + 粒子 */}
      <div className="relative mb-8">
        {/* 外层扩散光环 */}
        <div className="absolute inset-0 w-28 h-28 rounded-full animate-ping opacity-20" style={{ background: 'radial-gradient(circle, #10b981, transparent)' }} />
        {/* 中层光环 */}
        <div className="absolute -inset-4 w-36 h-36 rounded-full animate-pulse opacity-30" style={{ background: 'radial-gradient(circle, #10b981, transparent)', filter: 'blur(8px)' }} />
        {/* 核心图标 */}
        <div
          className="relative w-28 h-28 rounded-full flex items-center justify-center animate-bounce"
          style={{ background: 'linear-gradient(135deg, #10b981, #059669)', boxShadow: '0 0 40px rgba(16,185,129,0.4), 0 0 80px rgba(16,185,129,0.2)' }}
        >
          <CheckCircle className="w-14 h-14 text-white" />
        </div>
        {/* 装饰粒子 */}
        {[0, 60, 120, 180, 240, 300].map((deg) => (
          <div
            key={deg}
            className="absolute w-2 h-2 rounded-full bg-emerald-400"
            style={{
              top: '50%', left: '50%',
              transform: `rotate(${deg}deg) translateY(-72px)`,
              opacity: 0.6,
              animation: `ping ${1.5 + (deg % 3) * 0.2}s cubic-bezier(0, 0, 0.2, 1) infinite`,
            }}
          />
        ))}
      </div>
      <h2 className="text-2xl font-bold text-white/90 mb-2">{labels[attendanceType]}成功</h2>
      <p className="text-lg font-semibold text-emerald-300/90 mb-1">
        {studentName}已完成签到
      </p>
      <p className="text-sm text-white/40 mb-2">
        {new Date().toLocaleString('zh-CN')}
      </p>

      {/* 定位信息 */}
      <div className="mt-3 mb-2 px-4 py-2.5 rounded-xl border backdrop-blur-xl flex items-center gap-2.5 max-w-xs"
        style={{
          background: location ? 'rgba(16,185,129,0.08)' : 'rgba(245,158,11,0.08)',
          borderColor: location ? 'rgba(16,185,129,0.2)' : 'rgba(245,158,11,0.2)',
        }}>
        <MapPin className={`w-4 h-4 flex-shrink-0 ${location ? 'text-emerald-400' : 'text-amber-400'}`} />
        {location ? (
          <div className="text-left">
            <p className="text-xs text-white/70">{formatLocation(location)}</p>
            <p className="text-[10px] text-white/30">精度 ±{Math.round(location.accuracy)}m</p>
          </div>
        ) : locationError ? (
          <p className="text-xs text-amber-300/70">{locationError.message}</p>
        ) : (
          <div className="flex items-center gap-1.5">
            <Loader2 className="w-3 h-3 text-amber-400 animate-spin" />
            <p className="text-xs text-amber-300/70">正在获取定位...</p>
          </div>
        )}
      </div>

      {(attendanceType === 'leave' || attendanceType === 'go_out') && (
        <p className="text-xs text-amber-400/80 mb-4">已通知家长</p>
      )}
      <button
        onClick={() => window.location.href = '/student'}
        className="mt-4 px-10 py-3.5 rounded-2xl font-semibold text-white transition-all duration-300 hover:scale-[1.02]"
        style={{ background: 'linear-gradient(135deg, #667eea, #764ba2)', boxShadow: '0 8px 25px rgba(102,126,234,0.35)' }}
      >
        返回首页
      </button>
    </div>
  );
}
