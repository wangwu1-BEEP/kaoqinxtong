'use client';

import { useState, useEffect } from 'react';
import { ArrowLeft, FileText, Download } from 'lucide-react';
import { getCurrentUser } from '@/lib/userUtils';
import { getAttendanceRecords, SharedAttendanceRecord } from '@/lib/sharedData';
import { Student } from '@/types/attendance';
import { StoredUser } from '@/lib/userUtils';

export default function StudentReportPage() {
  const [user, setUser] = useState<StoredUser | null>(null);
  const [stats, setStats] = useState({
    total: 0,
    checkIn: 0,
    checkOut: 0,
    leave: 0,
    goOut: 0,
    rate: 0,
  });
  const [weeklyData, setWeeklyData] = useState<number[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const calculateStats = (currentUser: StoredUser) => {
    const stored = localStorage.getItem('shared_attendance');
    if (!stored) return;

    const allRecords = JSON.parse(stored) as SharedAttendanceRecord[];
    const userRecords = allRecords.filter((r) => r.studentId === currentUser.id || r.studentName === currentUser.name);

    const checkIn = userRecords.filter((r) => r.type === 'check_in').length;
    const checkOut = userRecords.filter((r) => r.type === 'check_out').length;
    const leave = userRecords.filter((r) => r.type === 'leave').length;
    const goOut = userRecords.filter((r) => r.type === 'go_out').length;

    setStats({
      total: userRecords.length,
      checkIn,
      checkOut,
      leave,
      goOut,
      rate: userRecords.length > 0 ? Math.round((checkIn + checkOut) / userRecords.length * 100) : 0,
    });

    // 计算本周每天的打卡次数
    const today = new Date();
    const weekData = [0, 0, 0, 0, 0, 0, 0];
    for (let i = 0; i < 7; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() - today.getDay() + i);
      const dateStr = date.toISOString().split('T')[0];
      weekData[i] = userRecords.filter((r) => r.timestamp.startsWith(dateStr)).length;
    }
    setWeeklyData(weekData);
  };

  useEffect(() => {
    const currentUser = getCurrentUser();
    if (!currentUser) {
      window.location.href = '/login';
      return;
    }
    setUser(currentUser);
    calculateStats(currentUser);
    setIsLoading(false);
  }, []);

  const handleExport = () => {
    if (!user) return;
    const stored = localStorage.getItem('shared_attendance');
    if (!stored) return;

    const allRecords = JSON.parse(stored) as SharedAttendanceRecord[];
    const userRecords = allRecords.filter((r) => r.studentId === user.id || r.studentName === user.name);

    const csv = [
      ['日期', '时间', '类型', '方式'],
      ...userRecords.map((r) => [
        new Date(r.timestamp).toLocaleDateString('zh-CN'),
        new Date(r.timestamp).toLocaleTimeString('zh-CN'),
        r.type,
        r.method,
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `考勤报告_${user.name}_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const getRating = () => {
    if (stats.rate >= 95) return '★★★★★';
    if (stats.rate >= 85) return '★★★★☆';
    if (stats.rate >= 75) return '★★★☆☆';
    if (stats.rate >= 60) return '★★☆☆☆';
    return '★☆☆☆☆';
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#1a1a2e', color: '#fff' }}>
        <div className="text-lg">加载中...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#1a1a2e', color: '#fff' }}>
      {/* 顶部 */}
      <div className="p-4">
        <button
          onClick={() => window.location.href = '/student'}
          className="flex items-center gap-2 px-4 py-2 rounded-xl"
          style={{ backgroundColor: '#2d2d44' }}
        >
          <ArrowLeft className="w-5 h-5" />
          返回
        </button>
      </div>

      {/* 内容区 */}
      <div className="px-4 pb-4 space-y-4">
        <h1 className="text-xl font-bold flex items-center gap-2">
          <FileText className="w-6 h-6" />
          个人考勤报告
        </h1>

        {/* 统计卡片 */}
        <div className="grid grid-cols-2 gap-3">
          <div className="p-4 rounded-xl text-center" style={{ backgroundColor: '#2d2d44' }}>
            <div className="text-3xl font-bold" style={{ color: '#3b82f6' }}>{stats.total}</div>
            <div className="text-sm opacity-60">总打卡次数</div>
          </div>
          <div className="p-4 rounded-xl text-center" style={{ backgroundColor: '#2d2d44' }}>
            <div className="text-3xl font-bold" style={{ color: '#10b981' }}>{stats.rate}%</div>
            <div className="text-sm opacity-60">出勤率</div>
          </div>
          <div className="p-4 rounded-xl text-center" style={{ backgroundColor: '#2d2d44' }}>
            <div className="text-2xl font-bold">{stats.checkIn}</div>
            <div className="text-sm opacity-60">上课打卡</div>
          </div>
          <div className="p-4 rounded-xl text-center" style={{ backgroundColor: '#2d2d44' }}>
            <div className="text-2xl font-bold">{stats.checkOut}</div>
            <div className="text-sm opacity-60">下课打卡</div>
          </div>
        </div>

        {/* 评级 */}
        <div className="p-4 rounded-xl text-center" style={{ backgroundColor: '#2d2d44' }}>
          <div className="text-4xl mb-2">{getRating()}</div>
          <div className="text-sm opacity-60">本周考勤评级</div>
        </div>

        {/* 本周趋势 */}
        <div className="p-4 rounded-xl" style={{ backgroundColor: '#2d2d44' }}>
          <div className="text-sm font-medium mb-3">本周打卡趋势</div>
          <div className="flex items-end justify-between h-32 gap-2">
            {['周日', '周一', '周二', '周三', '周四', '周五', '周六'].map((day, index) => (
              <div key={index} className="flex-1 flex flex-col items-center gap-1">
                <div
                  className="w-full rounded-t"
                  style={{
                    height: `${Math.max(4, weeklyData[index] * 10)}px`,
                    backgroundColor: weeklyData[index] > 0 ? '#3b82f6' : '#4b5563'
                  }}
                />
                <div className="text-xs opacity-60">{day.slice(1)}</div>
              </div>
            ))}
          </div>
        </div>

        {/* 导出 */}
        <button
          onClick={handleExport}
          className="w-full py-4 rounded-xl font-medium flex items-center justify-center gap-2"
          style={{ backgroundColor: '#10b981' }}
        >
          <Download className="w-5 h-5" />
          导出考勤报告
        </button>
      </div>
    </div>
  );
}
