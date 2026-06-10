'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Users, CheckCircle, Clock, AlertTriangle, MessageCircle,
  CalendarDays, TrendingUp, Bell, ArrowRight, FileDown
} from 'lucide-react';
import {
  getStudents, getAttendanceRecords, getMessages,
  getLeaveRequests, getDutySchedules, getClassPerformances,
  getUnreadMessageCount
} from '@/lib/sharedData';
import type { LeaveRequest } from '@/types/attendance';
import { cn } from '@/lib/utils';

interface TeacherDashboardProps {
  classId: string;
  teacherId?: string;
  teacherName?: string;
  onNavigate?: (tab: string) => void;
}

export default function TeacherDashboard({ classId, teacherId, teacherName, onNavigate }: TeacherDashboardProps) {
  const [now, setNow] = useState<Date | null>(null);
  const [exportMsg, setExportMsg] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    setNow(new Date());
    // 每10秒刷新一次统计数据（如未读消息数）
    const interval = setInterval(() => setRefreshKey(k => k + 1), 10000);
    return () => clearInterval(interval);
  }, []);

  // 数据统计
  const stats = useMemo(() => {
    const students = getStudents().filter(s => s.classId === classId);
    const today = new Date().toISOString().split('T')[0];
    const classRecords = getAttendanceRecords().filter(r => r.classId === classId);
    const todayRecords = classRecords.filter(r => r.timestamp.startsWith(today));
    const checkedInToday = new Set(todayRecords.filter(r => r.type === 'check_in').map(r => r.studentId)).size;
    const allLeaves = getLeaveRequests();
    const pendingLeaves = allLeaves.filter(l => l.status === 'pending' && l.classId === classId);

    const unreadMsgs = getUnreadMessageCount(teacherId || 'teacher');
    const todayDuty = getDutySchedules(classId).filter(s => s.date === today);
    const recentPerformances = getClassPerformances(classId).slice(-5);

    // 本周出勤趋势
    const weekDays: { day: string; rate: number }[] = [];
    const weekStart = new Date();
    const dayOfWeek = weekStart.getDay() || 7;
    weekStart.setDate(weekStart.getDate() - dayOfWeek + 1);
    for (let i = 0; i < 5; i++) {
      const d = new Date(weekStart);
      d.setDate(d.getDate() + i);
      const dateKey = d.toISOString().split('T')[0];
      const dayRecords = classRecords.filter(r => r.timestamp.startsWith(dateKey) && r.type === 'check_in');
      const checkedCount = new Set(dayRecords.map(r => r.studentId)).size;
      const rate = students.length > 0 ? (checkedCount / students.length * 100) : 0;
      weekDays.push({ day: ['周一', '周二', '周三', '周四', '周五'][i], rate });
    }

    return {
      totalStudents: students.length,
      checkedInToday,
      absentToday: students.length - checkedInToday,
      checkInRate: students.length > 0 ? (checkedInToday / students.length * 100).toFixed(1) : '0',
      pendingLeaves: pendingLeaves.length,
      unreadMsgs,
      todayDuty,
      weekDays,
      recentPerformances,
      students,
    };
  }, [classId, teacherId, refreshKey]);

  const handleExport = useCallback((format: 'csv' | 'json') => {
    const students = getStudents().filter(s => s.classId === classId);
    const today = new Date().toISOString().split('T')[0];
    const classRecords = getAttendanceRecords().filter(r => r.classId === classId);
    const todayRecords = classRecords.filter(r => r.timestamp.startsWith(today));
    const pendingLeaves = getLeaveRequests().filter(l => l.status === 'pending' && l.classId === classId);

    if (format === 'json') {
      const exportData = {
        导出时间: new Date().toLocaleString('zh-CN'),
        班级ID: classId,
        今日统计: {
          总人数: students.length,
          已签到: new Set(todayRecords.filter(r => r.type === 'check_in').map(r => r.studentId)).size,
          出勤率: stats.checkInRate + '%',
          待审批请假: pendingLeaves.length,
          未读消息: stats.unreadMsgs,
        },
        学生列表: students.map(s => ({ 姓名: s.name, 学号: s.id, 班级: s.classId })),
        今日考勤记录: todayRecords.map(r => ({
          学生ID: r.studentId, 类型: r.type, 时间: r.timestamp,
          纬度: r.latitude || '', 经度: r.longitude || '', 定位精度: r.locationAccuracy ? `${Math.round(r.locationAccuracy)}m` : '',
        })),
        待审批请假: pendingLeaves.map(l => ({ 学生: l.studentName, 原因: l.reason, 开始: l.startDate, 结束: l.endDate })),
      };
      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `数据看板_${today}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } else {
      const rows = students.map(s => {
        const checkedIn = todayRecords.some(r => r.studentId === s.id && r.type === 'check_in');
        const locRecord = todayRecords.find(r => r.studentId === s.id);
        const loc = locRecord?.latitude && locRecord?.longitude ? `${locRecord.latitude.toFixed(6)},${locRecord.longitude.toFixed(6)}` : '';
        return `${s.name},${s.id},${s.classId},${checkedIn ? '已签到' : '未签到'},${loc}`;
      });
      const csv = '\uFEFF姓名,学号,班级,签到状态,定位(经纬度)\n' + rows.join('\n');
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `数据看板_${today}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    }
    setExportMsg('导出成功!');
    setTimeout(() => setExportMsg(''), 3000);
  }, [classId, stats]);

  if (!now) return null;

  const displayName = teacherName || '教师';
  const surname = displayName.replace(/老师$/, '').charAt(0);

  const greeting = (() => {
    const h = now.getHours();
    if (h < 6) return '夜深了';
    if (h < 12) return '早上好';
    if (h < 14) return '中午好';
    if (h < 18) return '下午好';
    return '晚上好';
  })();

  return (
    <div className="space-y-4">
      {/* 问候语 */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white/90">{greeting}，{surname}老师</h2>
          <p className="text-sm text-white/40 mt-1">
            {now.toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' })}
          </p>
        </div>
        {stats.unreadMsgs > 0 && (
          <button
            onClick={() => onNavigate?.('parentMsg')}
            className="relative p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-all"
          >
            <Bell className="w-5 h-5 text-white/60" />
            <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-red-500 text-white text-[10px] flex items-center justify-center font-bold">
              {stats.unreadMsgs}
            </span>
          </button>
        )}
      </div>

      {/* 核心数据卡片 */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <button
          onClick={() => onNavigate?.('attendance')}
          className="p-4 rounded-xl bg-gradient-to-br from-blue-500/10 to-cyan-500/10 border border-blue-500/15 text-left hover:scale-[1.02] transition-all"
        >
          <Users className="w-5 h-5 text-blue-400 mb-2" />
          <div className="text-2xl font-bold text-white/90">{stats.totalStudents}</div>
          <div className="text-xs text-white/40">班级人数</div>
        </button>

        <button
          onClick={() => onNavigate?.('attendance')}
          className="p-4 rounded-xl bg-gradient-to-br from-emerald-500/10 to-green-500/10 border border-emerald-500/15 text-left hover:scale-[1.02] transition-all"
        >
          <CheckCircle className="w-5 h-5 text-emerald-400 mb-2" />
          <div className="text-2xl font-bold text-white/90">{stats.checkedInToday}</div>
          <div className="text-xs text-white/40">今日出勤</div>
        </button>

        <button
          onClick={() => onNavigate?.('leave')}
          className="p-4 rounded-xl bg-gradient-to-br from-amber-500/10 to-orange-500/10 border border-amber-500/15 text-left hover:scale-[1.02] transition-all"
        >
          <AlertTriangle className="w-5 h-5 text-amber-400 mb-2" />
          <div className="text-2xl font-bold text-white/90">{stats.pendingLeaves}</div>
          <div className="text-xs text-white/40">待审批请假</div>
        </button>

        <button
          onClick={() => onNavigate?.('parentMsg')}
          className="p-4 rounded-xl bg-gradient-to-br from-purple-500/10 to-pink-500/10 border border-purple-500/15 text-left hover:scale-[1.02] transition-all"
        >
          <MessageCircle className="w-5 h-5 text-purple-400 mb-2" />
          <div className="text-2xl font-bold text-white/90">{stats.unreadMsgs}</div>
          <div className="text-xs text-white/40">家校沟通</div>
        </button>
      </div>

      {/* 出勤率圆环 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="p-4 rounded-xl bg-white/[0.03] border border-white/5">
          <h3 className="text-sm font-bold text-white/70 mb-3">今日出勤率</h3>
          <div className="flex items-center justify-center">
            <div className="relative w-32 h-32">
              <svg className="w-32 h-32 -rotate-90" viewBox="0 0 120 120">
                <circle cx="60" cy="60" r="52" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="8" />
                <circle
                  cx="60" cy="60" r="52" fill="none"
                  stroke="url(#attendanceGrad)"
                  strokeWidth="8"
                  strokeLinecap="round"
                  strokeDasharray={`${parseFloat(stats.checkInRate) / 100 * 326.7} 326.7`}
                />
                <defs>
                  <linearGradient id="attendanceGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#06b6d4" />
                    <stop offset="100%" stopColor="#3b82f6" />
                  </linearGradient>
                </defs>
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-2xl font-bold text-white/90">{stats.checkInRate}%</span>
                <span className="text-[10px] text-white/30">出勤率</span>
              </div>
            </div>
          </div>
        </div>

        {/* 本周出勤趋势 */}
        <div className="p-4 rounded-xl bg-white/[0.03] border border-white/5">
          <h3 className="text-sm font-bold text-white/70 mb-3 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-cyan-400" />
            本周出勤趋势
          </h3>
          <div className="flex items-end gap-2 h-24">
            {stats.weekDays.map((d, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-1">
                <span className="text-[9px] text-white/30">{d.rate.toFixed(0)}%</span>
                <div className="w-full rounded-t bg-gradient-to-t from-cyan-500/40 to-blue-500/60 transition-all" style={{ height: `${Math.max(d.rate, 4)}%` }} />
                <span className="text-[10px] text-white/40">{d.day}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 快捷操作 */}
      <div className="p-4 rounded-xl bg-white/[0.03] border border-white/5">
        <h3 className="text-sm font-bold text-white/70 mb-3">快捷操作</h3>
        <div className="grid grid-cols-3 gap-2">
          {[
            { label: '考勤管理', icon: Clock, tab: 'attendance', color: 'from-emerald-500/20 to-teal-500/20' },
            { label: '座位表', icon: Users, tab: 'seats', color: 'from-blue-500/20 to-cyan-500/20' },
            { label: '值日安排', icon: CalendarDays, tab: 'duty', color: 'from-amber-500/20 to-orange-500/20' },
          ].map(item => (
            <button
              key={item.tab}
              onClick={() => onNavigate?.(item.tab)}
              className={`p-3 rounded-xl bg-gradient-to-br ${item.color} border border-white/5 flex flex-col items-center gap-2 hover:scale-[1.02] transition-all`}
            >
              <item.icon className="w-5 h-5 text-white/60" />
              <span className="text-xs text-white/60">{item.label}</span>
              <ArrowRight className="w-3 h-3 text-white/20" />
            </button>
          ))}
        </div>
      </div>

      {/* 导出看板 */}
      <div className="p-4 rounded-xl bg-white/[0.03] border border-white/5">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-bold text-white/70 flex items-center gap-2">
            <FileDown className="w-4 h-4 text-cyan-400" />
            数据导出
          </h3>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button onClick={() => handleExport('csv')} className="px-3 py-1.5 text-xs rounded-lg bg-cyan-500/20 text-cyan-300 hover:bg-cyan-500/30 transition-colors">导出 CSV</button>
          <button onClick={() => handleExport('json')} className="px-3 py-1.5 text-xs rounded-lg bg-violet-500/20 text-violet-300 hover:bg-violet-500/30 transition-colors">导出 JSON</button>
        </div>
        {exportMsg && <p className="text-xs text-emerald-400 mt-2">{exportMsg}</p>}
      </div>

      {/* 今日值日 & 最近评分 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* 今日值日 */}
        <div className="p-4 rounded-xl bg-white/[0.03] border border-white/5">
          <h3 className="text-sm font-bold text-white/70 mb-2 flex items-center gap-2">
            <CalendarDays className="w-4 h-4 text-amber-400" />
            今日值日
          </h3>
          {stats.todayDuty.length > 0 ? (
            <div className="space-y-1.5">
              {stats.todayDuty.map(d => (
                <div key={d.id} className="text-xs text-white/50">
                  <span className="text-amber-300 font-medium">{d.dutyType}</span>: {d.studentNames.join('、')}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-white/25">今日无值日安排</p>
          )}
        </div>

        {/* 待处理 */}
        <div className="p-4 rounded-xl bg-white/[0.03] border border-white/5">
          <h3 className="text-sm font-bold text-white/70 mb-2 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-400" />
            待处理
          </h3>
          <div className="space-y-1.5 text-xs">
            {stats.pendingLeaves > 0 && (
              <button onClick={() => onNavigate?.('leave')} className="text-amber-300 hover:underline">
                {stats.pendingLeaves}条请假待审批
              </button>
            )}
            {stats.unreadMsgs > 0 && (
              <button onClick={() => onNavigate?.('parentMsg')} className="text-blue-300 hover:underline block">
                {stats.unreadMsgs}条家校沟通消息未读
              </button>
            )}
            {stats.absentToday > 0 && (
              <p className="text-red-300">{stats.absentToday}人未签到</p>
            )}
            {stats.pendingLeaves === 0 && stats.unreadMsgs === 0 && stats.absentToday === 0 && (
              <p className="text-white/25">暂无待处理事项</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
