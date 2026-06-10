'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Clock, 
  Bell, 
  CheckCircle, 
  AlertCircle,
  Volume2,
  VolumeX
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { getClassTimetable, TimetableEntry, getAttendanceRecords } from '@/lib/sharedData';
import { getCurrentUser } from '@/lib/userUtils';

interface Reminder {
  id: string;
  time: string;
  title: string;
  type: 'check_in' | 'class' | 'custom';
  enabled: boolean;
  notified: boolean;
}

const REMINDERS_KEY = 'user_reminders';

// 课程开始时间（分钟）
const getClassStartMinutes = (period: number): number => {
  const times: Record<number, number> = {
    1: 8 * 60,
    2: 9 * 60,
    3: 10 * 60,
    4: 11 * 60,
    5: 14 * 60,
    6: 15 * 60,
    7: 16 * 60,
    8: 17 * 60,
  };
  return times[period] || 9 * 60;
};

// 格式化时间为字符串
const formatPeriodTime = (period: number): string => {
  const times: Record<number, string> = {
    1: '08:00',
    2: '09:00',
    3: '10:00',
    4: '11:00',
    5: '14:00',
    6: '15:00',
    7: '16:00',
    8: '17:30',
  };
  return times[period] || '09:00';
};

export function SmartReminderPanel() {
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [nextClass, setNextClass] = useState<TimetableEntry | null>(null);
  const user = getCurrentUser();

  // 加载提醒设置
  useEffect(() => {
    const stored = localStorage.getItem(REMINDERS_KEY);
    if (stored) {
      setReminders(JSON.parse(stored));
    } else {
      const defaultReminders: Reminder[] = [
        { id: '1', time: '08:00', title: '上课签到提醒', type: 'check_in', enabled: true, notified: false },
        { id: '2', time: '12:00', title: '午间考勤提醒', type: 'check_in', enabled: true, notified: false },
        { id: '3', time: '17:30', title: '下课签退提醒', type: 'check_in', enabled: true, notified: false },
      ];
      setReminders(defaultReminders);
      localStorage.setItem(REMINDERS_KEY, JSON.stringify(defaultReminders));
    }
  }, []);

  // 获取下一节课
  useEffect(() => {
    if (!user?.classId) return;

    const updateNextClass = () => {
      const timetable = getClassTimetable(user.classId!);
      const now = new Date();
      const currentDay = now.getDay();
      const currentTime = now.getHours() * 60 + now.getMinutes();
      
      for (let i = 0; i < 7; i++) {
        const checkDay = (currentDay + i) % 7;
        const dayClasses = timetable
          .filter((t: TimetableEntry) => t.dayOfWeek === checkDay)
          .sort((a: TimetableEntry, b: TimetableEntry) => a.period - b.period);
        
        for (const cls of dayClasses) {
          const classTime = getClassStartMinutes(cls.period);
          if (checkDay === currentDay && classTime > currentTime) {
            setNextClass(cls);
            return;
          } else if (i > 0) {
            setNextClass(cls);
            return;
          }
        }
      }
      setNextClass(null);
    };

    updateNextClass();
    const interval = setInterval(updateNextClass, 60000);
    return () => clearInterval(interval);
  }, [user?.classId]);

  // 检查是否已打卡
  const hasCheckedIn = useCallback((type: 'check_in' | 'check_out') => {
    if (!user?.id) return false;
    const records = getAttendanceRecords();
    const today = new Date().toISOString().split('T')[0];
    return records.some(r => 
      r.studentId === user.id && 
      r.type === type && 
      r.timestamp.startsWith(today)
    );
  }, [user?.id]);

  // 计算距离下一节课的时间
  const getTimeUntilNextClass = useCallback((): string => {
    if (!nextClass) return '';
    const now = new Date();
    const [hours, minutes] = formatPeriodTime(nextClass.period).split(':').map(Number);
    const classTime = new Date(now);
    classTime.setHours(hours, minutes, 0, 0);
    
    if (classTime <= now) {
      classTime.setDate(classTime.getDate() + 1);
    }
    
    const diff = classTime.getTime() - now.getTime();
    const hoursLeft = Math.floor(diff / 3600000);
    const minutesLeft = Math.floor((diff % 3600000) / 60000);
    
    if (hoursLeft > 0) {
      return `${hoursLeft}小时${minutesLeft}分钟`;
    }
    return `${minutesLeft}分钟`;
  }, [nextClass]);

  // 切换提醒开关
  const toggleReminder = useCallback((id: string) => {
    setReminders(prev => {
      const updated = prev.map(r => 
        r.id === id ? { ...r, enabled: !r.enabled } : r
      );
      localStorage.setItem(REMINDERS_KEY, JSON.stringify(updated));
      return updated;
    });
  }, []);

  // 删除提醒
  const deleteReminder = useCallback((id: string) => {
    setReminders(prev => {
      const updated = prev.filter(r => r.id !== id);
      localStorage.setItem(REMINDERS_KEY, JSON.stringify(updated));
      return updated;
    });
  }, []);

  // 添加提醒
  const addReminder = useCallback(() => {
    const newReminder: Reminder = {
      id: `reminder-${Date.now()}`,
      time: '09:00',
      title: '新提醒',
      type: 'custom',
      enabled: true,
      notified: false,
    };
    setReminders(prev => {
      const updated = [...prev, newReminder];
      localStorage.setItem(REMINDERS_KEY, JSON.stringify(updated));
      return updated;
    });
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Bell className="w-6 h-6" />
            智能提醒
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            设置打卡提醒，不错过每一次考勤
          </p>
        </div>
        
        <button
          onClick={() => setSoundEnabled(!soundEnabled)}
          className={cn(
            "p-2 rounded-lg transition-colors",
            soundEnabled ? "bg-blue-500/20 text-blue-400" : "bg-slate-700 text-slate-400"
          )}
          title={soundEnabled ? '关闭声音' : '开启声音'}
        >
          {soundEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
        </button>
      </div>

      {/* 下一节课卡片 */}
      {nextClass && (
        <Card className="bg-gradient-to-br from-blue-500/20 to-purple-500/20 border-blue-500/30">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-xl bg-blue-500/30 flex items-center justify-center">
                <Clock className="w-7 h-7 text-blue-400" />
              </div>
              <div className="flex-1">
                <div className="text-sm text-muted-foreground">下一节课</div>
                <div className="text-xl font-bold">{nextClass.subject}</div>
                {nextClass.teacher && (
                  <div className="text-sm text-muted-foreground">{nextClass.teacher} · 第{nextClass.period}节</div>
                )}
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-blue-400">{formatPeriodTime(nextClass.period)}</div>
                <div className="text-sm text-muted-foreground">距离开课 {getTimeUntilNextClass()}</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 考勤状态 */}
      <div className="grid grid-cols-2 gap-4">
        <Card className="bg-slate-800/50 border-slate-700">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              {hasCheckedIn('check_in') ? (
                <>
                  <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center">
                    <CheckCircle className="w-5 h-5 text-green-400" />
                  </div>
                  <div>
                    <div className="font-medium text-green-400">已签到</div>
                    <div className="text-xs text-muted-foreground">今日上课打卡已完成</div>
                  </div>
                </>
              ) : (
                <>
                  <div className="w-10 h-10 rounded-lg bg-amber-500/20 flex items-center justify-center">
                    <AlertCircle className="w-5 h-5 text-amber-400" />
                  </div>
                  <div>
                    <div className="font-medium text-amber-400">待签到</div>
                    <div className="text-xs text-muted-foreground">请完成上课打卡</div>
                  </div>
                </>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-800/50 border-slate-700">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              {hasCheckedIn('check_out') ? (
                <>
                  <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center">
                    <CheckCircle className="w-5 h-5 text-green-400" />
                  </div>
                  <div>
                    <div className="font-medium text-green-400">已签退</div>
                    <div className="text-xs text-muted-foreground">今日下课打卡已完成</div>
                  </div>
                </>
              ) : (
                <>
                  <div className="w-10 h-10 rounded-lg bg-slate-500/20 flex items-center justify-center">
                    <Clock className="w-5 h-5 text-slate-400" />
                  </div>
                  <div>
                    <div className="font-medium text-slate-400">待签退</div>
                    <div className="text-xs text-muted-foreground">下课后再签退</div>
                  </div>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 提醒列表 */}
      <Card className="bg-slate-800/50 border-slate-700">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-semibold flex items-center gap-2">
                <Clock className="w-5 h-5" />
                打卡提醒
              </h3>
              <p className="text-xs text-muted-foreground">设置每日定时提醒</p>
            </div>
            <Button size="sm" onClick={addReminder}>
              添加提醒
            </Button>
          </div>
          
          <div className="space-y-2">
            {reminders.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Bell className="w-10 h-10 mx-auto mb-2 opacity-40" />
                <p>暂无提醒设置</p>
                <p className="text-sm">点击上方按钮添加提醒</p>
              </div>
            ) : (
              reminders.map((reminder) => (
                <div
                  key={reminder.id}
                  className="flex items-center gap-4 p-3 rounded-lg bg-slate-900/50"
                >
                  <div className="text-2xl font-bold w-20">{reminder.time}</div>
                  <div className="flex-1">
                    <div className="font-medium">{reminder.title}</div>
                    <Badge variant="outline" className="text-xs mt-1">
                      {reminder.type === 'check_in' ? '考勤提醒' : reminder.type === 'class' ? '课程提醒' : '自定义'}
                    </Badge>
                  </div>
                  <button
                    onClick={() => toggleReminder(reminder.id)}
                    className={cn(
                      "w-12 h-6 rounded-full transition-colors relative",
                      reminder.enabled ? "bg-blue-500" : "bg-slate-600"
                    )}
                  >
                    <div className={cn(
                      "w-5 h-5 rounded-full bg-white absolute top-0.5 transition-transform",
                      reminder.enabled ? "translate-x-6" : "translate-x-0.5"
                    )} />
                  </button>
                  <button
                    onClick={() => deleteReminder(reminder.id)}
                    className="p-2 rounded-lg hover:bg-red-500/20 text-muted-foreground hover:text-red-400 transition-colors"
                  >
                    ×
                  </button>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
