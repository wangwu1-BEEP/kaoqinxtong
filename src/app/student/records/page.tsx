'use client';

import { useState, useEffect } from 'react';
import { ArrowLeft, CheckCircle, ClipboardList, MapPin } from 'lucide-react';
import { getCurrentUser } from '@/lib/userUtils';

import { Student } from '@/types/attendance';
import { StoredUser } from '@/lib/userUtils';
import { SharedAttendanceRecord } from '@/lib/sharedData';

export default function StudentRecordsPage() {
  const [records, setRecords] = useState<SharedAttendanceRecord[]>([]);
  const [user, setUser] = useState<StoredUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const currentUser = getCurrentUser();
    if (!currentUser) {
      window.location.href = '/login';
      return;
    }
    setUser(currentUser);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    if (!user) return;
    
    const loadRecords = () => {
      const stored = localStorage.getItem('shared_attendance');
      if (stored) {
        const allRecords = JSON.parse(stored) as SharedAttendanceRecord[];
        const userRecords = allRecords
          .filter((r) => r.studentId === user.id || r.studentName === user.name)
          .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
          .slice(0, 50);
        setRecords(userRecords);
      }
    };
    
    loadRecords();
    const interval = setInterval(loadRecords, 3000);
    return () => clearInterval(interval);
  }, [user]);

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'check_in': return '上课打卡';
      case 'check_out': return '下课打卡';
      case 'leave': return '请假';
      case 'go_out': return '外出';
      default: return type;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'check_in': return '#3b82f6';
      case 'check_out': return '#10b981';
      case 'leave': return '#f59e0b';
      case 'go_out': return '#8b5cf6';
      default: return '#6b7280';
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#1a1a2e', color: '#fff' }}>
        <div>加载中...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-4" style={{ backgroundColor: '#1a1a2e', color: '#fff' }}>
      {/* 顶部 */}
      <div className="p-4 flex items-center gap-4">
        <button
          onClick={() => window.location.href = '/student'}
          className="flex items-center gap-2 px-4 py-2 rounded-xl"
          style={{ backgroundColor: '#2d2d44' }}
        >
          <ArrowLeft className="w-5 h-5" />
          返回
        </button>
        <h1 className="text-xl font-bold">考勤记录</h1>
      </div>

      {/* 记录列表 */}
      <div className="px-4 space-y-3">
        {records.length === 0 ? (
          <div className="text-center py-12">
            <ClipboardList className="w-16 h-16 mx-auto mb-4 opacity-40" />
            <p className="opacity-60">暂无考勤记录</p>
            <p className="text-sm opacity-40 mt-2">完成人脸或声纹识别后即可打卡</p>
          </div>
        ) : (
          records.map((record) => (
            <div
              key={record.id}
              className="p-4 rounded-xl"
              style={{ backgroundColor: '#2d2d44' }}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center"
                    style={{ backgroundColor: getTypeColor(record.type) }}
                  >
                    <CheckCircle className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <div className="font-medium">{getTypeLabel(record.type)}</div>
                    <div className="text-xs opacity-60">
                      {record.method === 'face' ? '人脸识别' : '声纹识别'}
                    </div>
                    {/* 定位信息 */}
                    {record.latitude && record.longitude && (
                      <div className="flex items-center gap-1 mt-1">
                        <MapPin className="w-3 h-3 text-emerald-400/60" />
                        <span className="text-[10px] text-emerald-300/50">
                          {Math.abs(record.latitude).toFixed(4)}°{record.latitude >= 0 ? 'N' : 'S'}, {Math.abs(record.longitude).toFixed(4)}°{record.longitude >= 0 ? 'E' : 'W'}
                          {record.locationAccuracy ? ` (±${Math.round(record.locationAccuracy)}m)` : ''}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-medium">
                    {new Date(record.timestamp).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}
                  </div>
                  <div className="text-xs opacity-60">
                    {new Date(record.timestamp).toLocaleDateString('zh-CN')}
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
