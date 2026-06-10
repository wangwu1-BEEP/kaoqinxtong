'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getAttendanceRecords, getStudents } from '@/lib/sharedData';

interface AttendanceRecord {
  date: string;
  type: 'check_in' | 'check_out' | 'leave' | 'go_out';
  verified: boolean;
}

interface AttendanceHeatmapProps {
  classId: string;
  studentId?: string;
  records?: AttendanceRecord[];
  studentName?: string;
}

const MONTHS = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'];
const WEEKDAYS = ['一', '二', '三', '四', '五', '六', '日'];

function getStatusColor(dateRecords: AttendanceRecord[]): string {
  if (dateRecords.length === 0) return 'bg-white/[0.03]'; // 无数据
  const hasLeave = dateRecords.some(r => r.type === 'leave');
  const hasGoOut = dateRecords.some(r => r.type === 'go_out');
  const hasCheckIn = dateRecords.some(r => r.type === 'check_in');
  const hasCheckOut = dateRecords.some(r => r.type === 'check_out');

  if (hasLeave) return 'bg-amber-500/60';   // 请假 - 黄色
  if (hasGoOut) return 'bg-purple-500/60';   // 外出 - 紫色
  if (hasCheckIn && hasCheckOut) return 'bg-emerald-500/60'; // 完整出勤 - 绿色
  if (hasCheckIn) return 'bg-emerald-500/30'; // 只有签到 - 浅绿
  return 'bg-white/[0.06]';
}

function getStatusLabel(dateRecords: AttendanceRecord[]): string {
  if (dateRecords.length === 0) return '无记录';
  const hasLeave = dateRecords.some(r => r.type === 'leave');
  const hasGoOut = dateRecords.some(r => r.type === 'go_out');
  const hasCheckIn = dateRecords.some(r => r.type === 'check_in');
  const hasCheckOut = dateRecords.some(r => r.type === 'check_out');
  const parts: string[] = [];
  if (hasCheckIn) parts.push('签到');
  if (hasCheckOut) parts.push('签退');
  if (hasLeave) parts.push('请假');
  if (hasGoOut) parts.push('外出');
  return parts.join('+');
}

