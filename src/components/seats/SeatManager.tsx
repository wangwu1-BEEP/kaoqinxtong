'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Grid3X3, RotateCcw, Save, User as UserIcon } from 'lucide-react';
import { getStudents, getSeatLayout, saveSeatLayout, SeatAssignment } from '@/lib/sharedData';

interface SeatManagerProps {
  classId: string;
  readOnly?: boolean;
}

const SUBJECT_COLORS = [
  'from-blue-500 to-cyan-500',
  'from-purple-500 to-pink-500',
  'from-amber-500 to-orange-500',
  'from-emerald-500 to-teal-500',
  'from-rose-500 to-red-500',
  'from-indigo-500 to-violet-500',
];

export default function SeatManager({ classId, readOnly = false }: SeatManagerProps) {
  const [rows, setRows] = useState(6);
  const [cols, setCols] = useState(8);
  const [seats, setSeats] = useState<SeatAssignment[]>([]);
  const [students, setStudents] = useState<{ id: string; name: string }[]>([]);
  const [dragStudent, setDragStudent] = useState<{ id: string; name: string } | null>(null);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    const allStudents = getStudents().filter(s => s.classId === classId);
    setStudents(allStudents.map(s => ({ id: s.id, name: s.name })));

    const layout = getSeatLayout(classId);
    if (layout) {
      setRows(layout.rows);
      setCols(layout.cols);
      setSeats(layout.seats);
    }
  }, [classId]);

  const getStudentAt = useCallback((row: number, col: number): SeatAssignment | undefined => {
    return seats.find(s => s.row === row && s.col === col);
  }, [seats]);

  const unassignedStudents = students.filter(s => !seats.some(seat => seat.studentId === s.id));

  const handleDrop = useCallback((row: number, col: number) => {
    if (!dragStudent || readOnly) return;

    setSeats(prev => {
      // 移除该学生原来的座位
      let newSeats = prev.filter(s => s.studentId !== dragStudent.id);
      // 移除目标位置的学生（如果有）
      newSeats = newSeats.filter(s => !(s.row === row && s.col === col));
      // 放置新学生
      newSeats.push({ row, col, studentId: dragStudent.id, studentName: dragStudent.name });
      return newSeats;
    });
    setDragStudent(null);
    setHasChanges(true);
  }, [dragStudent, readOnly]);

  const handleSeatClick = useCallback((row: number, col: number) => {
    if (readOnly) return;
    // 点击已占座位 → 清空
    const seat = getStudentAt(row, col);
    if (seat) {
      setSeats(prev => prev.filter(s => !(s.row === row && s.col === col)));
      setHasChanges(true);
    }
  }, [readOnly, getStudentAt]);

  const handleSave = useCallback(() => {
    saveSeatLayout({ id: `seat-${classId}`, classId, rows, cols, seats, updatedAt: new Date().toISOString() });
    setHasChanges(false);
  }, [classId, rows, cols, seats]);

  const handleReset = useCallback(() => {
    setSeats([]);
    setHasChanges(true);
  }, []);

  // 随机排座
  const handleRandom = useCallback(() => {
    const shuffled = [...students].sort(() => Math.random() - 0.5);
    const newSeats: SeatAssignment[] = [];
    let idx = 0;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (idx < shuffled.length) {
          newSeats.push({ row: r, col: c, studentId: shuffled[idx].id, studentName: shuffled[idx].name });
          idx++;
        }
      }
    }
    setSeats(newSeats);
    setHasChanges(true);
  }, [students, rows, cols]);

  // 讲台
  return (
    <div className="space-y-4">
      {/* 控制栏 */}
      {!readOnly && (
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <label className="text-xs text-white/50">行</label>
            <select
              value={rows}
              onChange={e => { setRows(Number(e.target.value)); setHasChanges(true); }}
              className="px-2 py-1 rounded-lg bg-[#1a1a3e] border border-white/10 text-white text-sm"
            >
              {[3, 4, 5, 6, 7, 8].map(n => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-xs text-white/50">列</label>
            <select
              value={cols}
              onChange={e => { setCols(Number(e.target.value)); setHasChanges(true); }}
              className="px-2 py-1 rounded-lg bg-[#1a1a3e] border border-white/10 text-white text-sm"
            >
              {[4, 5, 6, 7, 8, 9, 10].map(n => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>
          <button
            onClick={handleRandom}
            className="px-3 py-1.5 rounded-lg text-xs bg-gradient-to-r from-purple-500 to-pink-500 text-white font-medium hover:shadow-lg transition-all"
          >
            随机排座
          </button>
          <button
            onClick={handleReset}
            className="px-3 py-1.5 rounded-lg text-xs bg-white/10 text-white/70 hover:bg-white/20 transition-all"
          >
            <RotateCcw className="w-3 h-3 inline mr-1" />清空
          </button>
          {hasChanges && (
            <button
              onClick={handleSave}
              className="px-3 py-1.5 rounded-lg text-xs bg-gradient-to-r from-cyan-500 to-blue-500 text-white font-medium hover:shadow-lg transition-all"
            >
              <Save className="w-3 h-3 inline mr-1" />保存
            </button>
          )}
        </div>
      )}

      {/* 讲台 */}
      <div className="flex justify-center mb-2">
        <div className="px-12 py-2 rounded-lg bg-gradient-to-r from-amber-500/20 to-amber-600/20 border border-amber-500/30 text-amber-300 text-sm font-medium">
          讲 台
        </div>
      </div>

      {/* 座位网格 */}
      <div className="overflow-x-auto">
        <div className="inline-grid gap-2 mx-auto" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
          {Array.from({ length: rows * cols }, (_, idx) => {
            const row = Math.floor(idx / cols);
            const col = idx % cols;
            const seat = getStudentAt(row, col);
            const isDragOver = dragStudent !== null;
            return (
              <div
                key={`${row}-${col}`}
                onClick={() => handleSeatClick(row, col)}
                onDragOver={e => { e.preventDefault(); }}
                onDrop={() => handleDrop(row, col)}
                className={`
                  w-20 h-16 rounded-lg border-2 flex flex-col items-center justify-center transition-all cursor-pointer
                  ${seat
                    ? `bg-gradient-to-br ${SUBJECT_COLORS[(row * cols + col) % SUBJECT_COLORS.length]} border-transparent shadow-lg`
                    : `border-dashed border-white/15 bg-white/[0.02] hover:border-white/30 hover:bg-white/5`
                  }
                  ${isDragOver && !seat ? 'border-cyan-400/50 bg-cyan-400/10' : ''}
                `}
              >
                {seat ? (
                  <>
                    <span className="text-xs font-bold text-white truncate max-w-[72px]">{seat.studentName}</span>
                    <span className="text-[10px] text-white/60 mt-0.5">{row + 1}排{col + 1}座</span>
                  </>
                ) : (
                  <span className="text-[10px] text-white/20">空位</span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* 未分配学生列表 */}
      {!readOnly && (
        <div className="mt-4">
          {students.length === 0 ? (
            <div className="text-center py-6">
              <UserIcon className="w-10 h-10 mx-auto mb-2 text-white/20" />
              <p className="text-white/40 text-sm mb-3">该班级暂无学生</p>
              <p className="text-white/25 text-xs">请先在「班级管理」中为该班级添加学生，或在顶部切换到已有学生的班级</p>
            </div>
          ) : unassignedStudents.length > 0 ? (
            <>
              <h4 className="text-sm text-white/50 mb-2">未入座学生（拖拽到座位上）</h4>
              <div className="flex flex-wrap gap-2">
                {unassignedStudents.map(s => (
                  <div
                    key={s.id}
                    draggable
                    onDragStart={() => setDragStudent({ id: s.id, name: s.name })}
                    onDragEnd={() => setDragStudent(null)}
                    className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-white/70 text-xs cursor-grab active:cursor-grabbing hover:bg-white/10 transition-all flex items-center gap-1.5"
                  >
                    <UserIcon className="w-3 h-3" />
                    {s.name}
                  </div>
                ))}
              </div>
            </>
          ) : (
            <p className="text-sm text-emerald-400/60 text-center">✓ 所有学生已入座</p>
          )}
        </div>
      )}

      {readOnly && students.length === 0 && seats.length === 0 && (
        <div className="text-center py-8">
          <Grid3X3 className="w-12 h-12 mx-auto mb-3 text-white/20" />
          <p className="text-white/30 text-sm">尚未排座</p>
        </div>
      )}
    </div>
  );
}
