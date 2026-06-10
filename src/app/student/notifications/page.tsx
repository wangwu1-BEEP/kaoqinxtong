'use client';

import { useState, useEffect } from 'react';
import { ArrowLeft, Bell, CheckCircle } from 'lucide-react';
import { getCurrentUser } from '@/lib/userUtils';
import { Student } from '@/types/attendance';
import { StoredUser } from '@/lib/userUtils';

interface Notification {
  id: string;
  type: 'announcement' | 'approval' | 'attendance';
  title: string;
  content: string;
  timestamp: string;
  read: boolean;
}

export default function StudentNotificationsPage() {
  const [user, setUser] = useState<StoredUser | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const currentUser = getCurrentUser();
    if (!currentUser) {
      window.location.href = '/login';
      return;
    }
    setUser(currentUser);
    
    // 直接加载
    const stored = localStorage.getItem(`notifications_${currentUser.id}`);
    if (stored) {
      setNotifications(JSON.parse(stored));
    } else {
      setNotifications([
        { id: '1', type: 'announcement', title: '欢迎使用智能考勤系统', content: '您已成功注册，可以开始使用了', timestamp: new Date().toISOString(), read: false },
        { id: '2', type: 'attendance', title: '考勤提醒', content: '请记得完成今日的考勤打卡', timestamp: new Date().toISOString(), read: false },
      ]);
    }
    setIsLoading(false);
  }, []);

  const markAsRead = (id: string) => {
    const updated = notifications.map((n) => (n.id === id ? { ...n, read: true } : n));
    setNotifications(updated);
    if (user) {
      localStorage.setItem(`notifications_${user.id}`, JSON.stringify(updated));
    }
  };

  const markAllAsRead = () => {
    const updated = notifications.map((n) => ({ ...n, read: true }));
    setNotifications(updated);
    if (user) {
      localStorage.setItem(`notifications_${user.id}`, JSON.stringify(updated));
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'announcement': return '#3b82f6';
      case 'approval': return '#10b981';
      case 'attendance': return '#f59e0b';
      default: return '#6b7280';
    }
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
        <div className="flex items-center justify-between">
          <button
            onClick={() => window.location.href = '/student'}
            className="flex items-center gap-2 px-4 py-2 rounded-xl"
            style={{ backgroundColor: '#2d2d44' }}
          >
            <ArrowLeft className="w-5 h-5" />
            返回
          </button>
          <div className="flex items-center gap-2">
            <button
              onClick={markAllAsRead}
              className="px-3 py-2 rounded-xl text-sm"
              style={{ backgroundColor: '#2d2d44' }}
            >
              全部已读
            </button>
          </div>
        </div>
      </div>

      {/* 标题 */}
      <div className="px-4 mb-4">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Bell className="w-6 h-6" />
          消息中心
        </h1>
        <p className="opacity-60 mt-1">
          {notifications.filter((n) => !n.read).length} 条未读消息
        </p>
      </div>

      {/* 消息列表 */}
      <div className="px-4 space-y-3">
        {notifications.length === 0 ? (
          <div className="text-center py-12 opacity-60">
            <Bell className="w-12 h-12 mx-auto mb-2 opacity-40" />
            <p>暂无消息</p>
          </div>
        ) : (
          notifications.map((notification) => (
            <div
              key={notification.id}
              onClick={() => markAsRead(notification.id)}
              className="p-4 rounded-xl cursor-pointer transition-all hover:scale-[1.01]"
              style={{ 
                backgroundColor: '#2d2d44',
                borderLeft: notification.read ? 'none' : '4px solid #3b82f6'
              }}
            >
              <div className="flex items-start gap-3">
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center"
                  style={{ backgroundColor: getTypeColor(notification.type) }}
                >
                  {notification.read ? <CheckCircle className="w-5 h-5" /> : <Bell className="w-5 h-5" />}
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <div className="font-medium">{notification.title}</div>
                    {!notification.read && (
                      <div className="w-2 h-2 rounded-full bg-blue-500" />
                    )}
                  </div>
                  <div className="text-sm opacity-60 mt-1">{notification.content}</div>
                  <div className="text-xs opacity-40 mt-2">
                    {new Date(notification.timestamp).toLocaleString('zh-CN')}
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