export default function AttendanceHeatmap({ classId, studentId, records: propRecords, studentName }: AttendanceHeatmapProps) {
  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [hoveredDate, setHoveredDate] = useState<string | null>(null);

  // 自动加载记录
  const records = useMemo(() => {
    if (propRecords) return propRecords;
    const allRecords = getAttendanceRecords();
    const classRecords = allRecords.filter(r => r.classId === classId);
    if (studentId) {
      return classRecords.filter(r => r.studentId === studentId).map(r => ({
        date: r.timestamp,
        type: r.type as AttendanceRecord['type'],
        verified: r.verified || false,
      }));
    }
    // 没指定学生则显示全班
    return classRecords.map(r => ({
      date: r.timestamp,
      type: r.type as AttendanceRecord['type'],
      verified: r.verified || false,
    }));
  }, [classId, studentId, propRecords]);

  // 按日期分组
  const recordsByDate = useMemo(() => {
    const map: Record<string, AttendanceRecord[]> = {};
    records.forEach(r => {
      const dateKey = r.date.split('T')[0];
      if (!map[dateKey]) map[dateKey] = [];
      map[dateKey].push(r);
    });
    return map;
  }, [records]);

  // 构建日历网格
  const calendarDays = useMemo(() => {
    const firstDay = new Date(year, month - 1, 1);
    const lastDay = new Date(year, month, 0);
    const startDayOfWeek = (firstDay.getDay() + 6) % 7; // 周一=0
    const daysInMonth = lastDay.getDate();

    const days: (number | null)[] = [];
    // 填充前面的空格
    for (let i = 0; i < startDayOfWeek; i++) {
      days.push(null);
    }
    for (let d = 1; d <= daysInMonth; d++) {
      days.push(d);
    }
    return days;
  }, [year, month]);

  // 统计
  const stats = useMemo(() => {
    let total = 0, present = 0, leave = 0, goOut = 0;
    const daysInMonth = new Date(year, month, 0).getDate();
    const today = new Date();
    for (let d = 1; d <= daysInMonth; d++) {
      const dateObj = new Date(year, month - 1, d);
      if (dateObj > today) continue;
      if (dateObj.getDay() === 0 || dateObj.getDay() === 6) continue; // 跳过周末
      const dateKey = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const dateRecords = recordsByDate[dateKey] || [];
      total++;
      if (dateRecords.some(r => r.type === 'leave')) leave++;
      else if (dateRecords.some(r => r.type === 'go_out')) goOut++;
      else if (dateRecords.some(r => r.type === 'check_in')) present++;
    }
    return { total, present, leave, goOut, rate: total > 0 ? (present / total * 100).toFixed(1) : '0' };
  }, [year, month, recordsByDate]);

  const prevMonth = () => {
    if (month === 1) { setYear(year - 1); setMonth(12); }
    else setMonth(month - 1);
  };

  const nextMonth = () => {
    if (month === 12) { setYear(year + 1); setMonth(1); }
    else setMonth(month + 1);
  };

  const today = new Date();
  const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

  return (
    <div className="space-y-4">
      {/* 统计卡片 */}
      <div className="grid grid-cols-4 gap-2">
        <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-center">
          <div className="text-lg font-bold text-emerald-400">{stats.present}</div>
          <div className="text-[10px] text-white/40">出勤</div>
        </div>
        <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-center">
          <div className="text-lg font-bold text-amber-400">{stats.leave}</div>
          <div className="text-[10px] text-white/40">请假</div>
        </div>
        <div className="p-3 rounded-xl bg-purple-500/10 border border-purple-500/20 text-center">
          <div className="text-lg font-bold text-purple-400">{stats.goOut}</div>
          <div className="text-[10px] text-white/40">外出</div>
        </div>
        <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 text-center">
          <div className="text-lg font-bold text-blue-400">{stats.rate}%</div>
          <div className="text-[10px] text-white/40">出勤率</div>
        </div>
      </div>

      {/* 月份切换 */}
      <div className="flex items-center justify-between">
        <button onClick={prevMonth} className="p-1.5 rounded-lg hover:bg-white/10 transition-all">
          <ChevronLeft className="w-5 h-5 text-white/50" />
        </button>
        <h3 className="text-sm font-bold text-white/80">
          {year}年{MONTHS[month - 1]}
          {studentName && <span className="text-white/40 ml-2">{studentName}</span>}
        </h3>
        <button onClick={nextMonth} className="p-1.5 rounded-lg hover:bg-white/10 transition-all">
          <ChevronRight className="w-5 h-5 text-white/50" />
        </button>
      </div>

      {/* 日历网格 */}
      <div className="grid grid-cols-7 gap-1">
        {/* 星期头 */}
        {WEEKDAYS.map(w => (
          <div key={w} className="text-center text-[10px] text-white/30 font-medium py-1">{w}</div>
        ))}

        {/* 日期格 */}
        {calendarDays.map((day, idx) => {
          if (day === null) {
            return <div key={`empty-${idx}`} className="aspect-square" />;
          }
          const dateKey = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
          const dateRecords = recordsByDate[dateKey] || [];
          const isToday = dateKey === todayKey;
          const isWeekend = new Date(year, month - 1, day).getDay() === 0 || new Date(year, month - 1, day).getDay() === 6;
          const color = getStatusColor(dateRecords);
          const isHovered = hoveredDate === dateKey;

          return (
            <div
              key={dateKey}
              className={cn(
                "aspect-square rounded-md flex flex-col items-center justify-center transition-all cursor-default relative",
                color,
                isToday && "ring-2 ring-cyan-400/60",
                isWeekend && !dateRecords.length && "bg-white/[0.01]",
                isHovered && "ring-1 ring-white/30 scale-110 z-10"
              )}
              onMouseEnter={() => setHoveredDate(dateKey)}
              onMouseLeave={() => setHoveredDate(null)}
            >
              <span className={cn(
                "text-xs font-medium",
                dateRecords.length > 0 ? "text-white/90" : isWeekend ? "text-white/15" : "text-white/30"
              )}>
                {day}
              </span>

              {/* 悬浮提示 */}
              {isHovered && dateRecords.length > 0 && (
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-1 rounded bg-gray-900 border border-white/10 text-[10px] text-white/70 whitespace-nowrap z-50 shadow-xl">
                  {getStatusLabel(dateRecords)}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* 图例 */}
      <div className="flex items-center gap-4 justify-center text-[10px] text-white/40">
        <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-emerald-500/60" /> 出勤</span>
        <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-emerald-500/30" /> 签到</span>
        <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-amber-500/60" /> 请假</span>
        <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-purple-500/60" /> 外出</span>
        <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-white/[0.03] border border-white/10" /> 无记录</span>
      </div>
    </div>
  );
}
