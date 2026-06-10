'use client';

import { useState, useEffect, useMemo } from 'react';
import { ArrowLeft, Calendar, Clock, BookOpen } from 'lucide-react';
import { getCurrentUser } from '@/lib/userUtils';
import { getClassTimetable, TimetableEntry } from '@/lib/sharedData';
import { syncOnLogin } from '@/lib/syncUtils';
import { cn } from '@/lib/utils';

import { StoredUser } from '@/lib/userUtils';

const weekdays = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];
const dayOfWeekMap = [1, 2, 3, 4, 5, 6, 0]; // 周一→1, ..., 周日→0

const subjectColors: Record<string, string> = {
  '语文': 'from-rose-500 to-pink-600',
  '数学': 'from-blue-500 to-indigo-600',
  '英语': 'from-emerald-500 to-teal-600',
  '物理': 'from-amber-500 to-orange-600',
  '化学': 'from-purple-500 to-violet-600',
  '生物': 'from-green-500 to-lime-600',
  '历史': 'from-yellow-600 to-amber-700',
  '地理': 'from-cyan-500 to-sky-600',
  '政治': 'from-red-500 to-rose-600',
  '体育': 'from-orange-400 to-red-500',
  '音乐': 'from-pink-400 to-fuchsia-600',
  '美术': 'from-violet-400 to-purple-600',
  '信息': 'from-slate-400 to-zinc-600',
  '班会': 'from-gray-400 to-gray-600',
};

function getSubjectColor(subject: string): string {
  for (const [key, val] of Object.entries(subjectColors)) {
    if (subject.includes(key)) return val;
  }
  return 'from-slate-500 to-slate-700';
}

const periodTimes = [
  { period: 1, start: '08:00', end: '08:45' },
  { period: 2, start: '08:55', end: '09:40' },
  { period: 3, start: '10:00', end: '10:45' },
  { period: 4, start: '10:55', end: '11:40' },
  { period: 5, start: '14:00', end: '14:45' },
  { period: 6, start: '14:55', end: '15:40' },
  { period: 7, start: '16:00', end: '16:45' },
  { period: 8, start: '16:55', end: '17:40' },
];

