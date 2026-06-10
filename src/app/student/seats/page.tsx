'use client';

import { useState, useEffect } from 'react';
import { ArrowLeft, Armchair } from 'lucide-react';
import { getCurrentUser } from '@/lib/userUtils';
import { StoredUser } from '@/lib/userUtils';
import { getSeatLayout, getStudents } from '@/lib/sharedData';
import type { SeatAssignment } from '@/types/attendance';

export default function StudentSeatsPage() {
  const [user, setUser] = useState<StoredUser | null>(null);

  useEffect(() => {
    const currentUser = getCurrentUser();
    if (!currentUser) {
      window.location.href = '/login';
      return;
    }
    // 尝试从学生列表中补充 classId
    if (!currentUser.classId) {
      const students = getStudents();
      const match = students.find(s => s.id === currentUser.id || s.username === currentUser.username);
      if (match?.classId) {
        currentUser.classId = match.classId;
        currentUser.className = match.className || currentUser.className;
        localStorage.setItem('user', JSON.stringify(currentUser));
      }
    }
    setUser(currentUser);
  }, []);

  if (!user?.classId) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3" style={{ backgroundColor: '#0a0a1a' }}>
        <Armchair className="w-12 h-12 text-white/20" />
        <p className="text-white/50">未分配班级</p>
        <p className="text-white/30 text-sm">请先在个人资料中选择班级</p>
      </div>
    );
  }

  const layout = getSeatLayout(user.classId);
  const students = getStudents().filter((s: { classId: string }) => s.classId === user.classId);
  const seats: SeatAssignment[] = layout?.seats || [];

  // 构建 seatMap: position -> student
  const seatMap = new Map<string, { studentId: string; studentName: string }>();
  seats.forEach((s: SeatAssignment) => {
    seatMap.set(`${s.row}-${s.col}`, { studentId: s.studentId, studentName: s.studentName });
  });

  const maxRow = seats.length > 0 ? Math.max(...seats.map((s: SeatAssignment) => s.row)) : 5;
  const maxCol = seats.length > 0 ? Math.max(...seats.map((s: SeatAssignment) => s.col)) : 7;

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#0a0a1a', color: '#fff' }}>
      {/* 头部 */}
      <div className="sticky top-0 z-20 backdrop-blur-xl border-b border-white/10" style={{ backgroundColor: 'rgba(10,10,26,0.8)' }}>
        <div className="flex items-center gap-3 px-4 py-4">
          <button onClick={() => window.location.href = '/student'} className="w-10 h-10 rounded-xl flex items-center justify-center border border-white/10 hover:border-white/20 transition-colors" style={{ backgroundColor: 'rgba(255,255,255,0.05)' }}>
            <ArrowLeft className="w-5 h-5 text-white/60" />
          </button>
          <div>
            <h1 className="text-lg font-bold text-white/90">我的座位</h1>
            <p className="text-xs text-white/30">班级座位安排</p>
          </div>
        </div>
      </div>

      <div className="p-4">
        {/* 讲台 */}
        <div className="text-center mb-6">
          <div className="inline-block px-8 py-2 rounded-xl border border-white/10 text-white/50 text-sm" style={{ backgroundColor: 'rgba(255,255,255,0.05)' }}>
            讲台
          </div>
        </div>

        {/* 座位网格 */}
        <div className="flex flex-col items-center gap-2">
          {Array.from({ length: maxRow + 1 }, (_, r) => (
            <div key={r} className="flex gap-2">
              {Array.from({ length: maxCol + 1 }, (_, c) => {
                const seat = seatMap.get(`${r}-${c}`);
                const isMe = seat?.studentId === user.id || (seat?.studentName && seat.studentName === user.name);
                return (
                  <div
                    key={c}
                    className={`w-14 h-14 rounded-xl flex flex-col items-center justify-center text-xs border transition-all ${
                      isMe
                        ? 'border-blue-400/40 shadow-lg shadow-blue-500/20'
                        : seat
                        ? 'border-white/10'
                        : 'border-white/5 border-dashed'
                    }`}
                    style={{
                      backgroundColor: isMe
                        ? 'rgba(59,130,246,0.2)'
                        : seat
                        ? 'rgba(255,255,255,0.05)'
                        : 'rgba(255,255,255,0.02)',
                    }}
                  >
                    {seat ? (
                      <>
                        <Armchair className={`w-4 h-4 ${isMe ? 'text-blue-400' : 'text-white/30'}`} />
                        <span className={`mt-0.5 ${isMe ? 'text-blue-300 font-bold' : 'text-white/50'}`}>
                          {seat.studentName.slice(-2)}
                        </span>
                      </>
                    ) : (
                      <Armchair className="w-4 h-4 text-white/10" />
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>

        {/* 图例 */}
        <div className="mt-6 flex items-center justify-center gap-6 text-xs text-white/40">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded border border-blue-400/40" style={{ backgroundColor: 'rgba(59,130,246,0.2)' }} />
            <span>我的座位</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded border border-white/10" style={{ backgroundColor: 'rgba(255,255,255,0.05)' }} />
            <span>已有人</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded border border-dashed border-white/5" style={{ backgroundColor: 'rgba(255,255,255,0.02)' }} />
            <span>空位</span>
          </div>
        </div>
      </div>
    </div>
  );
}
