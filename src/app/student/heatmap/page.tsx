'use client';

import { useState, useEffect, useMemo } from 'react';
import { ArrowLeft, Flame } from 'lucide-react';
import { getCurrentUser } from '@/lib/userUtils';
import { StoredUser } from '@/lib/userUtils';
import { getAttendanceRecords } from '@/lib/sharedData';

export default function StudentHeatmapPage() {
  const [user, setUser] = useState<StoredUser | null>(null);
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth());

  useEffect(() => {
    const currentUser = getCurrentUser();
    if (!currentUser) {
      window.location.href = '/login';
      return;
    }
    setUser(currentUser);
  }, []);

  // 构建考勤日历
  const calendarData = useMemo(() => {
    if (!user?.id) return new Map<string, string>();
    const records = getAttendanceRecords().filter(r => r.studentId === user.id);
    const map = new Map<string, string>(); // date -> status
    records.forEach(r => {
      const date = r.timestamp.split('T')[0];
      if (!map.has(date)) {
        if (r.type === 'check_in') {
          // 判断是否迟到（8:30后打卡算迟到）
          const time = r.timestamp.split('T')[1]?.slice(0, 5) || '';
          map.set(date, time > '08:30' ? 'late' : 'present');
        } else if (r.type === 'leave') {
          map.set(date, 'leave');
        }
      }
    });
    return map;
  }, [user]);

  // 生成日历格子
  const calendarDays = useMemo(() => {
    const firstDay = new Date(currentYear, currentMonth, 1);
    const lastDay = new Date(currentYear, currentMonth + 1, 0);
    const startDay = firstDay.getDay(); // 0=周日
    const totalDays = lastDay.getDate();
    const days: Array<{ date: string; day: number; status: string | undefined; isCurrentMonth: boolean }> = [];

    // 上月填充
    const prevMonthLastDay = new Date(currentYear, currentMonth, 0).getDate();
    for (let i = startDay - 1; i >= 0; i--) {
      const day = prevMonthLastDay - i;
      const m = currentMonth === 0 ? 12 : currentMonth;
      const y = currentMonth === 0 ? currentYear - 1 : currentYear;
      const date = `${y}-${String(m).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      days.push({ date, day, status: calendarData.get(date), isCurrentMonth: false });
    }

    // 当月
    for (let d = 1; d <= totalDays; d++) {
      const date = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      days.push({ date, day: d, status: calendarData.get(date), isCurrentMonth: true });
    }

    // 下月填充
    const remaining = 42 - days.length;
    for (let d = 1; d <= remaining; d++) {
      const m = currentMonth + 2 > 12 ? 1 : currentMonth + 2;
      const y = currentMonth + 2 > 12 ? currentYear + 1 : currentYear;
      const date = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      days.push({ date, day: d, status: calendarData.get(date), isCurrentMonth: false });
    }

    return days;
  }, [currentYear, currentMonth, calendarData]);

  // 统计
  const monthStats = useMemo(() => {
    const monthKey = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}`;
    let present = 0, late = 0, leave = 0, absent = 0;
    calendarData.forEach((status, date) => {
      if (date.startsWith(monthKey)) {
        if (status === 'present') present++;
        else if (status === 'late') late++;
        else if (status === 'leave') leave++;
      }
    });
    // 缺勤 = 工作日 - 出勤 - 迟到 - 请假
    const workDays = calendarDays.filter(d => d.isCurrentMonth && d.status === undefined).length;
    return { present, late, leave, absent: 0, total: present + late + leave };
  }, [calendarData, currentYear, currentMonth, calendarDays]);

  const statusColor = (status: string | undefined, isCurrentMonth: boolean) => {
    if (!isCurrentMonth) return 'bg-white/3';
    if (!status) return 'bg-white/5';
    if (status === 'present') return 'bg-emerald-500/40';
    if (status === 'late') return 'bg-amber-500/40';
    if (status === 'leave') return 'bg-blue-500/30';
    return 'bg-red-500/40';
  };

  const months = ['一月', '二月', '三月', '四月', '五月', '六月', '七月', '八月', '九月', '十月', '十一月', '十二月'];
  const weekDays = ['日', '一', '二', '三', '四', '五', '六'];

  if (!user) return null;

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#0a0a1a', color: '#fff' }}>
      {/* 头部 */}
      <div className="sticky top-0 z-20 backdrop-blur-xl border-b border-white/10" style={{ backgroundColor: 'rgba(10,10,26,0.8)' }}>
        <div className="flex items-center gap-3 px-4 py-4">
          <button onClick={() => window.location.href = '/student'} className="w-10 h-10 rounded-xl flex items-center justify-center border border-white/10 hover:border-white/20 transition-colors" style={{ backgroundColor: 'rgba(255,255,255,0.05)' }}>
            <ArrowLeft className="w-5 h-5 text-white/60" />
          </button>
          <div>
            <h1 className="text-lg font-bold text-white/90">考勤热力图</h1>
            <p className="text-xs text-white/30">日历视图看出勤</p>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* 月份选择 */}
        <div className="flex items-center justify-between">
          <button onClick={() => { if (currentMonth === 0) { setCurrentMonth(11); setCurrentYear(y => y - 1); } else setCurrentMonth(m => m - 1); }} className="px-3 py-2 rounded-xl border border-white/10 text-white/50 hover:text-white hover:border-white/20 transition-colors" style={{ backgroundColor: 'rgba(255,255,255,0.05)' }}>
            &lt;
          </button>
          <div className="text-lg font-bold text-white/80">{currentYear}年 {months[currentMonth]}</div>
          <button onClick={() => { if (currentMonth === 11) { setCurrentMonth(0); setCurrentYear(y => y + 1); } else setCurrentMonth(m => m + 1); }} className="px-3 py-2 rounded-xl border border-white/10 text-white/50 hover:text-white hover:border-white/20 transition-colors" style={{ backgroundColor: 'rgba(255,255,255,0.05)' }}>
            &gt;
          </button>
        </div>

        {/* 统计卡片 */}
        <div className="grid grid-cols-4 gap-2">
          <div className="rounded-xl p-2 text-center border backdrop-blur-xl" style={{ background: 'rgba(16,185,129,0.08)', borderColor: 'rgba(16,185,129,0.15)' }}>
            <div className="text-lg font-bold text-emerald-400">{monthStats.present}</div>
            <div className="text-xs text-white/30">出勤</div>
          </div>
          <div className="rounded-xl p-2 text-center border backdrop-blur-xl" style={{ background: 'rgba(245,158,11,0.08)', borderColor: 'rgba(245,158,11,0.15)' }}>
            <div className="text-lg font-bold text-amber-400">{monthStats.late}</div>
            <div className="text-xs text-white/30">迟到</div>
          </div>
          <div className="rounded-xl p-2 text-center border backdrop-blur-xl" style={{ background: 'rgba(59,130,246,0.08)', borderColor: 'rgba(59,130,246,0.15)' }}>
            <div className="text-lg font-bold text-blue-400">{monthStats.leave}</div>
            <div className="text-xs text-white/30">请假</div>
          </div>
          <div className="rounded-xl p-2 text-center border backdrop-blur-xl" style={{ background: 'rgba(139,92,246,0.08)', borderColor: 'rgba(139,92,246,0.15)' }}>
            <div className="text-lg font-bold text-violet-400">{monthStats.total}</div>
            <div className="text-xs text-white/30">合计</div>
          </div>
        </div>

        {/* 星期头部 */}
        <div className="grid grid-cols-7 gap-1">
          {weekDays.map(d => (
            <div key={d} className="text-center text-xs text-white/30 py-1">{d}</div>
          ))}
        </div>

        {/* 日历格子 */}
        <div className="grid grid-cols-7 gap-1">
          {calendarDays.map((d, i) => (
            <div
              key={i}
              className={`aspect-square rounded-lg flex items-center justify-center text-xs ${statusColor(d.status, d.isCurrentMonth)} ${d.isCurrentMonth ? 'text-white/60' : 'text-white/20'}`}
            >
              {d.day}
            </div>
          ))}
        </div>

        {/* 图例 */}
        <div className="flex items-center justify-center gap-4 text-xs text-white/40 mt-2">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded bg-emerald-500/40" />
            <span>出勤</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded bg-amber-500/40" />
            <span>迟到</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded bg-blue-500/30" />
            <span>请假</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded bg-white/5" />
            <span>无记录</span>
          </div>
        </div>
      </div>
    </div>
  );
}
