'use client';

import React, { useState, useEffect, useMemo } from 'react';
import type { ParentInfo } from '@/types/attendance';
import { useRouter } from 'next/navigation';
import { getCurrentUser, getStudents, getGrades, getLeaveRequests, getAttendanceRecords, getPointRecords, getParents } from '@/lib/sharedData';
import ParentDashboard from '@/components/parent/ParentDashboard';
import MediaGallery from '@/components/media/MediaGallery';
import ScrollingAnnouncement from '@/components/announcements/ScrollingAnnouncement';
import ParentTeacherMessage from '@/components/messages/ParentTeacherMessage';
import AIAssistant from '@/components/assistant/AIAssistant';
import { LogOut, BarChart3, Image as ImageIcon, Bell, MessageCircle, CheckCircle2, XCircle, Clock, GraduationCap, Sparkles, Flame, Armchair, Star, Trophy } from 'lucide-react';
import AttendanceHeatmap from '@/components/attendance/AttendanceHeatmap';
import SeatManager from '@/components/seats/SeatManager';
import ClassPerformancePanel from '@/components/performance/ClassPerformancePanel';
import PointsPanel from '@/components/points/PointsPanel';
import { syncOnLogin } from '@/lib/syncUtils';

// 家长通知组件 - 只显示与孩子相关的事件通知
function ParentNotifications({ childId }: { childId: string }) {
  const [notifications, setNotifications] = useState<Array<{
    id: string;
    type: 'grade' | 'leave' | 'attendance';
    title: string;
    message: string;
    time: string;
    icon: React.ReactNode;
    glowColor: string;
  }>>([]);

  useEffect(() => {
    const notifs: typeof notifications = [];

    const grades = getGrades().filter(g => g.studentId === childId);
    grades.forEach(g => {
      notifs.push({
        id: `grade-${g.id}`,
        type: 'grade',
        title: '成绩发布',
        message: `${g.subject} - ${g.examName}: ${g.score}分`,
        time: g.date,
        icon: <GraduationCap className="h-4 w-4" />,
        glowColor: 'violet',
      });
    });

    const leaves = getLeaveRequests().filter(l => l.studentId === childId);
    leaves.forEach(l => {
      const statusMap: Record<string, { label: string; icon: React.ReactNode; glowColor: string }> = {
        approved: { label: '已批准', icon: <CheckCircle2 className="h-4 w-4" />, glowColor: 'emerald' },
        rejected: { label: '已拒绝', icon: <XCircle className="h-4 w-4" />, glowColor: 'red' },
        pending: { label: '待审批', icon: <Clock className="h-4 w-4" />, glowColor: 'amber' },
      };
      const s = statusMap[l.status] || statusMap.pending;
      notifs.push({
        id: `leave-${l.id}`,
        type: 'leave',
        title: '请假审批',
        message: `${l.reason} (${l.startDate} ~ ${l.endDate}) - ${s.label}`,
        time: l.createdAt,
        icon: s.icon,
        glowColor: s.glowColor,
      });
    });

    const attendance = getAttendanceRecords().filter(a => a.studentId === childId);
    const today = new Date().toLocaleDateString('zh-CN');
    const todayRecords = attendance.filter(a =>
      new Date(a.timestamp).toLocaleDateString('zh-CN') === today
    );
    if (todayRecords.length === 0) {
      notifs.push({
        id: 'attendance-none-today',
        type: 'attendance',
        title: '考勤提醒',
        message: '今日暂无考勤记录',
        time: new Date().toISOString(),
        icon: <Bell className="h-4 w-4" />,
        glowColor: 'amber',
      });
    }

    notifs.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());
    setNotifications(notifs);
  }, [childId]);

  const glowStyles: Record<string, { bg: string; border: string; iconBg: string; text: string }> = {
    violet: { bg: 'bg-violet-500/10', border: 'border-violet-500/20', iconBg: 'bg-violet-500/20', text: 'text-violet-400' },
    emerald: { bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', iconBg: 'bg-emerald-500/20', text: 'text-emerald-400' },
    red: { bg: 'bg-red-500/10', border: 'border-red-500/20', iconBg: 'bg-red-500/20', text: 'text-red-400' },
    amber: { bg: 'bg-amber-500/10', border: 'border-amber-500/20', iconBg: 'bg-amber-500/20', text: 'text-amber-400' },
  };

  return (
    <div className="space-y-3">
      {notifications.length === 0 ? (
        <div className="rounded-2xl border border-white/5 backdrop-blur-xl flex flex-col items-center py-16"
          style={{ background: 'rgba(255,255,255,0.03)' }}>
          <Sparkles className="w-12 h-12 text-white/10 mb-3" />
          <p className="text-white/30">暂无通知</p>
          <p className="text-white/15 text-sm mt-1">有新消息时会在这里提醒您</p>
        </div>
      ) : (
        notifications.map(n => {
          const s = glowStyles[n.glowColor] || glowStyles.amber;
          return (
            <div key={n.id}
              className={`rounded-2xl p-4 border backdrop-blur-xl flex items-start gap-3 transition-all duration-300 hover:scale-[1.01] ${s.bg} ${s.border}`}>
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${s.iconBg} ${s.text}`}>
                {n.icon}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-sm text-white/90">{n.title}</span>
                  <span className="text-xs text-white/25 flex-shrink-0 ml-2">
                    {new Date(n.time).toLocaleDateString('zh-CN')}
                  </span>
                </div>
                <p className="text-sm text-white/50 mt-0.5">{n.message}</p>
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}

export default function ParentPage() {
  const router = useRouter();
  const [user, setUser] = useState<{ id: string; username: string; name?: string; role: string; childId?: string; childName?: string; classId?: string; className?: string } | null>(null);
  const [mounted, setMounted] = useState(false);
  const [activeTab, setActiveTab] = useState('dashboard');

  useEffect(() => {
    setMounted(true);
    const u = getCurrentUser();
    if (!u || u.role !== 'parent') {
      router.replace('/login');
      return;
    }
    setUser(u as typeof user);
    // 从云端同步最新数据（成绩、考勤、积分等），同步后更新本地用户信息
    syncOnLogin().then(() => {
      // 同步后，用云端最新的家长数据更新用户对象
      const parents = getParents();
      const updatedParent = parents.find((p: ParentInfo) => p.id === u.id);
      if (updatedParent && (updatedParent.childId || updatedParent.childName)) {
        const updatedUser = {
          ...u,
          childId: updatedParent.childId || u.childId,
          childName: updatedParent.childName,
          classId: updatedParent.classId || u.classId,
          className: updatedParent.className || u.className,
        };
        localStorage.setItem('user', JSON.stringify(updatedUser));
        setUser(updatedUser as typeof user);
      }
    }).catch(e => console.warn('家长端同步失败:', e));
  }, [router]);

  const handleLogout = () => {
    localStorage.removeItem('user');
    localStorage.removeItem('current_user');
    router.replace('/login');
  };

  // 从孩子ID获取班级ID和孩子姓名
  const childInfo = useMemo(() => {
    if (!user?.childId) return { classId: '', childName: '' };
    const students = getStudents();
    const child = students.find(s => s.id === user.childId);
    return { classId: child?.classId || '', childName: child?.name || '' };
  }, [user]);

  if (!mounted || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#0a0a1a' }}>
        <div className="flex flex-col items-center">
          <div className="w-10 h-10 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin mb-3" />
          <p className="text-white/30">加载中...</p>
        </div>
      </div>
    );
  }

  const tabs = [
    { id: 'dashboard', label: '学习概览', icon: BarChart3 },
    { id: 'heatmap', label: '考勤热力图', icon: Flame },
    { id: 'seats', label: '座位表', icon: Armchair },
    { id: 'performance', label: '课堂表现', icon: Star },
    { id: 'points', label: '积分奖励', icon: Trophy },
    { id: 'messages', label: '家校沟通', icon: MessageCircle },
    { id: 'media', label: '班级相册', icon: ImageIcon },
    { id: 'notifications', label: '通知', icon: Bell },
  ];

  return (
    <div className="min-h-screen relative" style={{ background: '#0a0a1a', color: '#fff' }}>
      {/* 极光背景 */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-[-10%] left-[-5%] w-[40%] h-[40%] rounded-full opacity-15 blur-[100px]"
          style={{ background: 'linear-gradient(135deg, #0ea5e9, #06b6d4)' }} />
        <div className="absolute bottom-[-10%] right-[-5%] w-[35%] h-[35%] rounded-full opacity-10 blur-[80px]"
          style={{ background: 'linear-gradient(135deg, #10b981, #06b6d4)' }} />
      </div>

      {/* 顶部导航 */}
      <header className="sticky top-0 z-20 backdrop-blur-xl border-b border-white/5"
        style={{ background: 'rgba(10,10,26,0.8)' }}>
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center shadow-lg"
              style={{ background: 'linear-gradient(135deg, #0ea5e9, #06b6d4)', boxShadow: '0 4px 15px rgba(14,165,233,0.3)' }}>
              <GraduationCap className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-base font-bold text-white/90">家长端</h1>
              <p className="text-xs text-white/30">{user.username}</p>
            </div>
          </div>
          <button onClick={handleLogout}
            className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-white/40 hover:text-red-400 hover:bg-red-500/10 transition-all text-sm">
            <LogOut className="h-4 w-4" />
            退出
          </button>
        </div>
      </header>

      {/* 滚动公告 */}
      <ScrollingAnnouncement />

      {/* Tab 导航 */}
      <div className="sticky top-[57px] z-10 backdrop-blur-xl border-b border-white/5"
        style={{ background: 'rgba(10,10,26,0.6)' }}>
        <div className="max-w-4xl mx-auto px-4 py-2">
          <div className="flex gap-1 p-1 rounded-2xl" style={{ background: 'rgba(255,255,255,0.04)' }}>
            {tabs.map(tab => (
              <button key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-medium transition-all duration-300 ${
                  activeTab === tab.id ? 'text-white' : 'text-white/30 hover:text-white/50'
                }`}
                style={activeTab === tab.id ? {
                  background: 'linear-gradient(135deg, rgba(14,165,233,0.2), rgba(6,182,212,0.2))',
                  boxShadow: '0 0 20px rgba(14,165,233,0.1), inset 0 1px 0 rgba(255,255,255,0.1)',
                } : {}}>
                <tab.icon className="h-4 w-4" />
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 主内容 */}
      <main className="max-w-4xl mx-auto px-4 py-4 relative z-10">
        {activeTab === 'dashboard' && <ParentDashboard parentId={user.id} childId={user.childId || ''} />}
        {activeTab === 'heatmap' && <AttendanceHeatmap classId={childInfo.classId} studentId={user.childId} studentName={childInfo.childName} />}
        {activeTab === 'seats' && <SeatManager classId={childInfo.classId} readOnly />}
        {activeTab === 'performance' && <ClassPerformancePanel classId={childInfo.classId} studentView={{ studentId: user.childId || '', studentName: childInfo.childName }} />}
        {activeTab === 'points' && <PointsPanel classId={childInfo.classId} />}
        {activeTab === 'messages' && <ParentTeacherMessage userId={user.id} userName={user.username} userRole="parent" />}
        {activeTab === 'media' && <MediaGallery userRole="parent" userId={user?.id} userName={user?.name} />}
        {activeTab === 'notifications' && <ParentNotifications childId={user.childId || ''} />}
      </main>

      {/* AI 小助手 */}
      <AIAssistant />
    </div>
  );
}
