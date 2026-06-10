'use client';

import { useState, useEffect, useCallback } from 'react';
import { Trophy, Star, TrendingUp, Award, Zap, Gift } from 'lucide-react';
import { getStudents, getPointRecords, addPointRecord } from '@/lib/sharedData';
import type { PointRecord } from '@/types/attendance';
import type { SharedStudent } from '@/lib/sharedData';

interface PointsPanelProps {
  classId: string;
  readOnly?: boolean;
  studentId?: string;
}

const POINT_RULES = [
  { action: '正常打卡', points: 5, icon: '✅', color: 'text-green-400' },
  { action: '课堂表现优秀', points: 10, icon: '⭐', color: 'text-yellow-400' },
  { action: '课堂表现良好', points: 5, icon: '👍', color: 'text-blue-400' },
  { action: '按时交作业', points: 3, icon: '📝', color: 'text-purple-400' },
  { action: '帮助同学', points: 8, icon: '🤝', color: 'text-pink-400' },
  { action: '迟到扣分', points: -3, icon: '⏰', color: 'text-orange-400' },
  { action: '缺勤扣分', points: -5, icon: '❌', color: 'text-red-400' },
];

const RANK_TITLES = [
  { min: 200, title: '学习之星', emoji: '🌟', color: 'from-yellow-500 to-amber-600' },
  { min: 100, title: '勤奋学子', emoji: '🏅', color: 'from-blue-500 to-indigo-600' },
  { min: 50, title: '进步达人', emoji: '📈', color: 'from-green-500 to-emerald-600' },
  { min: 0, title: '新同学', emoji: '🎯', color: 'from-gray-500 to-gray-600' },
];

