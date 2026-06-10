'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  BarChart3, 
  TrendingUp, 
  TrendingDown,
  Calendar,
  CheckCircle,
  Clock,
  XCircle,
  Download,
  ChevronLeft,
  ChevronRight,
  Star
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { getAttendanceRecords, getClassTimetable, TimetableEntry } from '@/lib/sharedData';
import { getCurrentUser } from '@/lib/userUtils';

interface WeeklyStats {
  presentDays: number;
  totalDays: number;
  attendanceRate: number;
  lateDays: number;
  absentDays: number;
  leaveDays: number;
  goOutDays: number;
}

export function AttendanceReport() {
  const [weekOffset, setWeekOffset] = useState(0); // 0=本周, -1=上周, 1=下周
  const [weeklyStats, setWeeklyStats] = useState<WeeklyStats>({
    presentDays: 0,
    totalDays: 7,
    attendanceRate: 0,
    lateDays: 0,
    absentDays: 0,
    leaveDays: 0,
    goOutDays: 0,
  });
  const [dailyData, setDailyData] = useState<{ date: string; day: string; status: 'present' | 'late' | 'absent' | 'none' }[]>([]);
  const user = getCurrentUser();

  // 计算周统计数据
  useEffect(() => {
    if (!user?.id) return;

    const calculateStats = () => {
      const records = getAttendanceRecords();
      const today = new Date();
      const weekStart = new Date(today);
      weekStart.setDate(today.getDate() - today.getDay() + 1 + weekOffset * 7); // 周一开始
      weekStart.setHours(0, 0, 0, 0);
      
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 6);
      weekEnd.setHours(23, 59, 59, 999);

      // 筛选本周的考勤记录
      const weekRecords = records.filter(r => {
        const recordDate = new Date(r.timestamp);
        return r.studentId === user.id && recordDate >= weekStart && recordDate <= weekEnd;
      });

      // 按日期分组
      const recordsByDate: Record<string, typeof weekRecords> = {};
      weekRecords.forEach(r => {
        const dateKey = r.timestamp.split('T')[0];
        if (!recordsByDate[dateKey]) {
          recordsByDate[dateKey] = [];
        }
        recordsByDate[dateKey].push(r);
      });

      // 计算每日状态
      const days = ['一', '二', '三', '四', '五', '六', '日'];
      const daily: { date: string; day: string; status: 'present' | 'late' | 'absent' | 'none' }[] = [];
      let presentDays = 0;
      let lateDays = 0;
      let leaveDays = 0;
      let goOutDays = 0;

      for (let i = 0; i < 7; i++) {
        const date = new Date(weekStart);
        date.setDate(weekStart.getDate() + i);
        const dateKey = date.toISOString().split('T')[0];
        const dayRecords = recordsByDate[dateKey] || [];
        
        const hasCheckIn = dayRecords.some(r => r.type === 'check_in');
        const hasLate = dayRecords.some(r => r.verified === false);
        const hasLeave = dayRecords.some(r => r.type === 'leave');
        const hasGoOut = dayRecords.some(r => r.type === 'go_out');

        let status: 'present' | 'late' | 'absent' | 'none' = 'none';
        if (hasCheckIn) {
          status = hasLate ? 'late' : 'present';
          presentDays++;
          if (hasLate) lateDays++;
        } else if (hasLeave || hasGoOut) {
          if (hasLeave) leaveDays++;
          if (hasGoOut) goOutDays++;
          presentDays++; // 请假/外出视为正常
        }

        daily.push({
          date: dateKey,
          day: `周${days[i]}`,
          status
        });
      }

      const totalDays = 7;
      const absentDays = totalDays - presentDays;

      setDailyData(daily);
      setWeeklyStats({
        presentDays,
        totalDays,
        attendanceRate: Math.round((presentDays / totalDays) * 100),
        lateDays,
        absentDays,
        leaveDays,
        goOutDays,
      });
    };

    calculateStats();
  }, [user?.id, weekOffset]);

  // 获取周标签
  const getWeekLabel = () => {
    const today = new Date();
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - today.getDay() + 1 + weekOffset * 7);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);

    if (weekOffset === 0) return '本周';
    if (weekOffset === -1) return '上周';
    if (weekOffset === 1) return '下周';

    return `${weekStart.getMonth() + 1}/${weekStart.getDate()} - ${weekEnd.getMonth() + 1}/${weekEnd.getDate()}`;
  };

  // 获取评级
  const getRating = () => {
    const rate = weeklyStats.attendanceRate;
    if (rate >= 95) return { stars: 5, label: '优秀', color: 'text-yellow-400' };
    if (rate >= 85) return { stars: 4, label: '良好', color: 'text-green-400' };
    if (rate >= 70) return { stars: 3, label: '一般', color: 'text-blue-400' };
    if (rate >= 60) return { stars: 2, label: '较差', color: 'text-orange-400' };
    return { stars: 1, label: '需改进', color: 'text-red-400' };
  };

  const rating = getRating();

  // 导出报告
  const exportReport = () => {
    const report = `
智能考勤周报 - ${getWeekLabel()}
========================
学生：${user?.name || '未知'}
班级：${user?.className || '未知'}
生成时间：${new Date().toLocaleString('zh-CN')}

出勤统计
------------------------
应到天数：${weeklyStats.totalDays}天
实际出勤：${weeklyStats.presentDays}天
出勤率：${weeklyStats.attendanceRate}%

出勤详情
------------------------
正常出勤：${weeklyStats.presentDays - weeklyStats.lateDays}天
迟到次数：${weeklyStats.lateDays}次
请假天数：${weeklyStats.leaveDays}天
外出天数：${weeklyStats.goOutDays}天
缺勤天数：${weeklyStats.absentDays}天

每日明细
------------------------
${dailyData.map(d => `${d.date} ${d.day}: ${
  d.status === 'present' ? '✓ 正常' : 
  d.status === 'late' ? '△ 迟到' : 
  d.status === 'absent' ? '× 缺勤' : '- 未记录'
}`).join('\n')}

综合评级：${rating.label}
    `.trim();

    const blob = new Blob([report], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `attendance_report_${getWeekLabel()}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <BarChart3 className="w-6 h-6" />
            个人考勤报告
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            查看您的考勤统计和分析
          </p>
        </div>
        
        <Button onClick={exportReport} className="flex items-center gap-2">
          <Download className="w-4 h-4" />
          导出报告
        </Button>
      </div>

      {/* 周选择器 */}
      <div className="flex items-center justify-center gap-4">
        <button
          onClick={() => setWeekOffset(prev => prev - 1)}
          className="p-2 rounded-lg hover:bg-slate-700 transition-colors"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <div className="text-lg font-medium min-w-[100px] text-center">
          {getWeekLabel()}
        </div>
        <button
          onClick={() => setWeekOffset(prev => prev + 1)}
          className="p-2 rounded-lg hover:bg-slate-700 transition-colors"
          disabled={weekOffset >= 0}
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      {/* 综合评级 */}
      <Card className="bg-gradient-to-br from-purple-500/20 to-blue-500/20 border-purple-500/30">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-muted-foreground mb-1">综合评级</div>
              <div className={cn("text-3xl font-bold", rating.color)}>
                {rating.label}
              </div>
              <div className="flex items-center gap-1 mt-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star
                    key={star}
                    className={cn(
                      "w-5 h-5",
                      star <= rating.stars ? "fill-yellow-400 text-yellow-400" : "text-slate-600"
                    )}
                  />
                ))}
              </div>
            </div>
            <div className="text-right">
              <div className="text-5xl font-bold text-blue-400">
                {weeklyStats.attendanceRate}%
              </div>
              <div className="text-sm text-muted-foreground">本周出勤率</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 统计卡片 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-slate-800/50 border-slate-700">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-green-400" />
              </div>
              <div>
                <div className="text-2xl font-bold">{weeklyStats.presentDays}</div>
                <div className="text-xs text-muted-foreground">出勤天数</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-800/50 border-slate-700">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-amber-500/20 flex items-center justify-center">
                <Clock className="w-5 h-5 text-amber-400" />
              </div>
              <div>
                <div className="text-2xl font-bold">{weeklyStats.lateDays}</div>
                <div className="text-xs text-muted-foreground">迟到次数</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-800/50 border-slate-700">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-red-500/20 flex items-center justify-center">
                <XCircle className="w-5 h-5 text-red-400" />
              </div>
              <div>
                <div className="text-2xl font-bold">{weeklyStats.absentDays}</div>
                <div className="text-xs text-muted-foreground">缺勤天数</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-800/50 border-slate-700">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
                <Calendar className="w-5 h-5 text-blue-400" />
              </div>
              <div>
                <div className="text-2xl font-bold">{weeklyStats.totalDays}</div>
                <div className="text-xs text-muted-foreground">应到天数</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 每日明细 */}
      <Card className="bg-slate-800/50 border-slate-700">
        <CardHeader>
          <CardTitle className="text-lg">每日明细</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-end justify-between gap-2 h-32 mb-4">
            {dailyData.map((day, index) => {
              const height = day.status === 'none' ? 10 : 80;
              return (
                <div key={index} className="flex-1 flex flex-col items-center gap-2">
                  <div className="w-full flex flex-col items-center justify-end h-24">
                    <div 
                      className={cn(
                        "w-full rounded-t-lg transition-all",
                        day.status === 'present' ? "bg-green-500" :
                        day.status === 'late' ? "bg-amber-500" :
                        day.status === 'absent' ? "bg-red-500" :
                        "bg-slate-600"
                      )}
                      style={{ height: `${height}%` }}
                    />
                  </div>
                  <span className="text-sm font-medium">{day.day}</span>
                </div>
              );
            })}
          </div>

          {/* 图例 */}
          <div className="flex items-center justify-center gap-6 pt-4 border-t border-slate-700">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-green-500" />
              <span className="text-sm text-muted-foreground">正常</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-amber-500" />
              <span className="text-sm text-muted-foreground">迟到</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-red-500" />
              <span className="text-sm text-muted-foreground">缺勤</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-slate-600" />
              <span className="text-sm text-muted-foreground">未记录</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 考勤趋势 */}
      <Card className="bg-slate-800/50 border-slate-700">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            出勤趋势
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <div className="text-sm text-muted-foreground mb-2">与上周相比</div>
              <div className="flex items-center gap-2">
                {weeklyStats.attendanceRate >= 80 ? (
                  <div className="flex items-center gap-1 text-green-400">
                    <TrendingUp className="w-5 h-5" />
                    <span className="font-bold text-lg">表现良好</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-1 text-amber-400">
                    <TrendingDown className="w-5 h-5" />
                    <span className="font-bold text-lg">需继续保持</span>
                  </div>
                )}
              </div>
            </div>
            <div className="text-right">
              <div className="text-sm text-muted-foreground">本周表现</div>
              <div className={cn(
                "text-2xl font-bold",
                weeklyStats.attendanceRate >= 90 ? "text-green-400" :
                weeklyStats.attendanceRate >= 70 ? "text-amber-400" :
                "text-red-400"
              )}>
                {weeklyStats.attendanceRate >= 90 ? "优秀" :
                 weeklyStats.attendanceRate >= 70 ? "良好" :
                 weeklyStats.attendanceRate >= 60 ? "一般" : "需改进"}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
