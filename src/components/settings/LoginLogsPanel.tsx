'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  History, 
  LogIn, 
  LogOut, 
  Lock,
  CheckCircle, 
  XCircle, 
  Smartphone,
  Monitor,
  Clock,
  Filter
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { getCurrentUser } from '@/lib/userUtils';

interface LoginLog {
  id: string;
  username: string;
  action: 'login' | 'logout' | 'password_change' | 'register';
  device?: string;
  detail?: string;
  timestamp: string;
  success: boolean;
  ip?: string;
}

export function LoginLogsPanel() {
  const [logs, setLogs] = useState<LoginLog[]>([]);
  const [filter, setFilter] = useState<'all' | 'login' | 'logout'>('all');
  const user = getCurrentUser();

  useEffect(() => {
    const loadLogs = () => {
      const stored = localStorage.getItem('login_logs');
      if (stored) {
        const allLogs: LoginLog[] = JSON.parse(stored);
        // 筛选当前用户的日志
        const userLogs = allLogs.filter(log => 
          log.username === user?.username || 
          log.action === 'register'
        );
        setLogs(userLogs);
      }
    };
    
    loadLogs();
    const interval = setInterval(loadLogs, 5000);
    return () => clearInterval(interval);
  }, [user?.username]);

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'login': return <LogIn className="w-4 h-4" />;
      case 'logout': return <LogOut className="w-4 h-4" />;
      case 'password_change': return <Lock className="w-4 h-4" />;
      default: return <History className="w-4 h-4" />;
    }
  };

  const getActionLabel = (action: string) => {
    switch (action) {
      case 'login': return '登录';
      case 'logout': return '退出';
      case 'password_change': return '修改密码';
      case 'register': return '注册';
      default: return action;
    }
  };

  const getActionColor = (action: string, success: boolean) => {
    if (!success) return 'text-red-400';
    switch (action) {
      case 'login': return 'text-green-400';
      case 'logout': return 'text-slate-400';
      case 'password_change': return 'text-blue-400';
      default: return 'text-amber-400';
    }
  };

  const getDeviceIcon = (device?: string) => {
    if (device?.includes('Mobile')) return <Smartphone className="w-4 h-4" />;
    return <Monitor className="w-4 h-4" />;
  };

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
      minute: '2-digit',
    });
  };

  const filteredLogs = logs.filter(log => {
    if (filter === 'all') return true;
    return log.action === filter;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <History className="w-6 h-6" />
            登录日志
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            查看您的账户安全记录
          </p>
        </div>
        
        {/* 筛选 */}
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-muted-foreground" />
          {(['all', 'login', 'logout'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cn(
                "px-3 py-1.5 rounded-lg text-sm transition-colors",
                filter === f ? "bg-blue-500/20 text-blue-400" : "text-muted-foreground hover:bg-slate-700"
              )}
            >
              {f === 'all' ? '全部' : f === 'login' ? '登录' : '退出'}
            </button>
          ))}
        </div>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="bg-slate-800/50 border-slate-700">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center">
                <LogIn className="w-5 h-5 text-green-400" />
              </div>
              <div>
                <div className="text-2xl font-bold">
                  {logs.filter(l => l.action === 'login' && l.success).length}
                </div>
                <div className="text-xs text-muted-foreground">成功登录</div>
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
                <div className="text-2xl font-bold">
                  {logs.filter(l => !l.success).length}
                </div>
                <div className="text-xs text-muted-foreground">登录失败</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-800/50 border-slate-700">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
                <Clock className="w-5 h-5 text-blue-400" />
              </div>
              <div>
                <div className="text-2xl font-bold">{logs.length}</div>
                <div className="text-xs text-muted-foreground">总记录数</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 日志列表 */}
      <Card className="bg-slate-800/50 border-slate-700">
        <CardHeader>
          <CardTitle className="text-lg">最近活动</CardTitle>
          <CardDescription>显示最近100条登录记录</CardDescription>
        </CardHeader>
        <CardContent>
          {filteredLogs.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <History className="w-12 h-12 mx-auto mb-3 opacity-40" />
              <p>暂无日志记录</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {filteredLogs.map((log) => (
                <div
                  key={log.id}
                  className="flex items-center gap-4 p-3 rounded-lg bg-slate-900/50 hover:bg-slate-900 transition-colors"
                >
                  {/* 图标 */}
                  <div className={cn(
                    "w-10 h-10 rounded-lg flex items-center justify-center",
                    log.success ? "bg-slate-700" : "bg-red-500/20"
                  )}>
                    <span className={getActionColor(log.action, log.success)}>
                      {getActionIcon(log.action)}
                    </span>
                  </div>

                  {/* 内容 */}
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{getActionLabel(log.action)}</span>
                      {log.success ? (
                        <Badge variant="outline" className="border-green-500/30 text-green-400 text-xs">
                          成功
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="border-red-500/30 text-red-400 text-xs">
                          失败
                        </Badge>
                      )}
                    </div>
                    {log.detail && (
                      <p className="text-xs text-muted-foreground mt-0.5">{log.detail}</p>
                    )}
                  </div>

                  {/* 设备 */}
                  <div className="text-muted-foreground">
                    {getDeviceIcon(log.device)}
                  </div>

                  {/* 时间 */}
                  <div className="text-right">
                    <div className="text-sm text-muted-foreground">
                      {formatTime(log.timestamp)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