export default function PointsPanel({ classId, readOnly = false, studentId }: PointsPanelProps) {
  const [students, setStudents] = useState<SharedStudent[]>([]);
  const [records, setRecords] = useState<PointRecord[]>([]);
  const [selectedStudent, setSelectedStudent] = useState('');
  const [selectedAction, setSelectedAction] = useState(0);
  const [viewMode, setViewMode] = useState<'ranking' | 'detail' | 'rules'>('ranking');

  const refresh = useCallback(() => {
    const allStudents = getStudents().filter(s => s.classId === classId);
    setStudents(allStudents);
    const allRecords = getPointRecords();
    const filtered = studentId ? allRecords.filter(r => r.studentId === studentId) : allRecords;
    setRecords(filtered);
  }, [classId, studentId]);

  useEffect(() => { refresh(); }, [refresh]);

  const handleAddPoints = () => {
    if (!selectedStudent) return;
    const rule = POINT_RULES[selectedAction];
    addPointRecord({
      studentId: selectedStudent,
      classId,
      action: rule.action,
      reason: rule.action,
      points: rule.points,
      createdBy: 'teacher',
    });
    refresh();
  };

  // Calculate total points per student
  const studentPoints = students.map(s => {
    const pts = records.filter(r => r.studentId === s.id).reduce((sum, r) => sum + r.points, 0);
    return { ...s, totalPoints: pts };
  }).sort((a, b) => b.totalPoints - a.totalPoints);

  // Filter for single student view
  const myRecords = studentId ? records.filter(r => r.studentId === studentId).sort((a, b) => 
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  ) : [];

  const myTotal = myRecords.reduce((sum, r) => sum + r.points, 0);

  const getRankTitle = (pts: number) => RANK_TITLES.find(r => pts >= r.min) || RANK_TITLES[RANK_TITLES.length - 1];

  return (
    <div className="space-y-4">
      {/* Tabs */}
      <div className="flex gap-2">
        {[
          { key: 'ranking', label: '积分排行', icon: Trophy },
          { key: 'detail', label: studentId ? '我的积分' : '积分明细', icon: Star },
          { key: 'rules', label: '积分规则', icon: Zap },
        ].map(tab => (
          <button key={tab.key} onClick={() => setViewMode(tab.key as typeof viewMode)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-all ${
              viewMode === tab.key ? 'bg-gradient-to-r from-blue-500/20 to-purple-500/20 text-blue-300 border border-blue-500/30' : 'text-white/50 hover:text-white/70'
            }`}>
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Award points (teacher only) */}
      {!readOnly && !studentId && (
        <div className="bg-white/5 border border-white/10 rounded-xl p-4 space-y-3">
          <h3 className="text-sm font-medium text-white/80 flex items-center gap-2">
            <Gift className="w-4 h-4 text-yellow-400" />
            奖励/扣分
          </h3>
          <div className="grid grid-cols-2 gap-3">
            <select value={selectedStudent} onChange={e => setSelectedStudent(e.target.value)}
              className="bg-[#1a1a3e] border border-white/10 rounded-lg px-3 py-2 text-sm text-white">
              <option value="">选择学生</option>
              {students.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
            <select value={selectedAction} onChange={e => setSelectedAction(Number(e.target.value))}
              className="bg-[#1a1a3e] border border-white/10 rounded-lg px-3 py-2 text-sm text-white">
              {POINT_RULES.map((r, i) => (
                <option key={i} value={i}>{r.icon} {r.action} ({r.points > 0 ? '+' : ''}{r.points})</option>
              ))}
            </select>
          </div>
          <button onClick={handleAddPoints} disabled={!selectedStudent}
            className="w-full py-2 rounded-lg bg-gradient-to-r from-blue-500 to-purple-500 text-white text-sm font-medium disabled:opacity-30 transition-all hover:shadow-lg hover:shadow-blue-500/25">
            确认发放
          </button>
        </div>
      )}

      {/* Ranking */}
      {viewMode === 'ranking' && (
        <div className="space-y-2">
          {studentPoints.map((s, i) => {
            const rank = getRankTitle(s.totalPoints);
            return (
              <div key={s.id} className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${
                i < 3 ? 'bg-gradient-to-r from-yellow-500/10 to-transparent border-yellow-500/20' : 'bg-white/5 border-white/5'
              }`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                  i === 0 ? 'bg-yellow-500 text-black' : i === 1 ? 'bg-gray-300 text-black' : i === 2 ? 'bg-amber-600 text-white' : 'bg-white/10 text-white/50'
                }`}>
                  {i + 1}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-white">{s.name}</span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full bg-gradient-to-r ${rank.color} text-white`}>
                      {rank.emoji} {rank.title}
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-lg font-bold text-yellow-400">{s.totalPoints}</span>
                  <span className="text-xs text-white/40 ml-1">积分</span>
                </div>
              </div>
            );
          })}
          {studentPoints.length === 0 && <p className="text-center text-white/30 py-8">暂无学生数据</p>}
        </div>
      )}

      {/* Detail */}
      {viewMode === 'detail' && (
        <div className="space-y-3">
          {studentId && (
            <div className="bg-gradient-to-r from-blue-500/10 to-purple-500/10 border border-blue-500/20 rounded-xl p-4 text-center">
              <p className="text-3xl font-bold text-yellow-400">{myTotal}</p>
              <p className="text-xs text-white/50 mt-1">我的积分</p>
              <span className={`inline-block mt-2 text-xs px-2 py-1 rounded-full bg-gradient-to-r ${getRankTitle(myTotal).color} text-white`}>
                {getRankTitle(myTotal).emoji} {getRankTitle(myTotal).title}
              </span>
            </div>
          )}
          {myRecords.map(r => (
            <div key={r.id} className="flex items-center gap-3 p-2 rounded-lg bg-white/5">
              <span className="text-lg">{POINT_RULES.find(p => p.action === r.action)?.icon || '📌'}</span>
              <div className="flex-1">
                <p className="text-sm text-white/80">{r.action || r.reason}</p>
                <p className="text-[10px] text-white/30">{new Date(r.createdAt).toLocaleString()}</p>
              </div>
              <span className={`text-sm font-bold ${r.points > 0 ? 'text-green-400' : 'text-red-400'}`}>
                {r.points > 0 ? '+' : ''}{r.points}
              </span>
            </div>
          ))}
          {myRecords.length === 0 && <p className="text-center text-white/30 py-8">暂无积分记录</p>}
        </div>
      )}

      {/* Rules */}
      {viewMode === 'rules' && (
        <div className="space-y-2">
          {POINT_RULES.map((r, i) => (
            <div key={i} className="flex items-center gap-3 p-3 rounded-lg bg-white/5">
              <span className="text-xl">{r.icon}</span>
              <span className="flex-1 text-sm text-white/80">{r.action}</span>
              <span className={`text-sm font-bold ${r.points > 0 ? 'text-green-400' : 'text-red-400'}`}>
                {r.points > 0 ? '+' : ''}{r.points} 积分
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