export default function StudentTimetablePage() {
  const [user, setUser] = useState<StoredUser | null>(null);
  const [timetable, setTimetable] = useState<TimetableEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    setNow(new Date());
    const timer = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const currentUser = getCurrentUser();
    if (!currentUser) {
      window.location.href = '/login';
      return;
    }
    setUser(currentUser);
    syncOnLogin().then(() => {
      if (currentUser.classId) {
        setTimetable(getClassTimetable(currentUser.classId));
      }
    }).finally(() => {
      setIsLoading(false);
    });
  }, []);

  const todayDayOfWeek = now ? now.getDay() : new Date().getDay();

  // 判断当前正在上的课
  const currentPeriod = useMemo(() => {
    if (!now) return null;
    const nowMinutes = now.getHours() * 60 + now.getMinutes();
    for (const pt of periodTimes) {
      const [sh, sm] = pt.start.split(':').map(Number);
      const [eh, em] = pt.end.split(':').map(Number);
      const startMin = sh * 60 + sm;
      const endMin = eh * 60 + em;
      if (nowMinutes >= startMin && nowMinutes <= endMin) {
        return pt.period;
      }
    }
    return null;
  }, [now]);

  // 构建网格数据: dayIndex(0=周一...6=周日) x period
  const gridData = useMemo(() => {
    const grid: (TimetableEntry | null)[][] = [];
    const maxPeriod = Math.max(
      8,
      ...timetable.map(t => t.period)
    );
    for (let dayIdx = 0; dayIdx < 7; dayIdx++) {
      const dayEntries: (TimetableEntry | null)[] = [];
      for (let p = 1; p <= maxPeriod; p++) {
        const entry = timetable.find(t => t.dayOfWeek === dayOfWeekMap[dayIdx] && t.period === p);
        dayEntries.push(entry || null);
      }
      grid.push(dayEntries);
    }
    return grid;
  }, [timetable]);

  const maxPeriods = gridData[0]?.length || 8;

  // 今日课程列表
  const todayEntries = useMemo(() => {
    return timetable
      .filter(t => t.dayOfWeek === todayDayOfWeek)
      .sort((a, b) => a.period - b.period);
  }, [timetable, todayDayOfWeek]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#1a1a2e', color: '#fff' }}>
        <div>加载中...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-6" style={{ backgroundColor: '#1a1a2e', color: '#fff' }}>
      {/* 顶部 */}
      <div className="p-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => window.location.href = '/student'}
            className="flex items-center gap-2 px-4 py-2 rounded-xl"
            style={{ backgroundColor: '#2d2d44' }}
          >
            <ArrowLeft className="w-5 h-5" />
            返回
          </button>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <Calendar className="w-5 h-5 text-blue-400" />
            课程表
          </h1>
        </div>
        <div className="flex gap-1 p-1 rounded-lg" style={{ backgroundColor: '#2d2d44' }}>
          <button
            onClick={() => setViewMode('grid')}
            className={cn("px-3 py-1.5 rounded-md text-sm transition-all", viewMode === 'grid' ? 'bg-blue-500 font-bold' : 'opacity-60')}
          >
            网格
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={cn("px-3 py-1.5 rounded-md text-sm transition-all", viewMode === 'list' ? 'bg-blue-500 font-bold' : 'opacity-60')}
          >
            列表
          </button>
        </div>
      </div>

      {/* 当前课程提示 */}
      {currentPeriod && now && todayDayOfWeek >= 1 && todayDayOfWeek <= 5 && (() => {
        const currentEntry = timetable.find(t => t.dayOfWeek === todayDayOfWeek && t.period === currentPeriod);
        if (!currentEntry) return null;
        const pt = periodTimes.find(p => p.period === currentPeriod);
        return (
          <div className="mx-4 mb-4 p-3 rounded-xl bg-gradient-to-r from-blue-500/20 to-purple-500/20 border border-blue-500/30 flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            <span className="text-sm text-blue-300">正在上课：</span>
            <span className="font-bold">{currentEntry.subject}</span>
            {pt && <span className="text-xs opacity-60 ml-auto">{pt.start}-{pt.end}</span>}
          </div>
        );
      })()}

      {viewMode === 'grid' ? (
        /* ====== 网格视图 ====== */
        <div className="px-4 overflow-x-auto">
          <div className="min-w-[700px]">
            {/* 表头: 节次 + 周一到周日 */}
            <div className="grid grid-cols-8 gap-1 mb-1">
              <div className="p-2 text-center text-xs opacity-50 font-medium">节次</div>
              {weekdays.map((day, idx) => (
                <div
                  key={day}
                  className={cn(
                    "p-2 text-center text-xs font-bold rounded-t-lg transition-all",
                    dayOfWeekMap[idx] === todayDayOfWeek
                      ? "bg-blue-500/20 text-blue-400"
                      : "opacity-50"
                  )}
                >
                  {day}
                </div>
              ))}
            </div>

            {/* 课程格子 */}
            {Array.from({ length: maxPeriods }, (_, pIdx) => {
              const period = pIdx + 1;
              const pt = periodTimes.find(p => p.period === period);
              const isCurrent = currentPeriod === period;
              return (
                <div key={period} className="grid grid-cols-8 gap-1 mb-1">
                  {/* 节次列 */}
                  <div className={cn(
                    "p-1 text-center flex flex-col items-center justify-center rounded-lg text-xs",
                    isCurrent ? "bg-blue-500/20 text-blue-400" : "bg-white/5"
                  )}>
                    <span className="font-bold">{period}</span>
                    {pt && <span className="opacity-50 text-[10px]">{pt.start}</span>}
                  </div>
                  {/* 各天 */}
                  {weekdays.map((_, dayIdx) => {
                    const entry = gridData[dayIdx]?.[pIdx];
                    const isToday = dayOfWeekMap[dayIdx] === todayDayOfWeek;
                    return (
                      <div
                        key={dayIdx}
                        className={cn(
                          "p-1.5 rounded-lg min-h-[48px] flex flex-col justify-center transition-all",
                          !entry && "bg-white/[0.02]",
                          isToday && !entry && "bg-blue-500/5",
                          isCurrent && isToday && entry && "ring-2 ring-blue-400/50"
                        )}
                      >
                        {entry ? (
                          <div className={cn(
                            "rounded-md p-1.5 text-center",
                            `bg-gradient-to-br ${getSubjectColor(entry.subject)}`
                          )}>
                            <div className="text-xs font-bold leading-tight text-white drop-shadow-sm">{entry.subject}</div>
                            {entry.teacher && (
                              <div className="text-[10px] opacity-80 text-white/90 mt-0.5">{entry.teacher}</div>
                            )}
                          </div>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        /* ====== 列表视图：今日课程 ====== */
        <div className="px-4 space-y-3">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="w-4 h-4 text-blue-400" />
            <span className="text-sm text-blue-400 font-medium">
              {weekdays[dayOfWeekMap.indexOf(todayDayOfWeek)] || '今天'}的课程
            </span>
          </div>
          {todayEntries.length > 0 ? (
            todayEntries.map((entry) => {
              const pt = periodTimes.find(p => p.period === entry.period);
              const isCurrent = currentPeriod === entry.period;
              return (
                <div
                  key={`${entry.period}-${entry.subject}`}
                  className={cn(
                    "flex items-center gap-3 p-4 rounded-xl transition-all",
                    isCurrent
                      ? "bg-blue-500/15 border border-blue-500/30 shadow-lg shadow-blue-500/10"
                      : "bg-white/5 border border-white/5"
                  )}
                >
                  <div className={cn(
                    "w-12 h-12 rounded-xl flex flex-col items-center justify-center text-sm font-bold bg-gradient-to-br",
                    getSubjectColor(entry.subject)
                  )}>
                    <span className="text-white text-xs">{entry.period}</span>
                  </div>
                  <div className="flex-1">
                    <div className="font-bold text-base">{entry.subject}</div>
                    <div className="flex items-center gap-3 mt-1">
                      {entry.teacher && (
                        <span className="text-xs opacity-60">教师: {entry.teacher}</span>
                      )}
                      {pt && (
                        <span className="text-xs opacity-50 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {pt.start} - {pt.end}
                        </span>
                      )}
                    </div>
                  </div>
                  {isCurrent && (
                    <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-green-500/20 text-green-400 text-xs font-bold">
                      <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                      进行中
                    </div>
                  )}
                </div>
              );
            })
          ) : (
            <div className="text-center py-12">
              <BookOpen className="w-16 h-16 mx-auto mb-4 opacity-30" />
              <p className="opacity-50">今日无课程安排</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
