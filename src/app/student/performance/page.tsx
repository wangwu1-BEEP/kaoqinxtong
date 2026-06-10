'use client';

import { useState, useEffect, useMemo } from 'react';
import { ArrowLeft, Star } from 'lucide-react';
import { getCurrentUser } from '@/lib/userUtils';
import { StoredUser } from '@/lib/userUtils';
import { getClassPerformances } from '@/lib/sharedData';
import type { ClassPerformance } from '@/types/attendance';

export default function StudentPerformancePage() {
  const [user, setUser] = useState<StoredUser | null>(null);

  useEffect(() => {
    const currentUser = getCurrentUser();
    if (!currentUser) {
      window.location.href = '/login';
      return;
    }
    setUser(currentUser);
  }, []);

  const myRecords = useMemo(() => {
    if (!user?.id) return [];
    const all = getClassPerformances(user?.classId || '');
    return all.filter((p: ClassPerformance) => p.studentId === user.id || p.studentName === user.name).sort((a: ClassPerformance, b: ClassPerformance) => b.date.localeCompare(a.date));
  }, [user]);

  // 统计
  const stats = useMemo(() => {
    if (myRecords.length === 0) return { avg: 0, excellent: 0, good: 0, needImprove: 0 };
    const excellent = myRecords.filter(r => r.score >= 4).length;
    const good = myRecords.filter(r => r.score === 3).length;
    const needImprove = myRecords.filter(r => r.score <= 2).length;
    const avg = myRecords.reduce((sum, r) => sum + r.score, 0) / myRecords.length;
    return { avg: Math.round(avg * 10) / 10, excellent, good, needImprove };
  }, [myRecords]);

  const scoreLabel = (score: number) => {
    if (score >= 4) return { text: '积极参与', color: 'text-emerald-400', bg: 'bg-emerald-500/15' };
    if (score === 3) return { text: '表现一般', color: 'text-amber-400', bg: 'bg-amber-500/15' };
    return { text: '需要改进', color: 'text-red-400', bg: 'bg-red-500/15' };
  };

  const categoryLabel = (cat: string) => {
    switch (cat) {
      case 'participation': return '课堂参与';
      case 'discipline': return '课堂纪律';
      case 'homework': return '作业完成';
      case 'teamwork': return '团队协作';
      default: return cat;
    }
  };

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
            <h1 className="text-lg font-bold text-white/90">课堂表现</h1>
            <p className="text-xs text-white/30">查看课堂参与评分</p>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* 统计卡片 */}
        <div className="grid grid-cols-4 gap-3">
          <div className="rounded-2xl p-3 text-center border backdrop-blur-xl" style={{ background: 'rgba(139,92,246,0.08)', borderColor: 'rgba(139,92,246,0.15)' }}>
            <div className="text-2xl font-bold text-violet-400">{stats.avg}</div>
            <div className="text-xs text-white/30 mt-1">平均分</div>
          </div>
          <div className="rounded-2xl p-3 text-center border backdrop-blur-xl" style={{ background: 'rgba(16,185,129,0.08)', borderColor: 'rgba(16,185,129,0.15)' }}>
            <div className="text-2xl font-bold text-emerald-400">{stats.excellent}</div>
            <div className="text-xs text-white/30 mt-1">积极</div>
          </div>
          <div className="rounded-2xl p-3 text-center border backdrop-blur-xl" style={{ background: 'rgba(245,158,11,0.08)', borderColor: 'rgba(245,158,11,0.15)' }}>
            <div className="text-2xl font-bold text-amber-400">{stats.good}</div>
            <div className="text-xs text-white/30 mt-1">一般</div>
          </div>
          <div className="rounded-2xl p-3 text-center border backdrop-blur-xl" style={{ background: 'rgba(239,68,68,0.08)', borderColor: 'rgba(239,68,68,0.15)' }}>
            <div className="text-2xl font-bold text-red-400">{stats.needImprove}</div>
            <div className="text-xs text-white/30 mt-1">待改进</div>
          </div>
        </div>

        {/* 记录列表 */}
        {myRecords.length === 0 ? (
          <div className="text-center py-12 text-white/30">
            <Star className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>暂无课堂表现记录</p>
          </div>
        ) : (
          <div className="space-y-2">
            {myRecords.map((r: ClassPerformance) => {
              const sl = scoreLabel(r.score);
              return (
                <div key={r.id} className="rounded-2xl p-4 border backdrop-blur-xl" style={{ background: 'rgba(255,255,255,0.03)', borderColor: 'rgba(255,255,255,0.06)' }}>
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium text-white/80">{categoryLabel(r.category)}</div>
                      <div className="text-xs text-white/30 mt-1">{r.date}</div>
                    </div>
                    <div className={`px-3 py-1 rounded-full text-xs font-medium ${sl.color} ${sl.bg}`}>
                      {sl.text} ({r.score}/5)
                    </div>
                  </div>
                  {r.note && (
                    <div className="mt-2 text-sm text-white/40 border-t border-white/5 pt-2">
                      {r.note}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
