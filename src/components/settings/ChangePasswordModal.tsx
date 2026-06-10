'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Lock, Eye, EyeOff, CheckCircle, XCircle, AlertCircle, Shield } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getCurrentUser, StoredUser } from '@/lib/userUtils';
import { updateStudentInSharedData } from '@/lib/sharedData';

interface ChangePasswordModalProps {
  onClose: () => void;
}

export function ChangePasswordModal({ onClose }: ChangePasswordModalProps) {
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showOld, setShowOld] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const user = getCurrentUser() as StoredUser | null;

  // 密码强度检查
  const checkPasswordStrength = (password: string) => {
    const checks = {
      length: password.length >= 8,
      upper: /[A-Z]/.test(password),
      lower: /[a-z]/.test(password),
      number: /[0-9]/.test(password),
      special: /[^A-Za-z0-9]/.test(password),
    };
    return checks;
  };

  const strength = checkPasswordStrength(newPassword);
  const strengthScore = Object.values(strength).filter(Boolean).length;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);

    // 验证旧密码
    if (user && oldPassword !== user.password) {
      setMessage({ type: 'error', text: '原密码错误' });
      return;
    }

    // 验证新密码
    if (newPassword.length < 6) {
      setMessage({ type: 'error', text: '新密码至少6位' });
      return;
    }

    if (newPassword !== confirmPassword) {
      setMessage({ type: 'error', text: '两次密码不一致' });
      return;
    }

    setIsLoading(true);

    // 模拟保存
    await new Promise(resolve => setTimeout(resolve, 1000));

    // 更新 localStorage 中的密码
    const stored = localStorage.getItem('user');
    if (stored) {
      const userData = JSON.parse(stored);
      userData.password = newPassword;
      localStorage.setItem('user', JSON.stringify(userData));
      
      // 同步更新 shared_students 中的密码
      if (userData.role === 'student' && userData.username) {
        updateStudentInSharedData(userData.username, { password: newPassword });
      }
    }

    // 记录密码修改日志
    const logs = JSON.parse(localStorage.getItem('login_logs') || '[]');
    logs.unshift({
      id: `log-${Date.now()}`,
      username: user?.username,
      action: 'password_change',
      detail: '修改密码',
      timestamp: new Date().toISOString(),
      success: true,
    });
    localStorage.setItem('login_logs', JSON.stringify(logs.slice(0, 100)));

    setIsLoading(false);
    setMessage({ type: 'success', text: '密码修改成功！' });
    
    setTimeout(() => {
      onClose();
    }, 1500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60">
      <Card className="w-full max-w-md bg-slate-800 border-slate-700">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-blue-400" />
              <CardTitle>修改密码</CardTitle>
            </div>
            <button onClick={onClose} className="text-slate-400 hover:text-white">
              <XCircle className="w-5 h-5" />
            </button>
          </div>
          <CardDescription>修改您的账户密码</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* 原密码 */}
            <div>
              <label className="block text-sm font-medium mb-1.5">原密码</label>
              <div className="relative">
                <Input
                  type={showOld ? 'text' : 'password'}
                  value={oldPassword}
                  onChange={(e) => setOldPassword(e.target.value)}
                  placeholder="请输入原密码"
                  className="pr-10"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowOld(!showOld)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                >
                  {showOld ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* 新密码 */}
            <div>
              <label className="block text-sm font-medium mb-1.5">新密码</label>
              <div className="relative">
                <Input
                  type={showNew ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="请输入新密码（至少6位）"
                  className="pr-10"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowNew(!showNew)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                >
                  {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              
              {/* 密码强度指示 */}
              {newPassword && (
                <div className="mt-2">
                  <div className="flex gap-1 mb-1">
                    {[1, 2, 3, 4].map((level) => (
                      <div
                        key={level}
                        className={cn(
                          "h-1 flex-1 rounded-full transition-colors",
                          strengthScore >= level
                            ? strengthScore <= 2 ? "bg-red-500" : strengthScore === 3 ? "bg-amber-500" : "bg-green-500"
                            : "bg-slate-600"
                        )}
                      />
                    ))}
                  </div>
                  <div className="flex flex-wrap gap-2 text-xs">
                    <span className={cn(strength.length ? "text-green-400" : "text-slate-500")}>8+字符</span>
                    <span className={cn(strength.upper ? "text-green-400" : "text-slate-500")}>大写字母</span>
                    <span className={cn(strength.lower ? "text-green-400" : "text-slate-500")}>小写字母</span>
                    <span className={cn(strength.number ? "text-green-400" : "text-slate-500")}>数字</span>
                    <span className={cn(strength.special ? "text-green-400" : "text-slate-500")}>特殊字符</span>
                  </div>
                </div>
              )}
            </div>

            {/* 确认密码 */}
            <div>
              <label className="block text-sm font-medium mb-1.5">确认新密码</label>
              <div className="relative">
                <Input
                  type={showConfirm ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="请再次输入新密码"
                  className="pr-10"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm(!showConfirm)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                >
                  {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {confirmPassword && newPassword !== confirmPassword && (
                <p className="text-xs text-red-400 mt-1">两次输入的密码不一致</p>
              )}
            </div>

            {/* 消息提示 */}
            {message && (
              <div className={cn(
                "p-3 rounded-lg flex items-center gap-2",
                message.type === 'success' ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"
              )}>
                {message.type === 'success' ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                {message.text}
              </div>
            )}

            {/* 按钮 */}
            <div className="flex gap-3 pt-2">
              <Button type="button" variant="outline" onClick={onClose} className="flex-1">
                取消
              </Button>
              <Button type="submit" disabled={isLoading} className="flex-1">
                {isLoading ? '保存中...' : '保存'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
