'use client';

import { useState, useEffect, useCallback } from 'react';
import { ArrowLeft, FileText, CheckCircle, X } from 'lucide-react';
import { getCurrentUser } from '@/lib/userUtils';
import { getLeaveRequests } from '@/lib/sharedData';
import { cn } from '@/lib/utils';

type LeaveType = 'leave' | 'go_out';

import { Student } from '@/types/attendance';
import { StoredUser } from '@/lib/userUtils';
import { LeaveRequest } from '@/lib/sharedData';

export default function StudentLeavePage() {
  const [user, setUser] = useState<StoredUser | null>(null);
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [leaveType, setLeaveType] = useState<LeaveType>('leave');
  const [reason, setReason] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const currentUser = getCurrentUser();
    if (!currentUser) {
      window.location.href = '/login';
      return;
    }
    setUser(currentUser);
    // 直接在这里加载
    const requests = getLeaveRequests().filter((r) => r.studentId === currentUser.id);
    setLeaveRequests(requests);
    setIsLoading(false);
  }, []);

  const handleSubmit = () => {
    if (!reason || !startDate || !endDate || !user) return;

    const newRequest = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      studentId: user.id,
      studentName: user.name || '学生',
      classId: user.classId || '',
      type: leaveType,
      reason,
      startDate,
      endDate,
      status: 'pending',
      createdAt: new Date().toISOString(),
    };

    // 保存到 localStorage
    const stored = localStorage.getItem('shared_leave_requests');
    const requests = stored ? JSON.parse(stored) : [];
    requests.push(newRequest);
    localStorage.setItem('shared_leave_requests', JSON.stringify(requests));

    setReason('');
    setStartDate('');
    setEndDate('');
    setShowForm(false);
    // 重新加载请求
    const storedAfter = localStorage.getItem('shared_leave_requests');
    const allRequests = storedAfter ? JSON.parse(storedAfter) : [];
    const userRequests = allRequests.filter((r: LeaveRequest) => r.studentId === user?.id);
    setLeaveRequests(userRequests);
    alert('申请已提交，等待教师审批');
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'pending': return '待审批';
      case 'approved': return '已通过';
      case 'rejected': return '已拒绝';
      default: return status;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return '#f59e0b';
      case 'approved': return '#10b981';
      case 'rejected': return '#ef4444';
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
      <div className="p-4 flex items-center justify-between">
        <button
          onClick={() => window.location.href = '/student'}
          className="flex items-center gap-2 px-4 py-2 rounded-xl"
          style={{ backgroundColor: '#2d2d44' }}
        >
          <ArrowLeft className="w-5 h-5" />
          返回
        </button>
        <h1 className="text-xl font-bold">请假申请</h1>
        <button
          onClick={() => setShowForm(true)}
          className="px-4 py-2 rounded-xl"
          style={{ backgroundColor: '#3b82f6' }}
        >
          新申请
        </button>
      </div>

      {/* 申请列表 */}
      <div className="px-4 space-y-3">
        {leaveRequests.length === 0 ? (
          <div className="text-center py-12">
            <FileText className="w-16 h-16 mx-auto mb-4 opacity-40" />
            <p className="opacity-60">暂无请假记录</p>
          </div>
        ) : (
          leaveRequests.map((req) => (
            <div key={req.id} className="p-4 rounded-xl" style={{ backgroundColor: '#2d2d44' }}>
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium">{req.type === 'leave' ? '请假' : '外出'}</span>
                <span
                  className="px-2 py-1 text-xs rounded"
                  style={{ backgroundColor: getStatusColor(req.status) + '20', color: getStatusColor(req.status) }}
                >
                  {getStatusLabel(req.status)}
                </span>
              </div>
              <div className="text-sm opacity-80 mb-2">{req.reason}</div>
              <div className="text-xs opacity-40">
                {req.startDate} 至 {req.endDate}
              </div>
            </div>
          ))
        )}
      </div>

      {/* 申请表单弹窗 */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.8)' }}>
          <div className="w-full max-w-sm rounded-2xl p-6" style={{ backgroundColor: '#2d2d44' }}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold">提交申请</h3>
              <button onClick={() => setShowForm(false)}>
                <X className="w-6 h-6 opacity-60" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm opacity-60 mb-2">申请类型</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setLeaveType('leave')}
                    className={cn(
                      'py-3 rounded-xl font-medium',
                      leaveType === 'leave' ? '' : 'opacity-50'
                    )}
                    style={{ backgroundColor: leaveType === 'leave' ? '#3b82f6' : '#1a1a2e' }}
                  >
                    请假
                  </button>
                  <button
                    onClick={() => setLeaveType('go_out')}
                    className={cn(
                      'py-3 rounded-xl font-medium',
                      leaveType === 'go_out' ? '' : 'opacity-50'
                    )}
                    style={{ backgroundColor: leaveType === 'go_out' ? '#3b82f6' : '#1a1a2e' }}
                  >
                    外出
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm opacity-60 mb-1">原因</label>
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl outline-none resize-none"
                  style={{ backgroundColor: '#1a1a2e' }}
                  rows={3}
                  placeholder="请输入请假/外出原因"
                />
              </div>

              <div>
                <label className="block text-sm opacity-60 mb-1">开始日期</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl outline-none"
                  style={{ backgroundColor: '#1a1a2e' }}
                />
              </div>

              <div>
                <label className="block text-sm opacity-60 mb-1">结束日期</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl outline-none"
                  style={{ backgroundColor: '#1a1a2e' }}
                />
              </div>

              <button
                onClick={handleSubmit}
                disabled={!reason || !startDate || !endDate}
                className="w-full py-3 rounded-xl font-medium disabled:opacity-50"
                style={{ backgroundColor: '#10b981' }}
              >
                提交申请
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
