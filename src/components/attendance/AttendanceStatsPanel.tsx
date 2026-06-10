'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { BarChart3, TrendingUp, TrendingDown, Users, CheckCircle, Clock, XCircle, Download } from 'lucide-react';
import { cn } from '@/lib/utils';
import { 
  getClasses, 
  getStudents, 
  getAttendanceRecords,
  getStudentWeeklyStats, 
  getClassWeeklyStats,
  SharedClass
} from '@/lib/sharedData';

export function AttendanceStatsPanel() {
  const [classes, setClasses] = useState<SharedClass[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<string>('');
  const [weekStats, setWeekStats] = useState<{date: string; dayName: string; checkedIn: number; total: number; rate: number}[]>([]);

  useEffect(() => {
    const loadData = () => {
      const classList = getClasses();
      setClasses(classList);
      if (!selectedClassId && classList.length > 0) {
        setSelectedClassId(classList[0].id);
      }
    };
    loadData();
    const interval = setInterval(loadData, 5000);
    return () => clearInterval(interval);
  }, [selectedClassId]);

  // 计算本周出勤趋势
  useEffect(() => {
    if (!selectedClassId) return;
    
    const calculateWeekStats = () => {
      const records = getAttendanceRecords();
      const students = getStudents().filter(s => s.classId === selectedClassId);
      const today = new Date();
      const weekData: { date: string; dayName: string; checkedIn: number; total: number; rate: number }[] = [];
      
      for (let i = 6; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];
        
        const dayRecords = records.filter((r) => 
          r.classId === selectedClassId && 
          r.timestamp.startsWith(dateStr) &&
          (r.type === 'check_in' || r.type === 'check_out')
        );
        
        const checkedIn = new Set(dayRecords.map((r) => r.studentId)).size;
        const total = students.length;
        
        weekData.push({
          date: dateStr,
          dayName: ['日', '一', '二', '三', '四', '五', '六'][date.getDay()],
          checkedIn,
          total,
          rate: total > 0 ? Math.round((checkedIn / total) * 100) : 0,
        });
      }
      
      setWeekStats(weekData);
    };
    
    calculateWeekStats();
    const interval = setInterval(calculateWeekStats, 5000);
    return () => clearInterval(interval);
  }, [selectedClassId]);

  const selectedClass = classes.find(c => c.id === selectedClassId);
  const classStats = selectedClassId ? getClassWeeklyStats(selectedClassId) : null;
  
  // 计算本周平均出勤率
  const avgRate = weekStats.length > 0 
    ? Math.round(weekStats.reduce((sum, d) => sum + d.rate, 0) / weekStats.length)
    : 0;

  // 最高/最低出勤率
  const maxRate = weekStats.length > 0 ? Math.max(...weekStats.map(d => d.rate)) : 0;
  const minRate = weekStats.length > 0 ? Math.min(...weekStats.map(d => d.rate)) : 0;
  const maxDay = weekStats.find(d => d.rate === maxRate)?.dayName || '';
  const minDay = weekStats.find(d => d.rate === minRate)?.dayName || '';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">考勤数据统计</h2>
        <select
          value={selectedClassId}
          onChange={(e) => setSelectedClassId(e.target.value)}
          className="px-4 py-2 rounded-lg border bg-slate-800 border-slate-700"
        >
          {classes.map((cls) => (
            <option key={cls.id} value={cls.id}>{cls.name}</option>
          ))}
        </select>
      </div>

      {/* 概览卡片 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-blue-500/20 to-blue-600/20 border-blue-500/30">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-blue-500/30 flex items-center justify-center">
                <Users className="w-6 h-6 text-blue-400" />
              </div>
              <div>
                <div className="text-2xl font-bold">{classStats?.totalStudents || 0}</div>
                <div className="text-xs text-muted-foreground">班级总人数</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-500/20 to-green-600/20 border-green-500/30">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-green-500/30 flex items-center justify-center">
                <CheckCircle className="w-6 h-6 text-green-400" />
              </div>
              <div>
                <div className="text-2xl font-bold">{classStats?.checkedInToday || 0}</div>
                <div className="text-xs text-muted-foreground">今日已签到</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-amber-500/20 to-amber-600/20 border-amber-500/30">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-amber-500/30 flex items-center justify-center">
                <Clock className="w-6 h-6 text-amber-400" />
              </div>
              <div>
                <div className="text-2xl font-bold">{classStats?.leaveToday || 0}</div>
                <div className="text-xs text-muted-foreground">请假人数</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-red-500/20 to-red-600/20 border-red-500/30">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-red-500/30 flex items-center justify-center">
                <XCircle className="w-6 h-6 text-red-400" />
              </div>
              <div>
                <div className="text-2xl font-bold">{classStats?.absentToday || 0}</div>
                <div className="text-xs text-muted-foreground">缺勤人数</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 出勤趋势图 */}
      <Card className="bg-slate-800/50 border-slate-700">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5" />
                本周出勤趋势
              </CardTitle>
              <CardDescription>班级：{selectedClass?.name}</CardDescription>
            </div>
            <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
              周平均出勤率：{avgRate}%
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          {/* 柱状图 */}
          <div className="flex items-end justify-between gap-2 h-48 mb-4">
            {weekStats.map((day, index) => {
              const height = day.rate > 0 ? Math.max(day.rate, 10) : 5;
              return (
                <div key={index} className="flex-1 flex flex-col items-center gap-2">
                  <div className="w-full flex flex-col items-center justify-end h-36">
                    <div 
                      className={cn(
                        "w-full rounded-t-lg transition-all duration-500",
                        day.rate >= 80 ? "bg-green-500" : 
                        day.rate >= 60 ? "bg-amber-500" : "bg-red-500"
                      )}
                      style={{ height: `${height}%` }}
                    />
                  </div>
                  <span className="text-sm text-muted-foreground">周{day.dayName}</span>
                  <span className="text-xs font-medium">{day.rate}%</span>
                </div>
              );
            })}
          </div>

          {/* 统计摘要 */}
          <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-700">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-green-400" />
              <span className="text-sm">最高出勤：周{maxDay} ({maxRate}%)</span>
            </div>
            <div className="flex items-center gap-2">
              <TrendingDown className="w-4 h-4 text-red-400" />
              <span className="text-sm">最低出勤：周{minDay} ({minRate}%)</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 学生出勤明细 */}
      <Card className="bg-slate-800/50 border-slate-700">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            学生出勤明细
          </CardTitle>
          <CardDescription>班级学生本周考勤情况</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {getStudents()
              .filter(s => s.classId === selectedClassId)
              .map(student => {
                const stats = getStudentWeeklyStats(student.id);
                return (
                  <div 
                    key={student.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-slate-900/50"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-blue-500/30 flex items-center justify-center text-sm font-medium">
                        {student.name.charAt(0)}
                      </div>
                      <div>
                        <div className="font-medium text-sm">{student.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {student.studentId || '未设置学号'}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <div className="text-sm font-medium">
                          <span className="text-green-400">{stats.presentDays}</span>
                          <span className="text-muted-foreground"> / {stats.totalDays}</span>
                        </div>
                        <div className="text-xs text-muted-foreground">出勤次数</div>
                      </div>
                      <Badge 
                        variant="outline"
                        className={cn(
                          stats.attendanceRate >= 90 ? "border-green-500 text-green-400" :
                          stats.attendanceRate >= 70 ? "border-amber-500 text-amber-400" :
                          "border-red-500 text-red-400"
                        )}
                      >
                        {stats.attendanceRate}%
                      </Badge>
                    </div>
                  </div>
                );
              })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
