'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { BookOpen, TrendingUp, TrendingDown, Minus, Award } from 'lucide-react';
import { getGrades } from '@/lib/sharedData';
import type { Grade } from '@/types/attendance';

interface StudentGradeViewProps {
  studentId: string;
  studentName?: string;
}

export default function StudentGradeView({ studentId, studentName }: StudentGradeViewProps) {
  const [grades, setGrades] = useState<Grade[]>([]);

  useEffect(() => {
    const allGrades = getGrades();
    // 先按 studentId 精确匹配，再按 studentName 模糊匹配
    let myGrades = allGrades.filter(g => g.studentId === studentId);
    if (myGrades.length === 0 && studentName) {
      myGrades = allGrades.filter(g => g.studentName === studentName);
    }
    // 如果通过 name 匹配到了成绩，修正 studentId 使其一致
    if (myGrades.length > 0 && myGrades[0].studentId !== studentId && studentName) {
      console.log(`[StudentGradeView] ID 映射修复: grade.studentId=${myGrades[0].studentId} → studentId=${studentId}`);
    }
    setGrades(myGrades);
  }, [studentId, studentName]);

  const subjectGrades = grades.reduce<Record<string, Grade[]>>((acc, g) => {
    if (!acc[g.subject]) acc[g.subject] = [];
    acc[g.subject].push(g);
    return acc;
  }, {});

  const getTrend = (subjectGradesList: Grade[]) => {
    if (subjectGradesList.length < 2) return 'neutral';
    const sorted = [...subjectGradesList].sort((a, b) => a.date.localeCompare(b.date));
    const last = sorted[sorted.length - 1].score;
    const prev = sorted[sorted.length - 2].score;
    if (last > prev) return 'up';
    if (last < prev) return 'down';
    return 'neutral';
  };

  const overallAvg = grades.length > 0
    ? (grades.reduce((sum, g) => sum + g.score, 0) / grades.length).toFixed(1)
    : '0';

  const TrendIcon = ({ trend }: { trend: string }) => {
    if (trend === 'up') return <TrendingUp className="h-4 w-4 text-emerald-500" />;
    if (trend === 'down') return <TrendingDown className="h-4 w-4 text-red-500" />;
    return <Minus className="h-4 w-4 text-gray-400" />;
  };

  // 颜色配置
  const subjectColors: Record<string, string> = {
    '语文': 'from-red-400 to-rose-500',
    '数学': 'from-blue-400 to-indigo-500',
    '英语': 'from-cyan-400 to-blue-500',
    '物理': 'from-purple-400 to-violet-500',
    '化学': 'from-green-400 to-emerald-500',
    '生物': 'from-teal-400 to-cyan-500',
    '历史': 'from-amber-400 to-orange-500',
    '地理': 'from-lime-400 to-green-500',
    '政治': 'from-pink-400 to-rose-500',
  };

  const getSubjectColor = (subject: string) => {
    for (const [key, color] of Object.entries(subjectColors)) {
      if (subject.includes(key)) return color;
    }
    return 'from-gray-400 to-gray-500';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="shadow-xl border-0 overflow-hidden">
        <div className="h-2 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500" />
        <CardContent className="p-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg">
              <BookOpen className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-800">我的成绩</h2>
              <p className="text-sm text-gray-500">
                {grades.length > 0
                  ? `共 ${grades.length} 条成绩记录 · 平均分 ${overallAvg}`
                  : '暂无成绩数据'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {grades.length === 0 ? (
        <Card className="shadow-lg border-0">
          <CardContent className="py-16">
            <div className="text-center">
              <div className="w-20 h-20 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Award className="w-10 h-10 text-blue-300" />
              </div>
              <p className="text-gray-500 text-lg font-medium">暂无成绩数据</p>
              <p className="text-gray-400 text-sm mt-1">老师还没有发布成绩</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Subject Overview Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {Object.entries(subjectGrades).map(([subject, sGrades]) => {
              const avg = sGrades.reduce((sum, g) => sum + g.score, 0) / sGrades.length;
              const trend = getTrend(sGrades);
              const latestScore = [...sGrades].sort((a, b) => b.date.localeCompare(a.date))[0].score;
              return (
                <Card key={subject} className="shadow-lg border-0 overflow-hidden hover:shadow-xl transition-shadow duration-300">
                  <div className={`h-1.5 bg-gradient-to-r ${getSubjectColor(subject)}`} />
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-600">{subject}</span>
                      <TrendIcon trend={trend} />
                    </div>
                    <div className="text-3xl font-bold text-gray-800 mb-1">{latestScore}</div>
                    <div className="flex items-center gap-2 text-xs text-gray-400">
                      <span>平均 {avg.toFixed(1)}</span>
                      <span>·</span>
                      <span>{sGrades.length}次考试</span>
                    </div>
                    {/* Mini progress bar */}
                    <div className="mt-3 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full bg-gradient-to-r ${getSubjectColor(subject)}`}
                        style={{ width: `${Math.min(latestScore, 100)}%` }}
                      />
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Detail Table */}
          <Card className="shadow-lg border-0 overflow-hidden">
            <div className="h-1 bg-gradient-to-r from-indigo-500 to-purple-500" />
            <CardContent className="p-6">
              <h3 className="text-lg font-bold text-gray-800 mb-4">成绩明细</h3>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-b-2 border-gray-100">
                      <TableHead className="font-semibold text-gray-600">科目</TableHead>
                      <TableHead className="font-semibold text-gray-600">成绩</TableHead>
                      <TableHead className="font-semibold text-gray-600">满分</TableHead>
                      <TableHead className="font-semibold text-gray-600">考试</TableHead>
                      <TableHead className="font-semibold text-gray-600">日期</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {grades.sort((a, b) => b.date.localeCompare(a.date)).map((g) => (
                      <TableRow key={g.id} className="hover:bg-blue-50/50 transition-colors">
                        <TableCell>
                          <span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded-md text-sm font-medium">{g.subject}</span>
                        </TableCell>
                        <TableCell>
                          <span className={`font-bold text-lg ${
                            g.score >= 90 ? 'text-emerald-600' :
                            g.score >= 60 ? 'text-blue-600' : 'text-red-600'
                          }`}>
                            {g.score}
                          </span>
                        </TableCell>
                        <TableCell className="text-gray-400">{g.fullScore}</TableCell>
                        <TableCell className="text-gray-600">{g.examName}</TableCell>
                        <TableCell className="text-gray-400 text-sm">{g.date}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
