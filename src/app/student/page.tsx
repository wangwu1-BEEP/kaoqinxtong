'use client';

import { useState, useEffect, useCallback } from 'react';
import { Calendar, ClipboardList, Megaphone, Camera, Mic, LogOut, User, ChevronRight, FileText, Bell, Home, UserPlus, X, GraduationCap, MessageCircle, Image as ImageIcon, Armchair, Flame, Star } from 'lucide-react';
import { getCurrentUser, getLogout, StoredUser } from '@/lib/userUtils';
import { getClassTimetable, getClassAnnouncements, getAttendanceStats, getAttendanceRecords, TimetableEntry, SharedAnnouncement, SharedAttendanceRecord, getStudents, SharedStudent, updateStudentInSharedData, saveStudents } from '@/lib/sharedData';
import StudentGradeView from '@/components/grades/StudentGradeView';
import ScrollingAnnouncement from '@/components/announcements/ScrollingAnnouncement';
import MessageSystem from '@/components/messages/MessageSystem';
import MediaGallery from '@/components/media/MediaGallery';
import { syncOnLogin } from '@/lib/syncUtils';
import AIAssistant from '@/components/assistant/AIAssistant';
import { cn } from '@/lib/utils';

export default function StudentPage() {
  const [user, setUser] = useState<StoredUser | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  
  // 弹窗状态
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [editName, setEditName] = useState('');
  const [editStudentId, setEditStudentId] = useState('');
  const [editClassId, setEditClassId] = useState('');
  const [showGradeModal, setShowGradeModal] = useState(false);
  const [showMessageModal, setShowMessageModal] = useState(false);
  const [showMediaModal, setShowMediaModal] = useState(false);
  
  // 数据状态
  const [timetable, setTimetable] = useState<TimetableEntry[]>([]);
  const [announcements, setAnnouncements] = useState<SharedAnnouncement[]>([]);
  const [stats, setStats] = useState({ shouldAttend: 0, actualAttend: 0, attendanceRate: 0, lateCount: 0 });
  const [selectedWeekday, setSelectedWeekday] = useState(new Date().getDay());
  const [classes, setClasses] = useState<Array<{id: string; name: string}>>([]);

  const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];

  const [regStatus, setRegStatus] = useState({ faceRegistered: false, voiceRegistered: false, isComplete: false });

  // 初始化
  useEffect(() => {
    const init = async () => {
      try {
        const currentUser = getCurrentUser();
        if (!currentUser) {
          window.location.href = '/login';
          return;
        }
        
        // 先从云端同步最新数据，再检查注册状态
        try { await syncOnLogin(); } catch (e) { console.warn('syncOnLogin failed:', e); }
        
        // 重新读取同步后的本地数据
        const students = getStudents();
        const student = students.find((s: SharedStudent) => s.username === currentUser.username);
        
        if (!student) {
          // 学生不存在（被教师删除）
          localStorage.removeItem('user');
          alert('该账号已被教师删除，请联系教师重新注册。');
          window.location.href = '/login';
          return;
        }
        
        const newRegStatus = {
          faceRegistered: student.faceRegistered || false,
          voiceRegistered: false,
          isComplete: !!(student.faceRegistered)
        };
        setRegStatus(newRegStatus);
        
        if (!newRegStatus.isComplete) {
          // 未完成注册，强制跳转到注册页面
          window.location.href = '/registration';
          return;
        }
        
        setUser(currentUser);
        setEditName(currentUser.name || '');
        setEditStudentId(currentUser.studentId || '');
        setEditClassId(currentUser.classId || '');
        
        // 加载班级列表
        if (typeof window !== 'undefined') {
          const stored = localStorage.getItem('shared_classes');
          if (stored) {
            setClasses(JSON.parse(stored));
          }
        }
      } catch (err) {
        console.error('Student init error:', err);
      }
    };
    
    init();
    
    // 定时更新
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // 加载班级数据
  useEffect(() => {
    if (!user?.classId) return;
    
    const loadData = () => {
      setTimetable(getClassTimetable(user.classId!));
      setAnnouncements(getClassAnnouncements(user.classId!));
      setStats(getAttendanceStats(user.classId!));
    };
    
    loadData();
    const interval = setInterval(loadData, 5000);
    return () => clearInterval(interval);
  }, [user?.classId]);

  // 定期从云端同步，并检查是否被教师删除或注册状态变化
  const checkAfterSync = useCallback(() => {
    if (!user?.username) return;
    const students = getStudents();
    const student = students.find((s: SharedStudent) => s.username === user.username);
    if (!student) {
      localStorage.removeItem('user');
      alert('该账号已被教师删除，请联系教师重新注册。');
      window.location.href = '/login';
      return;
    }
    // 更新注册状态
    setRegStatus({
      faceRegistered: student.faceRegistered || false,
      voiceRegistered: false,
      isComplete: !!(student.faceRegistered)
    });
  }, [user]);

  useEffect(() => {
    if (!user?.username) return;
    // 每30秒从云端同步并检查
    const doSync = async () => {
      try {
        await syncOnLogin();
        checkAfterSync();
      } catch (e) {
        console.warn('Periodic sync failed:', e);
      }
    };
    const interval = setInterval(doSync, 30000);
    return () => clearInterval(interval);
  }, [user, checkAfterSync]);

  const handleLogout = () => {
    getLogout();
    window.location.href = '/login';
  };

  const handleSaveProfile = () => {
    if (!user) return;
    
    // 更新 localStorage 中的 user 对象
    const stored = localStorage.getItem('user');
    if (stored) {
      const userData = JSON.parse(stored);
      userData.name = editName;
      userData.studentId = editStudentId;
      userData.classId = editClassId;
      
      // 更新班级名称
      const classInfo = classes.find(c => c.id === editClassId);
      if (classInfo) {
        userData.className = classInfo.name;
      }
      
      localStorage.setItem('user', JSON.stringify(userData));
      setUser(userData);
    }
    
    // 同步更新 shared_students 学生列表中的信息
    updateStudentInSharedData(user.username, {
      name: editName,
      classId: editClassId,
      className: classes.find(c => c.id === editClassId)?.name,
      studentId: editStudentId,
    });
    
    setShowProfileModal(false);
  };

  const getTodayPeriods = () => {
    const entries = timetable.filter((t: TimetableEntry) => t.dayOfWeek === selectedWeekday);
    return entries.sort((a: TimetableEntry, b: TimetableEntry) => a.period - b.period);
  };

  // 自动判定考勤状态
  const getAttendanceStatus = () => {
    const now = new Date();
    const hour = now.getHours();
    const today = now.toISOString().split('T')[0];
    
    // 检查今天是否已签到
    const todayRecords = getAttendanceRecords().filter(
      (r: SharedAttendanceRecord) => r.studentId === user?.id && r.timestamp.startsWith(today)
    );
    if (todayRecords.length > 0) return 'checked_in';
    
    // 工作日8:00后未签到 → 可能迟到/缺勤
    const dayOfWeek = now.getDay();
    if (dayOfWeek === 0 || dayOfWeek === 6) return 'none'; // 周末不判定
    
    if (hour >= 8 && hour < 9) return 'late';   // 8-9点迟到
    if (hour >= 9) return 'absent';              // 9点后缺勤
    return 'none'; // 8点前正常
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center relative overflow-hidden" style={{ backgroundColor: '#0a0a1a' }}>
        {/* 极光背景 */}
        <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full opacity-10 blur-[100px]" style={{ background: 'linear-gradient(135deg, #667eea, #764ba2)' }} />
        <div className="absolute bottom-[-20%] right-[-10%] w-[40%] h-[40%] rounded-full opacity-8 blur-[80px]" style={{ background: 'linear-gradient(135deg, #3b82f6, #06b6d4)' }} />
        <div className="relative z-10 flex flex-col items-center">
          <div className="w-10 h-10 border-2 border-violet-400 border-t-transparent rounded-full animate-spin mb-3" />
          <p className="text-white/40 text-sm">加载中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-20 relative" style={{ backgroundColor: '#0a0a1a', color: '#fff' }}>
      {/* 极光背景 */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-[-15%] left-[-8%] w-[45%] h-[45%] rounded-full opacity-12 blur-[120px]" style={{ background: 'linear-gradient(135deg, #667eea, #764ba2)' }} />
        <div className="absolute bottom-[-10%] right-[-5%] w-[35%] h-[35%] rounded-full opacity-8 blur-[80px]" style={{ background: 'linear-gradient(135deg, #3b82f6, #06b6d4)' }} />
        <div className="absolute top-[40%] right-[20%] w-[25%] h-[25%] rounded-full opacity-5 blur-[60px]" style={{ background: 'linear-gradient(135deg, #ec4899, #8b5cf6)' }} />
      </div>

      {/* 顶部区域 */}
      <div className="p-4 relative z-10">
        {/* 头部信息 */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-lg font-bold relative" style={{ background: 'linear-gradient(135deg, #667eea, #764ba2)', boxShadow: '0 4px 20px rgba(102,126,234,0.4)' }}>
              {user.name?.charAt(0) || '学'}
            </div>
            <div>
              <div className="text-lg font-semibold">{user.name || '学生'}</div>
              <div className="text-sm text-white/40">{user.className || '未分配班级'}</div>
            </div>
          </div>
          {/* 考勤状态标签 */}
          {(() => {
            const attStatus = getAttendanceStatus();
            if (attStatus === 'checked_in') return (
              <div className="px-3 py-1 rounded-full text-xs font-medium bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                已签到
              </div>
            );
            if (attStatus === 'late') return (
              <div className="px-3 py-1 rounded-full text-xs font-medium bg-amber-500/20 text-amber-400 border border-amber-500/30 animate-pulse">
                可能迟到
              </div>
            );
            if (attStatus === 'absent') return (
              <div className="px-3 py-1 rounded-full text-xs font-medium bg-red-500/20 text-red-400 border border-red-500/30 animate-pulse">
                可能缺勤
              </div>
            );
            return null;
          })()}
          <div className="text-right">
            <div className="text-2xl font-bold" style={{ background: 'linear-gradient(135deg, #67e8f9, #a78bfa)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              {currentTime.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}
            </div>
            <div className="text-sm text-white/30">{currentTime.toLocaleDateString('zh-CN', { month: 'long', day: 'numeric', weekday: 'long' })}</div>
          </div>
        </div>

        {/* 注册状态提示 */}
        {!regStatus.isComplete && (
          <div 
            className="p-4 rounded-xl mb-4 flex items-center gap-3 cursor-pointer"
            style={{ backgroundColor: 'rgba(245, 158, 11, 0.2)' }}
            onClick={() => window.location.href = '/registration'}
          >
            <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: '#f59e0b' }}>
              <UserPlus className="w-5 h-5" />
            </div>
            <div className="flex-1">
              <div className="font-semibold">请先完成身份注册</div>
              <div className="text-sm opacity-80">
                {!regStatus.faceRegistered ? '人脸未注册' : ''}
              </div>
            </div>
            <ChevronRight className="w-5 h-5 opacity-60" />
          </div>
        )}

        {/* 滚动公告 */}
        <ScrollingAnnouncement classId={user?.classId || ''} />

        {/* 统计数据卡片 */}
        <div className="grid grid-cols-4 gap-3 mb-4">
          <div className="rounded-2xl p-3 text-center border backdrop-blur-xl" style={{ background: 'rgba(139,92,246,0.08)', borderColor: 'rgba(139,92,246,0.15)' }}>
            <div className="text-2xl font-bold text-violet-400">{stats.shouldAttend}</div>
            <div className="text-xs text-white/30 mt-1">应到人数</div>
          </div>
          <div className="rounded-2xl p-3 text-center border backdrop-blur-xl" style={{ background: 'rgba(59,130,246,0.08)', borderColor: 'rgba(59,130,246,0.15)' }}>
            <div className="text-2xl font-bold text-blue-400">{stats.actualAttend}</div>
            <div className="text-xs text-white/30 mt-1">已到人数</div>
          </div>
          <div className="rounded-2xl p-3 text-center border backdrop-blur-xl" style={{ background: 'rgba(16,185,129,0.08)', borderColor: 'rgba(16,185,129,0.15)' }}>
            <div className="text-2xl font-bold text-emerald-400">{stats.attendanceRate}%</div>
            <div className="text-xs text-white/30 mt-1">出勤率</div>
          </div>
          <div className="rounded-2xl p-3 text-center border backdrop-blur-xl" style={{ background: 'rgba(239,68,68,0.08)', borderColor: 'rgba(239,68,68,0.15)' }}>
            <div className="text-2xl font-bold text-red-400">{stats.lateCount}</div>
            <div className="text-xs text-white/30 mt-1">迟到人数</div>
          </div>
        </div>

        {/* 快捷操作 - 考勤打卡 */}
        <div className="mb-4">
          <h3 className="text-sm font-medium text-white/30 mb-3">考勤打卡</h3>
          <div className="grid grid-cols-3 gap-3">
            <button
              onClick={() => window.location.href = regStatus.isComplete ? '/checkin' : '/registration'}
              className="flex flex-col items-center gap-2 p-4 rounded-2xl border backdrop-blur-xl transition-all duration-300 hover:scale-[1.03] hover:border-blue-500/30"
              style={{ background: 'rgba(59,130,246,0.08)', borderColor: 'rgba(59,130,246,0.15)' }}
            >
              <Camera className="w-8 h-8 text-blue-400" />
              <span className="text-sm font-medium text-white/70">考勤打卡</span>
            </button>
            <button
              onClick={() => window.location.href = '/registration'}
              className="flex flex-col items-center gap-2 p-4 rounded-2xl border backdrop-blur-xl transition-all duration-300 hover:scale-[1.03] hover:border-violet-500/30"
              style={{ background: 'rgba(139,92,246,0.08)', borderColor: 'rgba(139,92,246,0.15)' }}
            >
              <UserPlus className="w-8 h-8 text-violet-400" />
              <span className="text-sm font-medium text-white/70">
                {regStatus.isComplete ? '重新注册' : '身份注册'}
              </span>
            </button>
            <button
              onClick={() => window.location.href = '/student/records'}
              className="flex flex-col items-center gap-2 p-4 rounded-2xl border backdrop-blur-xl transition-all duration-300 hover:scale-[1.03] hover:border-emerald-500/30"
              style={{ background: 'rgba(16,185,129,0.08)', borderColor: 'rgba(16,185,129,0.15)' }}
            >
              <ClipboardList className="w-8 h-8 text-emerald-400" />
              <span className="text-sm font-medium text-white/70">考勤记录</span>
            </button>
          </div>
        </div>

        {/* 功能模块卡片 */}
        <div className="space-y-3">
          {/* 本周课程表 */}
          <div 
            className="rounded-2xl p-4 flex items-center gap-4 cursor-pointer border backdrop-blur-xl transition-all duration-300 hover:scale-[1.02] hover:border-blue-500/25"
            style={{ background: 'rgba(255,255,255,0.03)', borderColor: 'rgba(255,255,255,0.06)' }}
            onClick={() => window.location.href = '/student/timetable'}
          >
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #3b82f6, #2563eb)', boxShadow: '0 4px 15px rgba(59,130,246,0.3)' }}>
              <Calendar className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1">
              <div className="font-semibold text-base text-white/90">本周课程表</div>
              <div className="text-sm text-white/30 mt-0.5">点击查看详细课程安排</div>
            </div>
            <ChevronRight className="w-5 h-5 text-white/20" />
          </div>

          {/* 班级公告 */}
          <div 
            className="rounded-2xl p-4 flex items-center gap-4 cursor-pointer border backdrop-blur-xl transition-all duration-300 hover:scale-[1.02] hover:border-pink-500/25"
            style={{ background: 'rgba(255,255,255,0.03)', borderColor: 'rgba(255,255,255,0.06)' }}
            onClick={() => window.location.href = '/student/announcements'}
          >
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #ec4899, #db2777)', boxShadow: '0 4px 15px rgba(236,72,153,0.3)' }}>
              <Megaphone className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1">
              <div className="font-semibold text-base text-white/90">班级公告</div>
              <div className="text-sm text-white/30 mt-0.5">
                {announcements.length > 0 ? announcements[0].title : '暂无公告'}
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-white/20" />
          </div>

          {/* 请假申请 */}
          <div 
            className="rounded-2xl p-4 flex items-center gap-4 cursor-pointer border backdrop-blur-xl transition-all duration-300 hover:scale-[1.02] hover:border-amber-500/25"
            style={{ background: 'rgba(255,255,255,0.03)', borderColor: 'rgba(255,255,255,0.06)' }}
            onClick={() => window.location.href = '/student/leave'}
          >
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)', boxShadow: '0 4px 15px rgba(245,158,11,0.3)' }}>
              <FileText className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1">
              <div className="font-semibold text-base text-white/90">请假申请</div>
              <div className="text-sm text-white/30 mt-0.5">提交请假或外出申请</div>
            </div>
            <ChevronRight className="w-5 h-5 text-white/20" />
          </div>

          {/* 考勤报告 */}
          <div 
            className="rounded-2xl p-4 flex items-center gap-4 cursor-pointer border backdrop-blur-xl transition-all duration-300 hover:scale-[1.02] hover:border-violet-500/25"
            style={{ background: 'rgba(255,255,255,0.03)', borderColor: 'rgba(255,255,255,0.06)' }}
            onClick={() => window.location.href = '/student/report'}
          >
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #8b5cf6, #7c3aed)', boxShadow: '0 4px 15px rgba(139,92,246,0.3)' }}>
              <FileText className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1">
              <div className="font-semibold text-base text-white/90">考勤报告</div>
              <div className="text-sm text-white/30 mt-0.5">查看个人考勤统计</div>
            </div>
            <ChevronRight className="w-5 h-5 text-white/20" />
          </div>

          {/* 我的成绩 */}
          <div 
            className="rounded-2xl p-4 flex items-center gap-4 cursor-pointer border backdrop-blur-xl transition-all duration-300 hover:scale-[1.02] hover:border-amber-500/25"
            style={{ background: 'rgba(255,255,255,0.03)', borderColor: 'rgba(255,255,255,0.06)' }}
            onClick={() => setShowGradeModal(true)}
          >
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #f59e0b, #ef4444)', boxShadow: '0 4px 15px rgba(245,158,11,0.3)' }}>
              <GraduationCap className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1">
              <div className="font-semibold text-base text-white/90">我的成绩</div>
              <div className="text-sm text-white/30 mt-0.5">查看考试成绩</div>
            </div>
            <ChevronRight className="w-5 h-5 text-white/20" />
          </div>

          {/* 师生消息 */}
          <div 
            className="rounded-2xl p-4 flex items-center gap-4 cursor-pointer border backdrop-blur-xl transition-all duration-300 hover:scale-[1.02] hover:border-cyan-500/25"
            style={{ background: 'rgba(255,255,255,0.03)', borderColor: 'rgba(255,255,255,0.06)' }}
            onClick={() => setShowMessageModal(true)}
          >
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #06b6d4, #0891b2)', boxShadow: '0 4px 15px rgba(6,182,212,0.3)' }}>
              <MessageCircle className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1">
              <div className="font-semibold text-base text-white/90">师生消息</div>
              <div className="text-sm text-white/30 mt-0.5">与老师交流</div>
            </div>
            <ChevronRight className="w-5 h-5 text-white/20" />
          </div>

          {/* 班级相册 */}
          <div 
            className="rounded-2xl p-4 flex items-center gap-4 cursor-pointer border backdrop-blur-xl transition-all duration-300 hover:scale-[1.02] hover:border-pink-500/25"
            style={{ background: 'rgba(255,255,255,0.03)', borderColor: 'rgba(255,255,255,0.06)' }}
            onClick={() => setShowMediaModal(true)}
          >
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #ec4899, #f43f5e)', boxShadow: '0 4px 15px rgba(236,72,153,0.3)' }}>
              <Camera className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1">
              <div className="font-semibold text-base text-white/90">班级相册</div>
              <div className="text-sm text-white/30 mt-0.5">活动照片与视频</div>
            </div>
            <ChevronRight className="w-5 h-5 text-white/20" />
          </div>

              {/* 我的座位 */}
              <div
                className="rounded-2xl p-4 flex items-center gap-4 cursor-pointer border backdrop-blur-xl transition-all duration-300 hover:scale-[1.02] hover:border-lime-500/25"
                style={{ background: 'rgba(255,255,255,0.03)', borderColor: 'rgba(255,255,255,0.06)' }}
                onClick={() => window.location.href = '/student/seats'}
              >
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #84cc16, #65a30d)', boxShadow: '0 4px 15px rgba(132,204,22,0.3)' }}>
                  <Armchair className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1">
                  <div className="font-semibold text-base text-white/90">我的座位</div>
                  <div className="text-sm text-white/30 mt-0.5">查看班级座位安排</div>
                </div>
                <ChevronRight className="w-5 h-5 text-white/20" />
              </div>

              {/* 课堂表现 */}
              <div
                className="rounded-2xl p-4 flex items-center gap-4 cursor-pointer border backdrop-blur-xl transition-all duration-300 hover:scale-[1.02] hover:border-rose-500/25"
                style={{ background: 'rgba(255,255,255,0.03)', borderColor: 'rgba(255,255,255,0.06)' }}
                onClick={() => window.location.href = '/student/performance'}
              >
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #f43f5e, #e11d48)', boxShadow: '0 4px 15px rgba(244,63,94,0.3)' }}>
                  <Star className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1">
                  <div className="font-semibold text-base text-white/90">课堂表现</div>
                  <div className="text-sm text-white/30 mt-0.5">查看课堂参与评分</div>
                </div>
                <ChevronRight className="w-5 h-5 text-white/20" />
              </div>

              {/* 考勤热力图 */}
              <div
                className="rounded-2xl p-4 flex items-center gap-4 cursor-pointer border backdrop-blur-xl transition-all duration-300 hover:scale-[1.02] hover:border-orange-500/25"
                style={{ background: 'rgba(255,255,255,0.03)', borderColor: 'rgba(255,255,255,0.06)' }}
                onClick={() => window.location.href = '/student/heatmap'}
              >
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #f97316, #ea580c)', boxShadow: '0 4px 15px rgba(249,115,22,0.3)' }}>
                  <Flame className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1">
                  <div className="font-semibold text-base text-white/90">考勤热力图</div>
                  <div className="text-sm text-white/30 mt-0.5">日历视图看出勤</div>
                </div>
                <ChevronRight className="w-5 h-5 text-white/20" />
              </div>
        </div>

        {/* 快捷功能入口 */}
        <div className="mt-4 grid grid-cols-2 gap-3">
          <button
            onClick={() => window.location.href = '/student/notifications'}
            className="py-3 rounded-2xl font-medium flex items-center justify-center gap-2 border backdrop-blur-xl transition-all duration-300 hover:border-violet-500/25"
            style={{ background: 'rgba(255,255,255,0.04)', borderColor: 'rgba(255,255,255,0.08)' }}
          >
            <Bell className="w-5 h-5 text-violet-400" />
            <span className="text-white/60">消息中心</span>
          </button>
          <button
            onClick={() => window.location.href = '/student/reminder'}
            className="py-3 rounded-2xl font-medium flex items-center justify-center gap-2 border backdrop-blur-xl transition-all duration-300 hover:border-cyan-500/25"
            style={{ background: 'rgba(255,255,255,0.04)', borderColor: 'rgba(255,255,255,0.08)' }}
          >
            <Bell className="w-5 h-5 text-cyan-400" />
            <span className="text-white/60">打卡提醒</span>
          </button>
        </div>

        {/* 底部操作 */}
        <div className="mt-4 flex gap-3">
          <button
            onClick={() => {
              setEditName(user.name || '');
              setEditStudentId(user.studentId || '');
              setEditClassId(user.classId || '');
              setShowProfileModal(true);
            }}
            className="flex-1 py-3 rounded-2xl font-medium flex items-center justify-center gap-2 border backdrop-blur-xl transition-all duration-300 hover:border-blue-500/25"
            style={{ background: 'rgba(255,255,255,0.04)', borderColor: 'rgba(255,255,255,0.08)' }}
          >
            <User className="w-5 h-5 text-blue-400" />
            <span className="text-white/60">修改信息</span>
          </button>
          <button
            onClick={handleLogout}
            className="px-6 py-3 rounded-2xl font-medium flex items-center justify-center gap-2 border backdrop-blur-xl transition-all duration-300 hover:bg-red-500/20"
            style={{ background: 'rgba(239,68,68,0.1)', borderColor: 'rgba(239,68,68,0.2)' }}
          >
            <LogOut className="w-5 h-5 text-red-400" />
            <span className="text-red-400">退出</span>
          </button>
        </div>
      </div>

      {/* 修改信息弹窗 */}
      {showProfileModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm" style={{ backgroundColor: 'rgba(0,0,0,0.7)' }}>
          <div className="w-full max-w-sm rounded-2xl p-6 border backdrop-blur-xl" style={{ background: 'rgba(20,20,40,0.95)', borderColor: 'rgba(255,255,255,0.08)' }}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-white/90">修改个人信息</h3>
              <button onClick={() => setShowProfileModal(false)} className="text-white/30 hover:text-white/60 transition-colors">
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-white/40 mb-1">姓名</label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl outline-none border border-white/5 focus:border-violet-500/40 transition-colors text-white/90"
                  style={{ backgroundColor: 'rgba(255,255,255,0.05)' }}
                />
              </div>
              <div>
                <label className="block text-sm text-white/40 mb-1">学号</label>
                <input
                  type="text"
                  value={editStudentId}
                  onChange={(e) => setEditStudentId(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl outline-none border border-white/5 focus:border-violet-500/40 transition-colors text-white/90"
                  style={{ backgroundColor: 'rgba(255,255,255,0.05)' }}
                />
              </div>
              <div>
                <label className="block text-sm text-white/40 mb-1">班级</label>
                <select
                  value={editClassId}
                  onChange={(e) => setEditClassId(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl outline-none border border-white/5 focus:border-violet-500/40 transition-colors text-white/90"
                  style={{ backgroundColor: 'rgba(255,255,255,0.05)' }}
                >
                  <option value="">选择班级</option>
                  {classes.map((cls) => (
                    <option key={cls.id} value={cls.id}>{cls.name}</option>
                  ))}
                </select>
              </div>
              <button
                onClick={handleSaveProfile}
                className="w-full py-3 rounded-xl font-medium text-white"
                style={{ background: 'linear-gradient(135deg, #667eea, #764ba2)', boxShadow: '0 4px 15px rgba(102,126,234,0.3)' }}
              >
                保存修改
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 成绩查看弹窗 */}
      {showGradeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm" style={{ backgroundColor: 'rgba(0,0,0,0.7)' }}>
          <div className="w-full max-w-2xl max-h-[80vh] overflow-auto rounded-2xl p-6 border backdrop-blur-xl" style={{ background: 'rgba(20,20,40,0.95)', borderColor: 'rgba(255,255,255,0.08)' }}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-white/90">我的成绩</h3>
              <button onClick={() => setShowGradeModal(false)} className="text-white/30 hover:text-white/60 transition-colors">
                <X className="w-6 h-6" />
              </button>
            </div>
            <StudentGradeView studentId={user?.id || ''} studentName={user?.name || ''} />
          </div>
        </div>
      )}

      {/* 消息弹窗 */}
      {showMessageModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm" style={{ backgroundColor: 'rgba(0,0,0,0.7)' }}>
          <div className="w-full max-w-2xl max-h-[80vh] overflow-auto rounded-2xl p-6 border backdrop-blur-xl" style={{ background: 'rgba(20,20,40,0.95)', borderColor: 'rgba(255,255,255,0.08)' }}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-white/90">师生消息</h3>
              <button onClick={() => setShowMessageModal(false)} className="text-white/30 hover:text-white/60 transition-colors">
                <X className="w-6 h-6" />
              </button>
            </div>
            <MessageSystem userId={user?.id || ''} userRole="student" />
          </div>
        </div>
      )}

      {/* 班级相册弹窗 */}
      {showMediaModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm" style={{ backgroundColor: 'rgba(0,0,0,0.7)' }}>
          <div className="w-full max-w-3xl max-h-[80vh] overflow-auto rounded-2xl p-6 border backdrop-blur-xl" style={{ background: 'rgba(20,20,40,0.95)', borderColor: 'rgba(255,255,255,0.08)' }}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-white/90">班级相册</h3>
              <button onClick={() => setShowMediaModal(false)} className="text-white/30 hover:text-white/60 transition-colors">
                <X className="w-6 h-6" />
              </button>
            </div>
            <MediaGallery userRole="student" userId={user?.id} userName={user?.name} />
          </div>
        </div>
      )}

      {/* AI 助手 */}
      <AIAssistant />
    </div>
  );
}
