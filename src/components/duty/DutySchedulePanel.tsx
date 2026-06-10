'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { CalendarDays, Trash2, Plus, Sparkles, BookOpen, Shield, Star } from 'lucide-react';
import { getDutySchedules, addDutySchedule, deleteDutySchedule, getStudents, addNotification, getParents } from '@/lib/sharedData';
import type { DutySchedule } from '@/types/attendance';

interface DutySchedulePanelProps {
  classId: string;
  readOnly?: boolean;
}

const DUTY_TYPES = [
  { value: '卫生', label: '卫生值日', icon: Sparkles, color: 'from-emerald-500 to-teal-500' },
  { value: '纪律', label: '纪律值日', icon: Shield, color: 'from-blue-500 to-indigo-500' },
  { value: '领读', label: '领读值日', icon: BookOpen, color: 'from-amber-500 to-orange-500' },
  { value: '值日班长', label: '值日班长', icon: Star, color: 'from-purple-500 to-pink-500' },
];

export default function DutySchedulePanel({ classId, readOnly = false }: DutySchedulePanelProps) {
  const [schedules, setSchedules] = useState<DutySchedule[]>([]);
  const [students, setStudents] = useState<{ id: string; name: string }[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [newDate, setNewDate] = useState(new Date().toISOString().split('T')[0]);
  const [newDutyType, setNewDutyType] = useState('卫生');
  const [selectedStudentIds, setSelectedStudentIds] = useState<Set<string>>(new Set());
  const [newNote, setNewNote] = useState('');
  const [currentWeekStart, setCurrentWeekStart] = useState('');

  const refreshSchedules = useCallback(() => {
    setSchedules(getDutySchedules(classId));
  }, [classId]);

  useEffect(() => {
    setStudents(getStudents().filter(s => s.classId === classId).map(s => ({ id: s.id, name: s.name })));
    refreshSchedules();
    // 计算本周一
    const now = new Date();
    const day = now.getDay() || 7;
    const monday = new Date(now);
    monday.setDate(now.getDate() - day + 1);
    setCurrentWeekStart(monday.toISOString().split('T')[0]);
  }, [classId, refreshSchedules]);

  // 获取本周安排
  const thisWeekSchedules = schedules.filter(s => {
    const sDate = new Date(s.date);
    const weekStart = new Date(currentWeekStart);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);
    return sDate >= weekStart && sDate <= weekEnd;
  });

  // 获取今日安排
  const today = new Date().toISOString().split('T')[0];
  const todaySchedules = schedules.filter(s => s.date === today);

  const handleAdd = useCallback(() => {
    if (selectedStudentIds.size === 0) return;

    addDutySchedule({
      classId,
      date: newDate,
      dutyType: newDutyType,
      studentIds: Array.from(selectedStudentIds),
      studentNames: Array.from(selectedStudentIds).map(id => students.find(s => s.id === id)?.name || id),
      note: newNote || undefined,
    });

    // 通知相关家长
    selectedStudentIds.forEach(sid => {
      const student = students.find(s => s.id === sid);
      if (student) {
        const parents = getParents();
        const relatedParents = parents.filter(p => p.childId === sid || (p.childrenIds && p.childrenIds.includes(sid)));
        relatedParents.forEach(parent => {
          addNotification({
            userId: parent.id,
            title: '值日安排通知',
            message: `${student.name}将于${newDate}担任【${newDutyType}】，请知悉。`,
            type: 'duty',
            read: false,
          });
        });
      }
    });

    refreshSchedules();
    setShowAdd(false);
    setSelectedStudentIds(new Set());
    setNewNote('');
  }, [classId, newDate, newDutyType, selectedStudentIds, students, newNote, refreshSchedules]);

  const handleDelete = useCallback((id: string) => {
    deleteDutySchedule(id);
    refreshSchedules();
  }, [refreshSchedules]);

  // 按日期分组
  const groupedByDate = schedules.reduce((acc, s) => {
    if (!acc[s.date]) acc[s.date] = [];
    acc[s.date].push(s);
    return acc;
  }, {} as Record<string, DutySchedule[]>);

  const sortedDates = Object.keys(groupedByDate).sort();

  const dutyTypeConfig = (type: string) => DUTY_TYPES.find(d => d.value === type) || DUTY_TYPES[0];

  return (
    <div className="space-y-4">
      {/* 无学生提示 */}
      {students.length === 0 && (
        <div className="text-center py-8">
          <CalendarDays className="w-10 h-10 mx-auto mb-2 text-white/20" />
          <p className="text-white/40 text-sm mb-2">该班级暂无学生</p>
          <p className="text-white/25 text-xs">请先在「班级管理」中为该班级添加学生，或在顶部切换到已有学生的班级</p>
        </div>
      )}

      {/* 今日值日 */}
      {students.length > 0 && todaySchedules.length > 0 && (
        <div className="p-4 rounded-xl bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/20">
          <h3 className="text-sm font-bold text-amber-300 mb-3 flex items-center gap-2">
            <CalendarDays className="w-4 h-4" />
            今日值日
          </h3>
          <div className="flex flex-wrap gap-2">
            {todaySchedules.map(s => {
              const config = dutyTypeConfig(s.dutyType);
              return (
                <div key={s.id} className={`px-3 py-2 rounded-lg bg-gradient-to-r ${config.color} text-white text-xs`}>
                  <span className="font-bold">{s.dutyType}</span>
                  <span className="ml-2 opacity-90">{s.studentNames.join('、')}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 添加按钮 */}
      {!readOnly && students.length > 0 && (
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowAdd(!showAdd)}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-500 text-white text-sm font-medium hover:shadow-lg transition-all flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            添加值日
          </button>
        </div>
      )}

      {/* 添加表单 */}
      {showAdd && (
        <div className="p-4 rounded-xl bg-white/5 border border-white/10 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-white/50 block mb-1">日期</label>
              <input
                type="date"
                value={newDate}
                onChange={e => setNewDate(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-[#1a1a3e] border border-white/10 text-white text-sm"
              />
            </div>
            <div>
              <label className="text-xs text-white/50 block mb-1">值日类型</label>
              <select
                value={newDutyType}
                onChange={e => setNewDutyType(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-[#1a1a3e] border border-white/10 text-white text-sm"
              >
                {DUTY_TYPES.map(dt => (
                  <option key={dt.value} value={dt.value}>{dt.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="text-xs text-white/50 block mb-1">选择学生（多选）</label>
            <div className="flex flex-wrap gap-1.5">
              <button
                onClick={() => {
                  if (selectedStudentIds.size === students.length) {
                    setSelectedStudentIds(new Set());
                  } else {
                    setSelectedStudentIds(new Set(students.map(s => s.id)));
                  }
                }}
                className="px-2 py-1 rounded text-xs bg-white/10 text-white/60 hover:bg-white/20"
              >
                {selectedStudentIds.size === students.length ? '取消全选' : '全选'}
              </button>
              {students.map(s => (
                <button
                  key={s.id}
                  onClick={() => {
                    const next = new Set(selectedStudentIds);
                    if (next.has(s.id)) next.delete(s.id); else next.add(s.id);
                    setSelectedStudentIds(next);
                  }}
                  className={`px-2 py-1 rounded text-xs transition-all ${
                    selectedStudentIds.has(s.id)
                      ? 'bg-gradient-to-r from-cyan-500 to-blue-500 text-white'
                      : 'bg-white/5 text-white/50 hover:bg-white/10'
                  }`}
                >
                  {s.name}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs text-white/50 block mb-1">备注（可选）</label>
            <input
              type="text"
              value={newNote}
              onChange={e => setNewNote(e.target.value)}
              placeholder="如：下午大扫除"
              className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm placeholder:text-white/30"
            />
          </div>

          <div className="flex gap-2">
            <button
              onClick={handleAdd}
              disabled={selectedStudentIds.size === 0}
              className="px-4 py-2 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-500 text-white text-sm font-medium hover:shadow-lg transition-all disabled:opacity-50"
            >
              确认添加
            </button>
            <button
              onClick={() => { setShowAdd(false); setSelectedStudentIds(new Set()); }}
              className="px-4 py-2 rounded-lg bg-white/5 text-white/50 text-sm"
            >
              取消
            </button>
          </div>
        </div>
      )}

      {/* 值日列表 */}
      <div className="space-y-3">
        {sortedDates.length > 0 ? (
          sortedDates.map(date => (
            <div key={date} className="rounded-xl bg-white/[0.03] border border-white/5 overflow-hidden">
              <div className="px-4 py-2.5 border-b border-white/5 flex items-center justify-between">
                <span className="text-sm font-bold text-white/80">{date}（{['周日', '周一', '周二', '周三', '周四', '周五', '周六'][new Date(date).getDay()]}）</span>
                {date === today && <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-bold">今天</span>}
              </div>
              <div className="p-3 space-y-2">
                {groupedByDate[date].map(s => {
                  const config = dutyTypeConfig(s.dutyType);
                  const Icon = config.icon;
                  return (
                    <div key={s.id} className="flex items-center gap-3 p-2 rounded-lg bg-white/[0.02]">
                      <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${config.color} flex items-center justify-center flex-shrink-0`}>
                        <Icon className="w-4 h-4 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className="text-sm text-white/80 font-medium">{s.dutyType}</span>
                        <span className="text-xs text-white/40 ml-2">{s.studentNames.join('、')}</span>
                        {s.note && <span className="text-xs text-white/30 ml-2">({s.note})</span>}
                      </div>
                      {!readOnly && (
                        <button
                          onClick={() => handleDelete(s.id)}
                          className="p-1.5 rounded-lg hover:bg-red-500/20 text-white/30 hover:text-red-400 transition-all"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-8">
            <CalendarDays className="w-12 h-12 mx-auto mb-3 text-white/15" />
            <p className="text-white/30 text-sm">暂无值日安排</p>
          </div>
        )}
      </div>
    </div>
  );
}
