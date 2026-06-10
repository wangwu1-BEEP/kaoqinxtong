'use client';

import { useState, useEffect } from 'react';
import { ArrowLeft, Bell, Clock, CheckCircle } from 'lucide-react';
import { getCurrentUser } from '@/lib/userUtils';
import { getClassTimetable, TimetableEntry, SharedAttendanceRecord } from '@/lib/sharedData';
import { Student } from '@/types/attendance';
import { StoredUser } from '@/lib/userUtils';

export default function StudentReminderPage() {
  const [user, setUser] = useState<StoredUser | null>(null);
  const [timetable, setTimetable] = useState<TimetableEntry[]>([]);
  const [nextClass, setNextClass] = useState<TimetableEntry | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [reminderEnabled, setReminderEnabled] = useState(true);
  const [reminderMinutes, setReminderMinutes] = useState(10);
  const [todayAttendCount, setTodayAttendCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  const getClassStartTime = (period: number): string => {
    const times: Record<number, string> = {
      1: '08:00', 2: '08:50', 3: '09:50', 4: '10:40',
      5: '11:30', 6: '14:00', 7: '14:50', 8: '15:50',
      9: '16:40', 10: '17:30'
    };
    return times[period] || '00:00';
  };

  useEffect(() => {
    const currentUser = getCurrentUser();
    if (!currentUser) {
      window.location.href = '/login';
      return;
    }
    setUser(currentUser);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    if (!user?.classId) return;
    setTimetable(getClassTimetable(user.classId));
  }, [user?.classId]);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!timetable.length) return;

    const now = new Date();
    const currentDay = now.getDay();
    const currentTimeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;

    // 获取今天的课程
    const todayClasses = timetable.filter(t => t.dayOfWeek === currentDay);
    
    // 找下一节未开始的课
    let found = false;
    for (const cls of todayClasses) {
      const classTime = getClassStartTime(cls.period);
      if (classTime > currentTimeStr) {
        setNextClass(cls);
        found = true;
        break;
      }
    }
    if (!found) setNextClass(null);

    // 计算今日已打卡次数
    const stored = localStorage.getItem('shared_attendance');
    if (stored) {
      const today = now.toISOString().split('T')[0];
      const records = JSON.parse(stored) as SharedAttendanceRecord[];
      setTodayAttendCount(records.filter((r) => 
        r.studentId === user?.id && r.timestamp.startsWith(today)
      ).length);
    }
  }, [timetable, currentTime, user]);

  const formatTime = (period: number): string => {
    return getClassStartTime(period);
  };

  const getClassEndTime = (period: number): string => {
    const times: Record<number, string> = {
      1: '08:45', 2: '09:35', 3: '10:35', 4: '11:25',
      5: '12:15', 6: '14:45', 7: '15:35', 8: '16:35',
      9: '17:25', 10: '18:15'
    };
    return times[period] || '00:00';
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#1a1a2e', color: '#fff' }}>
        <div className="text-lg">加载中...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#1a1a2e', color: '#fff' }}>
      {/* 顶部 */}
      <div className="p-4">
        <div className="flex items-center justify-between">
          <button
            onClick={() => window.location.href = '/student'}
            className="flex items-center gap-2 px-4 py-2 rounded-xl"
            style={{ backgroundColor: '#2d2d44' }}
          >
            <ArrowLeft className="w-5 h-5" />
            返回
          </button>
          <div className="text-right">
            <div className="text-lg font-semibold">{currentTime.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}</div>
            <div className="text-sm opacity-60">{currentTime.toLocaleDateString('zh-CN', { weekday: 'long', month: 'long', day: 'numeric' })}</div>
          </div>
        </div>
      </div>

      {/* 内容区 */}
      <div className="px-4 pb-4 space-y-4">
        <h1 className="text-xl font-bold flex items-center gap-2">
          <Bell className="w-6 h-6" />
          智能提醒
        </h1>

        {/* 今日考勤状态 */}
        <div className="p-4 rounded-xl" style={{ backgroundColor: '#2d2d44' }}>
          <div className="text-sm opacity-60 mb-2">今日考勤状态</div>
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full flex items-center justify-center" style={{ backgroundColor: todayAttendCount > 0 ? '#10b981' : '#6b7280' }}>
              <CheckCircle className="w-8 h-8" />
            </div>
            <div>
              <div className="text-2xl font-bold">{todayAttendCount} 次</div>
              <div className="text-sm opacity-60">今日已打卡</div>
            </div>
          </div>
        </div>

        {/* 下一节课 */}
        {nextClass ? (
          <div className="p-4 rounded-xl" style={{ backgroundColor: '#2d2d44' }}>
            <div className="text-sm opacity-60 mb-2">下一节课</div>
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full flex items-center justify-center" style={{ backgroundColor: '#3b82f6' }}>
                <Clock className="w-8 h-8" />
              </div>
              <div>
                <div className="text-xl font-bold">{nextClass.subject}</div>
                <div className="text-sm opacity-60">
                  {formatTime(nextClass.period)} - {getClassEndTime(nextClass.period)}
                </div>
                {nextClass.teacher && (
                  <div className="text-sm opacity-60">教师：{nextClass.teacher}</div>
                )}
              </div>
            </div>
            <div className="mt-3 p-3 rounded-lg text-center" style={{ backgroundColor: '#3b82f6' }}>
              建议提前 {reminderMinutes} 分钟到达教室
            </div>
          </div>
        ) : (
          <div className="p-4 rounded-xl text-center" style={{ backgroundColor: '#2d2d44' }}>
            <div className="opacity-60">今日课程已全部结束</div>
          </div>
        )}

        {/* 提醒设置 */}
        <div className="p-4 rounded-xl" style={{ backgroundColor: '#2d2d44' }}>
          <div className="text-sm font-medium mb-3">提醒设置</div>
          <div className="flex items-center justify-between mb-3">
            <span>开启打卡提醒</span>
            <button
              onClick={() => setReminderEnabled(!reminderEnabled)}
              className="w-12 h-6 rounded-full transition-colors"
              style={{ backgroundColor: reminderEnabled ? '#10b981' : '#4b5563' }}
            >
              <div
                className="w-5 h-5 rounded-full transition-transform"
                style={{
                  backgroundColor: '#fff',
                  transform: reminderEnabled ? 'translateX(24px)' : 'translateX(2px)'
                }}
              />
            </button>
          </div>
          {reminderEnabled && (
            <div className="flex items-center gap-3">
              <span className="text-sm opacity-60">提前</span>
              <select
                value={reminderMinutes}
                onChange={(e) => setReminderMinutes(Number(e.target.value))}
                className="px-3 py-2 rounded-lg"
                style={{ backgroundColor: '#1a1a2e' }}
              >
                <option value={5}>5</option>
                <option value={10}>10</option>
                <option value={15}>15</option>
                <option value={30}>30</option>
              </select>
              <span className="text-sm opacity-60">分钟提醒</span>
            </div>
          )}
        </div>

        {/* 快捷操作 */}
        <button
          onClick={() => window.location.href = '/checkin'}
          className="w-full py-4 rounded-xl font-medium"
          style={{ backgroundColor: '#10b981' }}
        >
          去打卡
        </button>
      </div>
    </div>
  );
}
