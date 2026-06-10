'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Bell, 
  BellOff, 
  MessageSquare, 
  ClipboardList, 
  Megaphone,
  CheckCircle,
  XCircle,
  Clock,
  Trash2,
  CheckCheck
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface Notification {
  id: string;
  type: 'announcement' | 'leave_approved' | 'leave_rejected' | 'attendance' | 'system';
  title: string;
  content: string;
  timestamp: string;
  read: boolean;
  priority: 'normal' | 'important';
}

// 本地消息存储键
const MESSAGES_KEY = 'user_notifications';

// 播放提示音（组件外部函数）
const playNotificationSound = () => {
  try {
    const AudioContextClass = window.AudioContext || (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;
    const audioContext = new AudioContextClass();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscillator.frequency.value = 800;
    oscillator.type = 'sine';
    gainNode.gain.value = 0.3;
    
    oscillator.start();
    oscillator.stop(audioContext.currentTime + 0.2);
  } catch {
    // Audio not supported
  }
};

export function NotificationCenter() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const [soundEnabled, setSoundEnabled] = useState(true);

  // 保存消息
  const saveNotifications = useCallback((newNotifications: Notification[]) => {
    setNotifications(newNotifications);
    localStorage.setItem(MESSAGES_KEY, JSON.stringify(newNotifications));
  }, []);

  // 加载消息
  useEffect(() => {
    const loadNotifications = () => {
      const stored = localStorage.getItem(MESSAGES_KEY);
      if (stored) {
        setNotifications(JSON.parse(stored));
      } else {
        // 生成示例消息（使用固定时间戳避免 Date.now 问题）
        const now = new Date();
        const sampleNotifications: Notification[] = [
          {
            id: '1',
            type: 'announcement',
            title: '班级公告',
            content: '明天将进行期中考试，请同学们做好准备。',
            timestamp: new Date(now.getTime() - 3600000).toISOString(),
            read: false,
            priority: 'important'
          },
          {
            id: '2',
            type: 'leave_approved',
            title: '请假审批结果',
            content: '您的请假申请已通过审批。',
            timestamp: new Date(now.getTime() - 7200000).toISOString(),
            read: false,
            priority: 'normal'
          },
          {
            id: '3',
            type: 'attendance',
            title: '考勤提醒',
            content: '您今日还未进行上课签到，请尽快完成打卡。',
            timestamp: new Date(now.getTime() - 86400000).toISOString(),
            read: true,
            priority: 'normal'
          }
        ];
        setNotifications(sampleNotifications);
        localStorage.setItem(MESSAGES_KEY, JSON.stringify(sampleNotifications));
      }
    };
    
    loadNotifications();
  }, []);

  // 添加消息
  const addNotification = useCallback((notification: Omit<Notification, 'id' | 'timestamp' | 'read'>) => {
    setNotifications(prev => {
      const newNotification: Notification = {
        ...notification,
        id: `notif-${Date.now()}`,
        timestamp: new Date().toISOString(),
        read: false
      };
      const updated = [newNotification, ...prev];
      localStorage.setItem(MESSAGES_KEY, JSON.stringify(updated));
      return updated;
    });
    
    // 播放提示音
    if (soundEnabled) {
      playNotificationSound();
    }
  }, [soundEnabled]);

  // 监听新消息
  useEffect(() => {
    const handleNewMessage = (e: CustomEvent) => {
      addNotification(e.detail);
    };
    window.addEventListener('new-notification', handleNewMessage as EventListener);
    
    return () => {
      window.removeEventListener('new-notification', handleNewMessage as EventListener);
    };
  }, [addNotification]);

  // 标记已读
  const markAsRead = useCallback((id: string) => {
    setNotifications(prev => {
      const updated = prev.map(n => 
        n.id === id ? { ...n, read: true } : n
      );
      localStorage.setItem(MESSAGES_KEY, JSON.stringify(updated));
      return updated;
    });
  }, []);

  // 全部标记已读
  const markAllAsRead = useCallback(() => {
    setNotifications(prev => {
      const updated = prev.map(n => ({ ...n, read: true }));
      localStorage.setItem(MESSAGES_KEY, JSON.stringify(updated));
      return updated;
    });
  }, []);

  // 删除消息
  const deleteNotification = useCallback((id: string) => {
    setNotifications(prev => {
      const updated = prev.filter(n => n.id !== id);
      localStorage.setItem(MESSAGES_KEY, JSON.stringify(updated));
      return updated;
    });
  }, []);

  // 清空已读
  const clearRead = useCallback(() => {
    setNotifications(prev => {
      const updated = prev.filter(n => !n.read);
      localStorage.setItem(MESSAGES_KEY, JSON.stringify(updated));
      return updated;
    });
  }, []);

  // 格式化时间
  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    
    if (diff < 60000) return '刚刚';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}分钟前`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}小时前`;
    
    return date.toLocaleDateString('zh-CN', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // 获取类型图标和颜色
  const getTypeIcon = (type: Notification['type']) => {
    switch (type) {
      case 'announcement': return { icon: <Megaphone className="w-4 h-4" />, color: 'text-orange-400 bg-orange-400/20' };
      case 'leave_approved': return { icon: <CheckCircle className="w-4 h-4" />, color: 'text-green-400 bg-green-400/20' };
      case 'leave_rejected': return { icon: <XCircle className="w-4 h-4" />, color: 'text-red-400 bg-red-400/20' };
      case 'attendance': return { icon: <ClipboardList className="w-4 h-4" />, color: 'text-blue-400 bg-blue-400/20' };
      default: return { icon: <Bell className="w-4 h-4" />, color: 'text-slate-400 bg-slate-400/20' };
    }
  };

  const filteredNotifications = filter === 'unread' 
    ? notifications.filter(n => !n.read) 
    : notifications;

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Bell className="w-6 h-6" />
            消息中心
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            {unreadCount > 0 ? `您有 ${unreadCount} 条未读消息` : '暂无未读消息'}
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className={cn(
              "p-2 rounded-lg transition-colors",
              soundEnabled ? "bg-blue-500/20 text-blue-400" : "bg-slate-700 text-slate-400"
            )}
            title={soundEnabled ? '关闭提示音' : '开启提示音'}
          >
            {soundEnabled ? <Bell className="w-5 h-5" /> : <BellOff className="w-5 h-5" />}
          </button>
          
          <div className="flex items-center gap-1 bg-slate-800 rounded-lg p-1">
            <button
              onClick={() => setFilter('all')}
              className={cn(
                "px-3 py-1.5 rounded-md text-sm transition-colors",
                filter === 'all' ? "bg-blue-500 text-white" : "text-slate-400 hover:text-white"
              )}
            >
              全部
            </button>
            <button
              onClick={() => setFilter('unread')}
              className={cn(
                "px-3 py-1.5 rounded-md text-sm transition-colors flex items-center gap-1",
                filter === 'unread' ? "bg-blue-500 text-white" : "text-slate-400 hover:text-white"
              )}
            >
              未读
              {unreadCount > 0 && (
                <Badge variant="destructive" className="ml-1 h-5 w-5 p-0 flex items-center justify-center text-xs">
                  {unreadCount}
                </Badge>
              )}
            </button>
          </div>
        </div>
      </div>

      <div className="flex gap-2">
        <Button 
          variant="outline" 
          size="sm"
          onClick={markAllAsRead}
          disabled={unreadCount === 0}
          className="flex items-center gap-2"
        >
          <CheckCheck className="w-4 h-4" />
          全部已读
        </Button>
        <Button 
          variant="outline" 
          size="sm"
          onClick={clearRead}
          disabled={unreadCount === notifications.length}
          className="flex items-center gap-2"
        >
          <Trash2 className="w-4 h-4" />
          清空已读
        </Button>
      </div>

      <div className="space-y-2">
        {filteredNotifications.length === 0 ? (
          <Card className="bg-slate-800/50 border-slate-700">
            <CardContent className="py-12 text-center">
              <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-40" />
              <p className="text-muted-foreground">
                {filter === 'unread' ? '暂无未读消息' : '暂无消息'}
              </p>
            </CardContent>
          </Card>
        ) : (
          filteredNotifications.map((notification) => {
            const typeInfo = getTypeIcon(notification.type);
            return (
              <Card 
                key={notification.id}
                className={cn(
                  "transition-all hover:scale-[1.01]",
                  notification.read 
                    ? "bg-slate-800/50 border-slate-700 opacity-70" 
                    : "bg-slate-800 border-slate-600"
                )}
              >
                <CardContent className="p-4">
                  <div className="flex items-start gap-4">
                    <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0", typeInfo.color)}>
                      {typeInfo.icon}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium">{notification.title}</span>
                        {notification.priority === 'important' && (
                          <Badge variant="destructive" className="text-xs">重要</Badge>
                        )}
                        {!notification.read && (
                          <div className="w-2 h-2 rounded-full bg-blue-500" />
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {notification.content}
                      </p>
                      <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                        <Clock className="w-3 h-3" />
                        {formatTime(notification.timestamp)}
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-1">
                      {!notification.read && (
                        <button
                          onClick={() => markAsRead(notification.id)}
                          className="p-2 rounded-lg hover:bg-slate-700 text-muted-foreground hover:text-white transition-colors"
                          title="标记已读"
                        >
                          <CheckCheck className="w-4 h-4" />
                        </button>
                      )}
                      <button
                        onClick={() => deleteNotification(notification.id)}
                        className="p-2 rounded-lg hover:bg-red-500/20 text-muted-foreground hover:text-red-400 transition-colors"
                        title="删除"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}
