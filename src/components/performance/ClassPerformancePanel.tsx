'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Star, Trash2, TrendingUp, User } from 'lucide-react';
import { getClassPerformances, addClassPerformance, deleteClassPerformance, getStudents, addNotification, getParents } from '@/lib/sharedData';
import type { ClassPerformance as ClassPerformanceType } from '@/types/attendance';
import { cn } from '@/lib/utils';

interface ClassPerformancePanelProps {
  classId: string;
  studentView?: { studentId: string; studentName: string };
}

const CATEGORIES = [
  { value: 'participation', label: '课堂参与', color: 'from-blue-500 to-cyan-500' },
  { value: 'discipline', label: '课堂纪律', color: 'from-amber-500 to-orange-500' },
  { value: 'homework', label: '作业完成', color: 'from-emerald-500 to-teal-500' },
  { value: 'teamwork', label: '团队协作', color: 'from-purple-500 to-pink-500' },
] as const;

const SCORE_LABELS: Record<number, string> = {
  1: '需改进',
  2: '一般',
  3: '良好',
  4: '优秀',
  5: '卓越',
};

export default function ClassPerformancePanel({ classId, studentView }: ClassPerformancePanelProps) {
  const [records, setRecords] = useState<ClassPerformanceType[]>([]);
  const [students, setStudents] = useState<{ id: string; name: string }[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [newCategory, setNewCategory] = useState<ClassPerformanceType['category']>('participation');
  const [newScore, setNewScore] = useState(4);
  const [newNote, setNewNote] = useState('');
  const [newDate, setNewDate] = useState(new Date().toISOString().split('T')[0]);

  const refreshRecords = useCallback(() => {
    const all = getClassPerformances(classId);
    if (studentView) {
      setRecords(all.filter(r => r.studentId === studentView.studentId));
    } else {
      setRecords(all);
    }
  }, [classId, studentView]);

  useEffect(() => {
    if (!studentView) {
      setStudents(getStudents().filter(s => s.classId === classId).map(s => ({ id: s.id, name: s.name })));
    }
    refreshRecords();
  }, [classId, studentView, refreshRecords]);

  const handleAdd = useCallback(() => {
    if (!selectedStudentId) return;

    addClassPerformance({
      classId,
      studentId: selectedStudentId,
      studentName: students.find(s => s.id === selectedStudentId)?.name || '',
      score: newScore,
      category: newCategory,
      note: newNote || undefined,
      date: newDate,
      createdBy: 'teacher',
    });

    // 通知家长
    const parents = getParents();
    const relatedParents = parents.filter(p => p.childId === selectedStudentId || (p.childrenIds && p.childrenIds.includes(selectedStudentId)));
    const catLabel = CATEGORIES.find(c => c.value === newCategory)?.label || newCategory;
    relatedParents.forEach(parent => {
      addNotification({
        userId: parent.id,
        title: '课堂表现评分通知',
        message: `${students.find(s => s.id === selectedStudentId)?.name}在【${catLabel}】获得${newScore}分（${SCORE_LABELS[newScore]}）`,
        type: 'performance',
        read: false,
      });
    });

    refreshRecords();
    setShowAdd(false);
    setSelectedStudentId('');
    setNewNote('');
  }, [classId, selectedStudentId, students, newScore, newCategory, newNote, newDate, refreshRecords]);

  const handleDelete = useCallback((id: string) => {
    deleteClassPerformance(id);
    refreshRecords();
  }, [refreshRecords]);

  // 按学生分组的平均分（教师端）
  const studentStats = useMemo(() => {
    if (studentView) return null;
    const grouped: Record<string, { name: string; scores: number[]; categories: Record<string, number[]> }> = {};
    records.forEach(r => {
      if (!grouped[r.studentId]) {
        grouped[r.studentId] = { name: r.studentName, scores: [], categories: {} };
      }
      grouped[r.studentId].scores.push(r.score);
      if (!grouped[r.studentId].categories[r.category]) {
        grouped[r.studentId].categories[r.category] = [];
      }
      grouped[r.studentId].categories[r.category].push(r.score);
    });
    return Object.entries(grouped).map(([id, data]) => ({
      id,
      name: data.name,
      avgScore: data.scores.length > 0 ? (data.scores.reduce((a, b) => a + b, 0) / data.scores.length).toFixed(1) : '0',
      categoryAvg: Object.fromEntries(
        Object.entries(data.categories).map(([cat, scores]) => [cat, scores.reduce((a, b) => a + b, 0) / scores.length])
      ),
      count: data.scores.length,
    }));
  }, [records, studentView]);

  // 学生端趋势数据
  const trendData = useMemo(() => {
    if (!studentView) return null;
    const byCategory: Record<string, { date: string; score: number }[]> = {};
    records.forEach(r => {
      if (!byCategory[r.category]) byCategory[r.category] = [];
      byCategory[r.category].push({ date: r.date, score: r.score });
    });
    return byCategory;
  }, [records, studentView]);

  const catConfig = (cat: string) => CATEGORIES.find(c => c.value === cat) || CATEGORIES[0];

  return (
    <div className="space-y-4">
      {/* 无学生提示 */}
      {!studentView && students.length === 0 && (
        <div className="text-center py-8">
          <Star className="w-10 h-10 mx-auto mb-2 text-white/20" />
          <p className="text-white/40 text-sm mb-2">该班级暂无学生</p>
          <p className="text-white/25 text-xs">请先在「班级管理」中为该班级添加学生，或在顶部切换到已有学生的班级</p>
        </div>
      )}

      {/* 添加按钮（教师端） */}
      {!studentView && students.length > 0 && (
        <button
          onClick={() => setShowAdd(!showAdd)}
          className="px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-500 text-white text-sm font-medium hover:shadow-lg transition-all flex items-center gap-2"
        >
          <Star className="w-4 h-4" />
          添加评分
        </button>
      )}

      {/* 添加表单 */}
      {showAdd && !studentView && (
        <div className="p-4 rounded-xl bg-white/5 border border-white/10 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-white/50 block mb-1">学生</label>
              <select
                value={selectedStudentId}
                onChange={e => setSelectedStudentId(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-[#1a1a3e] border border-white/10 text-white text-sm"
              >
                <option value="">选择学生</option>
                {students.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-white/50 block mb-1">评分类别</label>
              <select
                value={newCategory}
                onChange={e => setNewCategory(e.target.value as ClassPerformanceType['category'])}
                className="w-full px-3 py-2 rounded-lg bg-[#1a1a3e] border border-white/10 text-white text-sm"
              >
                {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="text-xs text-white/50 block mb-1">评分（1-5分）</label>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map(s => (
                <button
                  key={s}
                  onClick={() => setNewScore(s)}
                  className={cn(
                    "w-12 h-10 rounded-lg text-sm font-bold transition-all",
                    newScore === s
                      ? `bg-gradient-to-br ${catConfig(newCategory).color} text-white shadow-lg`
                      : "bg-white/5 text-white/40 hover:bg-white/10"
                  )}
                >
                  {s}
                </button>
              ))}
              <span className="flex items-center text-xs text-white/50 ml-2">{SCORE_LABELS[newScore]}</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-white/50 block mb-1">日期</label>
              <input
                type="date"
                value={newDate}
                onChange={e => setNewDate(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm"
              />
            </div>
            <div>
              <label className="text-xs text-white/50 block mb-1">备注</label>
              <input
                type="text"
                value={newNote}
                onChange={e => setNewNote(e.target.value)}
                placeholder="可选"
                className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm placeholder:text-white/30"
              />
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={handleAdd}
              disabled={!selectedStudentId}
              className="px-4 py-2 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-500 text-white text-sm font-medium hover:shadow-lg transition-all disabled:opacity-50"
            >
              确认评分
            </button>
            <button onClick={() => setShowAdd(false)} className="px-4 py-2 rounded-lg bg-white/5 text-white/50 text-sm">取消</button>
          </div>
        </div>
      )}

      {/* 学生端趋势图 */}
      {studentView && trendData && (
        <div className="space-y-3">
          <h4 className="text-sm font-bold text-white/70 flex items-center gap-2">
            <TrendingUp className="w-4 h-4" />
            课堂表现趋势
          </h4>
          {Object.entries(trendData).map(([cat, data]) => {
            const config = catConfig(cat);
            return (
              <div key={cat} className="p-3 rounded-xl bg-white/[0.03] border border-white/5">
                <div className="flex items-center gap-2 mb-2">
                  <div className={`w-3 h-3 rounded-full bg-gradient-to-r ${config.color}`} />
                  <span className="text-xs font-medium text-white/70">{config.label}</span>
                  <span className="text-xs text-white/30 ml-auto">
                    均分: {data.length > 0 ? (data.reduce((a, b) => a + b.score, 0) / data.length).toFixed(1) : '-'}
                  </span>
                </div>
                {/* 简易柱状图 */}
                <div className="flex items-end gap-1 h-16">
                  {data.slice(-10).map((d, i) => (
                    <div key={i} className="flex-1 flex flex-col items-center gap-1">
                      <div
                        className={cn("w-full rounded-t bg-gradient-to-t", config.color, `opacity-${40 + d.score * 12}`)}
                        style={{ height: `${d.score * 20}%`, minHeight: '4px' }}
                        title={`${d.date}: ${d.score}分`}
                      />
                    </div>
                  ))}
                </div>
                <div className="flex gap-1 mt-1">
                  {data.slice(-10).map((d, i) => (
                    <div key={i} className="flex-1 text-center text-[8px] text-white/20">
                      {d.date.slice(5)}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 教师端：学生评分统计 */}
      {!studentView && studentStats && (
        <div className="space-y-2">
          <h4 className="text-sm font-bold text-white/70">学生表现概览</h4>
          {studentStats.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {studentStats.map(s => (
                <div key={s.id} className="p-3 rounded-xl bg-white/[0.03] border border-white/5">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center">
                      <User className="w-3.5 h-3.5 text-white/40" />
                    </div>
                    <span className="text-sm font-medium text-white/80 truncate">{s.name}</span>
                  </div>
                  <div className="flex items-center gap-1 mb-2">
                    <Star className="w-4 h-4 text-amber-400" />
                    <span className="text-lg font-bold text-white/90">{s.avgScore}</span>
                    <span className="text-[10px] text-white/30">{s.count}次评分</span>
                  </div>
                  {/* 各类别进度条 */}
                  <div className="space-y-1">
                    {CATEGORIES.map(cat => {
                      const avg = s.categoryAvg[cat.value] || 0;
                      return (
                        <div key={cat.value} className="flex items-center gap-1.5">
                          <span className="text-[9px] text-white/30 w-12 truncate">{cat.label}</span>
                          <div className="flex-1 h-1.5 rounded-full bg-white/5 overflow-hidden">
                            <div className={`h-full rounded-full bg-gradient-to-r ${cat.color}`} style={{ width: `${avg * 20}%` }} />
                          </div>
                          <span className="text-[9px] text-white/40 w-5">{avg.toFixed(1)}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-6">
              <Star className="w-10 h-10 mx-auto mb-2 text-white/10" />
              <p className="text-white/30 text-sm">暂无评分记录</p>
            </div>
          )}
        </div>
      )}

      {/* 最近评分记录 */}
      <div className="space-y-2">
        <h4 className="text-sm font-bold text-white/70">最近评分</h4>
        {records.length > 0 ? (
          <div className="space-y-1.5">
            {records.slice(0, 20).map(r => {
              const config = catConfig(r.category);
              return (
                <div key={r.id} className="flex items-center gap-3 p-2.5 rounded-lg bg-white/[0.02] hover:bg-white/[0.04] transition-all">
                  <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${config.color} flex items-center justify-center flex-shrink-0`}>
                    <Star className="w-4 h-4 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      {!studentView && <span className="text-sm text-white/80">{r.studentName}</span>}
                      <span className="text-xs text-white/40">{config.label}</span>
                    </div>
                    {r.note && <span className="text-[10px] text-white/25">{r.note}</span>}
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-bold text-white/80">{r.score}</span>
                    <span className="text-[10px] text-white/30 block">{r.date}</span>
                  </div>
                  {!studentView && (
                    <button onClick={() => handleDelete(r.id)} className="p-1 rounded hover:bg-red-500/20 text-white/20 hover:text-red-400 transition-all">
                      <Trash2 className="w-3 h-3" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-white/30 text-sm text-center py-4">暂无评分</p>
        )}
      </div>
    </div>
  );
}
