'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  getAttendanceRecords,
  getLeaveRequests,
  getGrades,
  getStudents,
  type SharedAttendanceRecord,
  type SharedStudent,
} from '@/lib/sharedData';
import type { LeaveRequest, GradeRecord } from '@/types/attendance';
import {
  BarChart3, Clock, CheckCircle2, XCircle, FileText, TrendingUp,
  Award, BookOpen, CalendarDays, ArrowUpRight, ArrowDownRight, Minus,
} from 'lucide-react';

interface ParentDashboardProps {
  parentId: string;
  childId: string;
}

export default function ParentDashboard({ parentId, childId }: ParentDashboardProps) {
  const [student, setStudent] = useState<SharedStudent | null>(null);
  const [attendanceRecords, setAttendanceRecords] = useState<SharedAttendanceRecord[]>([]);
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  const [grades, setGrades] = useState<GradeRecord[]>([]);
  const [activeSubTab, setActiveSubTab] = useState('overview');

  useEffect(() => {
    const students = getStudents();
    const s = students.find(st => st.id === childId);
    setStudent(s || null);
    const allAttendance = getAttendanceRecords();
    setAttendanceRecords(allAttendance.filter(a => a.studentId === childId));
    const allLeaves = getLeaveRequests();
    setLeaveRequests(allLeaves.filter(l => l.studentId === childId));
    const allGrades = getGrades();
    setGrades(allGrades.filter(g => g.studentId === childId));
  }, [parentId, childId]);

  const recentAttendance = useMemo(() => {
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    return attendanceRecords.filter(r => new Date(r.timestamp) >= weekAgo);
  }, [attendanceRecords]);

  const attendanceStats = useMemo(() => {
    const total = recentAttendance.length;
    const checkIn = recentAttendance.filter(r => r.type === 'check_in').length;
    const checkOut = recentAttendance.filter(r => r.type === 'check_out').length;
    return { total, checkIn, checkOut };
  }, [recentAttendance]);

  const gradeTrend = useMemo(() => {
    const subjectMap = grades.reduce<Record<string, GradeRecord[]>>((acc, g) => {
      if (!acc[g.subject]) acc[g.subject] = [];
      acc[g.subject].push(g);
      return acc;
    }, {});
    return Object.entries(subjectMap).map(([subject, sGrades]) => ({
      subject,
      grades: [...sGrades].sort((a, b) => a.date.localeCompare(b.date)),
      avg: sGrades.reduce((s, g) => s + g.score, 0) / sGrades.length,
    }));
  }, [grades]);

  const totalScoreTrend = useMemo(() => {
    if (grades.length === 0) return null;
    const dateMap = grades.reduce<Record<string, { date: string; examName: string; total: number; count: number }>>((acc, g) => {
      const key = g.date;
      if (!acc[key]) acc[key] = { date: g.date, examName: g.examName, total: 0, count: 0 };
      acc[key].total += g.score;
      acc[key].count += 1;
      return acc;
    }, {});
    const sorted = Object.values(dateMap).sort((a, b) => a.date.localeCompare(b.date));
    return { dates: sorted, subjectCount: gradeTrend.length, maxTotal: sorted.length > 0 ? Math.max(...sorted.map(d => d.total)) : 100 };
  }, [grades, gradeTrend]);

  const latestGradeChange = useMemo(() => {
    if (gradeTrend.length === 0) return null;
    let totalChange = 0;
    let hasChange = false;
    gradeTrend.forEach(st => {
      if (st.grades.length >= 2) {
        const last = st.grades[st.grades.length - 1].score;
        const prev = st.grades[st.grades.length - 2].score;
        totalChange += last - prev;
        hasChange = true;
      }
    });
    if (!hasChange) return null;
    return totalChange;
  }, [gradeTrend]);

  const formatAttendanceTime = (r: SharedAttendanceRecord) =>
    new Date(r.timestamp).toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });

  const formatAttendanceDate = (r: SharedAttendanceRecord) =>
    new Date(r.timestamp).toLocaleDateString('zh-CN');

  const getAttendanceTypeLabel = (type: string) => {
    const map: Record<string, string> = { check_in: '签到', check_out: '签退', leave: '请假', go_out: '外出' };
    return map[type] || type;
  };

  const getAttendanceTypeGlow = (type: string) => {
    const map: Record<string, { bg: string; text: string; border: string }> = {
      check_in: { bg: 'bg-emerald-500/15', text: 'text-emerald-400', border: 'border-emerald-500/20' },
      check_out: { bg: 'bg-sky-500/15', text: 'text-sky-400', border: 'border-sky-500/20' },
      leave: { bg: 'bg-amber-500/15', text: 'text-amber-400', border: 'border-amber-500/20' },
      go_out: { bg: 'bg-violet-500/15', text: 'text-violet-400', border: 'border-violet-500/20' },
    };
    return map[type] || { bg: 'bg-white/5', text: 'text-white/50', border: 'border-white/10' };
  };

  // SVG 趋势图
  const renderTrendChart = (subjectData: { subject: string; grades: GradeRecord[]; avg: number }, colorHue: number) => {
    const width = 300;
    const height = 160;
    const padding = 35;
    const chartW = width - padding * 2;
    const chartH = height - padding * 2;
    const maxScore = 100;

    const points = subjectData.grades.map((g, i) => ({
      x: subjectData.grades.length === 1 ? padding + chartW / 2 : padding + (i / (subjectData.grades.length - 1)) * chartW,
      y: padding + chartH - (g.score / maxScore) * chartH,
      score: g.score,
      date: g.date,
    }));

    const pathD = points.length >= 2 ? points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ') : '';
    const areaD = pathD ? `${pathD} L ${points[points.length - 1].x} ${padding + chartH} L ${points[0].x} ${padding + chartH} Z` : '';

    const mainColor = `hsl(${colorHue}, 70%, 55%)`;
    const glowColor = `hsl(${colorHue}, 70%, 55%, 0.15)`;

    return (
      <div key={subjectData.subject}
        className="rounded-2xl p-4 border backdrop-blur-xl transition-all duration-300 hover:scale-[1.01]"
        style={{ background: 'rgba(255,255,255,0.03)', borderColor: `${mainColor}22` }}>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: mainColor, boxShadow: `0 0 8px ${mainColor}` }} />
            <span className="font-semibold text-white/90">{subjectData.subject}</span>
          </div>
          <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: glowColor, color: mainColor }}>
            均分 {subjectData.avg.toFixed(1)}
          </span>
        </div>
        <svg width={width} height={height} className="w-full" viewBox={`0 0 ${width} ${height}`}>
          <defs>
            <linearGradient id={`grad-sub-${subjectData.subject.replace(/\s/g, '')}`} x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor={mainColor} stopOpacity="0.25" />
              <stop offset="100%" stopColor={mainColor} stopOpacity="0.02" />
            </linearGradient>
          </defs>
          {[0, 60, 80, 100].map(score => {
            const y = padding + chartH - (score / maxScore) * chartH;
            return (
              <g key={score}>
                <line x1={padding} y1={y} x2={width - padding} y2={y} stroke="rgba(255,255,255,0.05)" strokeWidth={1} />
                <text x={padding - 8} y={y + 4} textAnchor="end" className="text-[10px]" fill="rgba(255,255,255,0.25)">{score}</text>
              </g>
            );
          })}
          {areaD && <path d={areaD} fill={`url(#grad-sub-${subjectData.subject.replace(/\s/g, '')})`} />}
          {pathD && <path d={pathD} fill="none" stroke={mainColor} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />}
          {points.map((p, i) => (
            <g key={i}>
              <circle cx={p.x} cy={p.y} r={5} fill="#0a0a1a" stroke={mainColor} strokeWidth={2.5} />
              <text x={p.x} y={p.y - 12} textAnchor="middle" className="text-[11px] font-semibold" fill="rgba(255,255,255,0.9)">{p.score}</text>
              <text x={p.x} y={height - 8} textAnchor="middle" className="text-[9px]" fill="rgba(255,255,255,0.2)">{p.date.slice(5)}</text>
            </g>
          ))}
        </svg>
      </div>
    );
  };

  if (!student) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4" style={{ background: 'rgba(255,255,255,0.05)' }}>
          <BookOpen className="w-8 h-8 text-white/20" />
        </div>
        <p className="text-white/30">未找到学生信息</p>
      </div>
    );
  }

  const subTabs = [
    { id: 'overview', label: '概览', icon: BarChart3 },
    { id: 'attendance', label: '考勤', icon: Clock },
    { id: 'grades', label: '成绩', icon: TrendingUp },
    { id: 'leave', label: '请假', icon: FileText },
  ];

  const statCards = [
    { label: '本周签到', value: attendanceStats.checkIn, icon: CheckCircle2, color: '#10b981' },
    { label: '本周签退', value: attendanceStats.checkOut, icon: Clock, color: '#0ea5e9' },
    { label: '请假记录', value: leaveRequests.length, icon: FileText, color: '#f59e0b' },
    { label: '成绩记录', value: grades.length, icon: Award, color: '#8b5cf6' },
  ];

  return (
    <div className="space-y-5">
      {/* 学生信息卡片 */}
      <div className="rounded-2xl p-5 text-white relative overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #0ea5e9, #06b6d4)', boxShadow: '0 8px 32px rgba(14,165,233,0.2)' }}>
        <div className="absolute top-0 right-0 w-32 h-32 rounded-full opacity-10 blur-2xl" style={{ background: 'white' }} />
        <div className="absolute bottom-0 left-0 w-24 h-24 rounded-full opacity-10 blur-xl" style={{ background: 'white' }} />
        <div className="flex items-center gap-4 relative z-10">
          <div className="h-14 w-14 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center text-2xl font-bold shadow-inner border border-white/20">
            {student.name.charAt(0)}
          </div>
          <div className="flex-1">
            <h2 className="font-bold text-xl">{student.name}</h2>
            <p className="text-white/80 text-sm mt-0.5 flex items-center gap-1">
              <BookOpen className="w-3.5 h-3.5" />
              {student.className || '未分配班级'}
            </p>
          </div>
          {latestGradeChange !== null && (
            <div className={`flex items-center gap-1 px-3 py-1.5 rounded-xl text-sm font-semibold backdrop-blur border ${
              latestGradeChange > 0 ? 'bg-emerald-500/30 border-emerald-400/30 text-white' :
              latestGradeChange < 0 ? 'bg-red-500/30 border-red-400/30 text-white' :
              'bg-white/20 border-white/20 text-white'
            }`}>
              {latestGradeChange > 0 ? <ArrowUpRight className="w-4 h-4" /> :
               latestGradeChange < 0 ? <ArrowDownRight className="w-4 h-4" /> :
               <Minus className="w-4 h-4" />}
              {Math.abs(latestGradeChange).toFixed(0)}分
            </div>
          )}
        </div>
      </div>

      {/* 子导航 */}
      <div className="flex gap-1 p-1 rounded-2xl" style={{ background: 'rgba(255,255,255,0.04)' }}>
        {subTabs.map(tab => (
          <button key={tab.id}
            onClick={() => setActiveSubTab(tab.id)}
            className={`flex-1 flex items-center justify-center gap-1 py-2.5 rounded-xl text-xs font-medium transition-all duration-300 ${
              activeSubTab === tab.id ? 'text-white' : 'text-white/30 hover:text-white/50'
            }`}
            style={activeSubTab === tab.id ? {
              background: 'rgba(14,165,233,0.15)',
              boxShadow: '0 0 20px rgba(14,165,233,0.08), inset 0 1px 0 rgba(255,255,255,0.08)',
            } : {}}>
            <tab.icon className="h-3.5 w-3.5" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* 概览 */}
      {activeSubTab === 'overview' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            {statCards.map(card => (
              <div key={card.label}
                className="rounded-2xl p-4 border backdrop-blur-xl transition-all duration-300 hover:scale-[1.02]"
                style={{ background: `${card.color}08`, borderColor: `${card.color}20` }}>
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 rounded-xl flex items-center justify-center"
                    style={{ background: `${card.color}20` }}>
                    <card.icon className="w-4 h-4" style={{ color: card.color }} />
                  </div>
                  <span className="text-xs font-medium" style={{ color: `${card.color}cc` }}>{card.label}</span>
                </div>
                <div className="text-3xl font-bold" style={{ color: card.color }}>{card.value}</div>
              </div>
            ))}
          </div>

          {/* 最近考勤 */}
          <div className="rounded-2xl border backdrop-blur-xl overflow-hidden" style={{ background: 'rgba(255,255,255,0.03)', borderColor: 'rgba(255,255,255,0.06)' }}>
            <div className="px-4 py-3 border-b flex items-center justify-between" style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
              <h3 className="font-semibold text-sm text-white/80 flex items-center gap-2">
                <CalendarDays className="w-4 h-4 text-cyan-400" />
                最近考勤
              </h3>
              <span className="text-xs text-white/20">近7天</span>
            </div>
            <div>
              {recentAttendance.length === 0 ? (
                <div className="flex flex-col items-center py-8">
                  <Clock className="w-8 h-8 text-white/10 mb-2" />
                  <p className="text-white/25 text-sm">暂无考勤记录</p>
                </div>
              ) : (
                recentAttendance.slice(0, 5).map(r => {
                  const glow = getAttendanceTypeGlow(r.type);
                  return (
                    <div key={r.id} className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: 'rgba(255,255,255,0.03)' }}>
                      <span className="text-sm text-white/70 font-medium">{formatAttendanceDate(r)}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${glow.bg} ${glow.text}`}>
                        {getAttendanceTypeLabel(r.type)}
                      </span>
                      <span className={`flex items-center gap-1 text-xs font-medium ${r.verified ? 'text-emerald-400' : 'text-red-400'}`}>
                        {r.verified ? <CheckCircle2 className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
                        {r.verified ? '已验证' : '未验证'}
                      </span>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* 考勤详情 */}
      {activeSubTab === 'attendance' && (
        <div className="rounded-2xl border backdrop-blur-xl overflow-hidden" style={{ background: 'rgba(255,255,255,0.03)', borderColor: 'rgba(255,255,255,0.06)' }}>
          <div className="px-4 py-3 border-b" style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
            <h3 className="font-semibold text-sm text-white/80 flex items-center gap-2">
              <Clock className="w-4 h-4 text-cyan-400" />
              考勤记录
            </h3>
          </div>
          {attendanceRecords.length === 0 ? (
            <div className="flex flex-col items-center py-8">
              <Clock className="w-8 h-8 text-white/10 mb-2" />
              <p className="text-white/25 text-sm">暂无考勤记录</p>
            </div>
          ) : (
            [...attendanceRecords]
              .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
              .map(r => {
                const glow = getAttendanceTypeGlow(r.type);
                return (
                  <div key={r.id} className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: 'rgba(255,255,255,0.03)' }}>
                    <div>
                      <span className="text-sm text-white/70 font-medium block">{formatAttendanceDate(r)}</span>
                      <span className="text-xs text-white/25">{formatAttendanceTime(r)}</span>
                    </div>
                    <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${glow.bg} ${glow.text}`}>
                      {getAttendanceTypeLabel(r.type)}
                    </span>
                    <span className={`flex items-center gap-1 text-xs font-medium ${r.verified ? 'text-emerald-400' : 'text-red-400'}`}>
                      {r.verified ? <CheckCircle2 className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
                      {r.verified ? '已验证' : '未验证'}
                    </span>
                  </div>
                );
              })
          )}
        </div>
      )}

      {/* 成绩趋势 */}
      {activeSubTab === 'grades' && (
        <div className="space-y-4">
          {gradeTrend.length === 0 ? (
            <div className="rounded-2xl border backdrop-blur-xl flex flex-col items-center py-12" style={{ background: 'rgba(255,255,255,0.03)', borderColor: 'rgba(255,255,255,0.06)' }}>
              <Award className="w-12 h-12 text-white/10 mb-3" />
              <p className="text-white/30">暂无成绩数据</p>
              <p className="text-white/15 text-sm mt-1">成绩将由教师发布后显示</p>
            </div>
          ) : (
            <>
              {/* 总分趋势图 */}
              {totalScoreTrend && totalScoreTrend.dates.length > 0 && (() => {
                const width = 300;
                const height = 160;
                const padding = 35;
                const chartW = width - padding * 2;
                const chartH = height - padding * 2;
                const maxVal = Math.ceil(totalScoreTrend.maxTotal / 50) * 50 || 100;
                const dates = totalScoreTrend.dates;

                const points = dates.map((d, i) => ({
                  x: dates.length === 1 ? padding + chartW / 2 : padding + (i / (dates.length - 1)) * chartW,
                  y: padding + chartH - (d.total / maxVal) * chartH,
                  total: d.total,
                  count: d.count,
                  date: d.date,
                  examName: d.examName,
                }));

                const pathD = points.length >= 2 ? points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ') : '';
                const areaD = pathD ? `${pathD} L ${points[points.length - 1].x} ${padding + chartH} L ${points[0].x} ${padding + chartH} Z` : '';

                return (
                  <div className="rounded-2xl p-4 border backdrop-blur-xl"
                    style={{ background: 'rgba(14,165,233,0.06)', borderColor: 'rgba(14,165,233,0.15)' }}>
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-cyan-400" style={{ boxShadow: '0 0 8px #06b6d4' }} />
                        <span className="font-semibold text-cyan-300">总分趋势</span>
                      </div>
                      <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'rgba(14,165,233,0.15)', color: '#67e8f9' }}>
                        共 {totalScoreTrend.subjectCount} 科
                      </span>
                    </div>
                    <svg width={width} height={height} className="w-full" viewBox={`0 0 ${width} ${height}`}>
                      <defs>
                        <linearGradient id="grad-total-dark" x1="0%" y1="0%" x2="0%" y2="100%">
                          <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.3" />
                          <stop offset="100%" stopColor="#06b6d4" stopOpacity="0.02" />
                        </linearGradient>
                      </defs>
                      {[0, Math.round(maxVal * 0.6), Math.round(maxVal * 0.8), maxVal].map(score => {
                        const y = padding + chartH - (score / maxVal) * chartH;
                        return (
                          <g key={score}>
                            <line x1={padding} y1={y} x2={width - padding} y2={y} stroke="rgba(255,255,255,0.05)" strokeWidth={0.5} />
                            <text x={padding - 8} y={y + 4} textAnchor="end" className="text-[10px]" fill="rgba(255,255,255,0.25)">{score}</text>
                          </g>
                        );
                      })}
                      {areaD && <path d={areaD} fill="url(#grad-total-dark)" />}
                      {pathD && <path d={pathD} fill="none" stroke="#06b6d4" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />}
                      {points.map((p, i) => (
                        <g key={i}>
                          <circle cx={p.x} cy={p.y} r={5} fill="#0a0a1a" stroke="#06b6d4" strokeWidth={2.5} />
                          <text x={p.x} y={p.y - 12} textAnchor="middle" className="text-[11px] font-bold" fill="#67e8f9">{p.total}</text>
                          <text x={p.x} y={height - 8} textAnchor="middle" className="text-[9px]" fill="rgba(255,255,255,0.2)">{p.date.slice(5)}</text>
                        </g>
                      ))}
                    </svg>
                  </div>
                );
              })()}

              {/* 各科趋势图 */}
              <div className="flex items-center gap-2 px-1">
                <div className="w-1 h-4 rounded-full bg-white/10" />
                <span className="text-xs text-white/25 font-medium">各科趋势</span>
              </div>
              <div className="space-y-3">
                {gradeTrend.map((st, idx) => renderTrendChart(st, 200 + idx * 40))}
              </div>

              {/* 成绩明细表 */}
              <div className="rounded-2xl border backdrop-blur-xl overflow-hidden" style={{ background: 'rgba(255,255,255,0.03)', borderColor: 'rgba(255,255,255,0.06)' }}>
                <div className="px-4 py-3 border-b" style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
                  <h3 className="font-semibold text-sm text-white/80 flex items-center gap-2">
                    <Award className="w-4 h-4 text-violet-400" />
                    成绩明细
                  </h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr style={{ background: 'rgba(255,255,255,0.03)' }}>
                        <th className="text-left py-2.5 px-4 text-white/30 font-medium">科目</th>
                        <th className="text-left py-2.5 px-4 text-white/30 font-medium">考试</th>
                        <th className="text-center py-2.5 px-4 text-white/30 font-medium">分数</th>
                        <th className="text-left py-2.5 px-4 text-white/30 font-medium">日期</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[...grades].sort((a, b) => b.date.localeCompare(a.date)).map(g => (
                        <tr key={g.id} className="border-b transition-colors hover:bg-white/[0.02]" style={{ borderColor: 'rgba(255,255,255,0.03)' }}>
                          <td className="py-2.5 px-4 font-medium text-white/80">{g.subject}</td>
                          <td className="py-2.5 px-4 text-white/40">{g.examName}</td>
                          <td className="py-2.5 px-4 text-center">
                            <span className={`inline-block min-w-[2rem] px-2 py-0.5 rounded-lg font-bold text-sm ${
                              g.score >= 90 ? 'bg-emerald-500/15 text-emerald-400' :
                              g.score >= 60 ? 'bg-sky-500/15 text-sky-400' :
                              'bg-red-500/15 text-red-400'
                            }`}>
                              {g.score}
                            </span>
                          </td>
                          <td className="py-2.5 px-4 text-white/25">{g.date}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* 请假记录 */}
      {activeSubTab === 'leave' && (
        <div className="space-y-3">
          {leaveRequests.length === 0 ? (
            <div className="rounded-2xl border backdrop-blur-xl flex flex-col items-center py-12" style={{ background: 'rgba(255,255,255,0.03)', borderColor: 'rgba(255,255,255,0.06)' }}>
              <FileText className="w-12 h-12 text-white/10 mb-3" />
              <p className="text-white/30">暂无请假记录</p>
            </div>
          ) : (
            [...leaveRequests]
              .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
              .map(l => {
                const isSick = l.reason.includes('病');
                return (
                  <div key={l.id}
                    className="rounded-2xl p-4 border backdrop-blur-xl transition-all duration-300 hover:scale-[1.01]"
                    style={{ background: isSick ? 'rgba(239,68,68,0.05)' : 'rgba(245,158,11,0.05)', borderColor: isSick ? 'rgba(239,68,68,0.15)' : 'rgba(245,158,11,0.15)' }}>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                          isSick ? 'bg-red-500/20' : 'bg-amber-500/20'
                        }`}>
                          <span className={`text-sm ${isSick ? 'text-red-400' : 'text-amber-400'}`}>
                            {isSick ? '病' : '事'}
                          </span>
                        </div>
                        <span className="font-semibold text-white/90">
                          {isSick ? '病假' : '事假'}
                        </span>
                      </div>
                      <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                        l.status === 'approved' ? 'bg-emerald-500/15 text-emerald-400' :
                        l.status === 'rejected' ? 'bg-red-500/15 text-red-400' :
                        'bg-amber-500/15 text-amber-400'
                      }`}>
                        {l.status === 'approved' ? '已批准' : l.status === 'rejected' ? '已拒绝' : '待审批'}
                      </span>
                    </div>
                    <p className="text-sm text-white/50 mb-2">{l.reason}</p>
                    <div className="flex items-center gap-2 text-xs text-white/25">
                      <CalendarDays className="w-3.5 h-3.5" />
                      {l.startDate} ~ {l.endDate}
                    </div>
                  </div>
                );
              })
          )}
        </div>
      )}
    </div>
  );
}
