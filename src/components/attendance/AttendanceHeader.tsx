'use client';

import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { ClassInfo, AttendanceStats } from '@/types/attendance';
import { Clock, Users, UserCheck, Calendar } from 'lucide-react';

interface HeaderProps {
  classInfo?: ClassInfo;
  stats?: AttendanceStats;
  teacherName?: string;
}

// 默认数据
const defaultClassInfo: ClassInfo = {
  id: 'class-001',
  name: '初三（1）班',
  teacherId: 'teacher-001',
  teacherName: '张老师',
  studentCount: 45,
  checkedInCount: 38,
};

const defaultStats: AttendanceStats = {
  total: 45,
  checkedIn: 38,
  checkedOut: 0,
  onLeave: 2,
  outOfSchool: 1,
};

export function AttendanceHeader({ 
  classInfo = defaultClassInfo, 
  stats = defaultStats,
  teacherName 
}: HeaderProps) {
  const [mounted, setMounted] = useState(false);
  const [currentTime, setCurrentTime] = useState<Date | null>(null);

  useEffect(() => {
    setMounted(true);
    setCurrentTime(new Date());
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  return (
    <header className="bg-gradient-to-r from-blue-600 to-blue-800 text-white shadow-lg">
      <div className="container mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          {/* 左侧：班级信息 */}
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                <Users className="w-7 h-7" />
              </div>
              <div>
                <h1 className="text-2xl font-bold">{classInfo.name}</h1>
                <p className="text-blue-100 text-sm flex items-center gap-1">
                  <UserCheck className="w-4 h-4" />
                  班主任：{teacherName || classInfo.teacherName}
                </p>
              </div>
            </div>
          </div>

          {/* 中间：日期时间 */}
          <div className="text-center">
            <div className="flex items-center gap-2 justify-center text-3xl font-mono font-bold">
              <Clock className="w-8 h-8" />
              {mounted && currentTime ? format(currentTime, 'HH:mm:ss') : '00:00:00'}
            </div>
            <p className="text-blue-100 text-sm mt-1">
              {mounted && currentTime 
                ? format(currentTime, 'yyyy年MM月dd日 EEEE', { locale: zhCN })
                : '加载中...'}
            </p>
          </div>

          {/* 右侧：考勤统计 */}
          <div className="flex items-center gap-4">
            <div className="bg-white/10 rounded-xl px-4 py-2 text-center">
              <div className="text-2xl font-bold">{stats.checkedIn}/{stats.total}</div>
              <div className="text-blue-100 text-xs flex items-center gap-1 justify-center">
                <Calendar className="w-3 h-3" />
                已签到
              </div>
            </div>
            <div className="bg-white/10 rounded-xl px-4 py-2 text-center">
              <div className="text-2xl font-bold text-yellow-300">{stats.onLeave}</div>
              <div className="text-blue-100 text-xs">请假</div>
            </div>
            <div className="bg-white/10 rounded-xl px-4 py-2 text-center">
              <div className="text-2xl font-bold text-purple-300">{stats.outOfSchool}</div>
              <div className="text-blue-100 text-xs">外出</div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}

// 导出默认数据
export { defaultClassInfo as mockClassInfo, defaultStats as mockStats };
