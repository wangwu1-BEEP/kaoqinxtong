'use client';

import { useState, useEffect } from 'react';
import { Calendar, Clock, FileText, CheckCircle, XCircle, AlertCircle, Plus, ChevronLeft } from 'lucide-react';
import { cn } from '@/lib/utils';
import { 
  getStudentLeaveRequests, 
  submitLeaveRequest, 
  cancelLeaveRequest,
  LeaveRequest 
} from '@/lib/sharedData';

interface LeaveRequestPanelProps {
  studentId: string;
  studentName: string;
  classId: string;
  className: string;
  onBack: () => void;
}

export function LeaveRequestPanel({ 
  studentId, 
  studentName, 
  classId, 
  className,
  onBack 
}: LeaveRequestPanelProps) {
  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  
  // 表单状态
  const [type, setType] = useState<'leave' | 'go_out'>('leave');
  const [reason, setReason] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // 加载请假记录
  useEffect(() => {
    const loadRequests = () => {
      const data = getStudentLeaveRequests(studentId);
      setRequests(data);
    };
    loadRequests();
    const interval = setInterval(loadRequests, 3000);
    return () => clearInterval(interval);
  }, [studentId]);

  // 提交申请
  const handleSubmit = async () => {
    if (!reason || !startDate || !endDate) {
      alert('请填写完整的申请信息');
      return;
    }
    
    setLoading(true);
    try {
      submitLeaveRequest({
        studentId,
        studentName,
        classId,
        className,
        type,
        reason,
        startDate,
        endDate,
      });
      
      // 刷新列表
      setRequests(getStudentLeaveRequests(studentId));
      setShowForm(false);
      setReason('');
      setStartDate('');
      setEndDate('');
      alert('申请提交成功，请等待教师审批');
    } catch (error) {
      alert('提交失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  // 取消申请
  const handleCancel = (requestId: string) => {
    if (confirm('确定要取消这个申请吗？')) {
      cancelLeaveRequest(requestId);
      setRequests(getStudentLeaveRequests(studentId));
    }
  };

  // 获取状态标签
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return (
          <span className="px-2 py-1 text-xs rounded-full bg-yellow-500/20 text-yellow-400 flex items-center gap-1">
            <Clock className="w-3 h-3" /> 待审批
          </span>
        );
      case 'approved':
        return (
          <span className="px-2 py-1 text-xs rounded-full bg-green-500/20 text-green-400 flex items-center gap-1">
            <CheckCircle className="w-3 h-3" /> 已通过
          </span>
        );
      case 'rejected':
        return (
          <span className="px-2 py-1 text-xs rounded-full bg-red-500/20 text-red-400 flex items-center gap-1">
            <XCircle className="w-3 h-3" /> 已拒绝
          </span>
        );
      default:
        return null;
    }
  };

  // 申请类型标签
  const getTypeLabel = (t: string) => t === 'leave' ? '请假' : '外出';

  if (showForm) {
    // 申请表单
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3 mb-4">
          <button 
            onClick={() => setShowForm(false)}
            className="w-10 h-10 rounded-full flex items-center justify-center"
            style={{ backgroundColor: '#3d3d5c' }}
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <h2 className="text-xl font-bold">提交申请</h2>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm opacity-60 mb-2">申请类型</label>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setType('leave')}
                className={cn(
                  "p-4 rounded-xl text-center transition-all",
                  type === 'leave' ? "ring-2 ring-blue-500" : ""
                )}
                style={{ backgroundColor: type === 'leave' ? '#3b82f6' : '#2d2d44' }}
              >
                <FileText className="w-6 h-6 mx-auto mb-2" />
                <div className="font-medium">请假</div>
                <div className="text-xs opacity-60">事假/病假</div>
              </button>
              <button
                onClick={() => setType('go_out')}
                className={cn(
                  "p-4 rounded-xl text-center transition-all",
                  type === 'go_out' ? "ring-2 ring-purple-500" : ""
                )}
                style={{ backgroundColor: type === 'go_out' ? '#8b5cf6' : '#2d2d44' }}
              >
                <AlertCircle className="w-6 h-6 mx-auto mb-2" />
                <div className="font-medium">外出</div>
                <div className="text-xs opacity-60">临时外出</div>
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm opacity-60 mb-2">开始日期</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-4 py-3 rounded-xl outline-none"
              style={{ backgroundColor: '#1a1a2e' }}
            />
          </div>

          <div>
            <label className="block text-sm opacity-60 mb-2">结束日期</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-4 py-3 rounded-xl outline-none"
              style={{ backgroundColor: '#1a1a2e' }}
            />
          </div>

          <div>
            <label className="block text-sm opacity-60 mb-2">申请理由</label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="请详细说明请假/外出原因..."
              rows={4}
              className="w-full px-4 py-3 rounded-xl outline-none resize-none"
              style={{ backgroundColor: '#1a1a2e' }}
            />
          </div>

          <button
            onClick={handleSubmit}
            disabled={loading}
            className="w-full py-3 rounded-xl font-medium disabled:opacity-50"
            style={{ backgroundColor: '#3b82f6' }}
          >
            {loading ? '提交中...' : '提交申请'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <button 
            onClick={onBack}
            className="w-10 h-10 rounded-full flex items-center justify-center"
            style={{ backgroundColor: '#3d3d5c' }}
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <h2 className="text-xl font-bold">请假申请</h2>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="px-4 py-2 rounded-xl flex items-center gap-2"
          style={{ backgroundColor: '#3b82f6' }}
        >
          <Plus className="w-4 h-4" />
          新申请
        </button>
      </div>

      {/* 申请列表 */}
      {requests.length === 0 ? (
        <div className="text-center py-12">
          <FileText className="w-16 h-16 mx-auto mb-4 opacity-40" />
          <p className="opacity-60">暂无请假申请</p>
          <p className="text-sm opacity-40 mt-2">点击右上角按钮提交新申请</p>
        </div>
      ) : (
        <div className="space-y-3">
          {requests.map((request) => (
            <div
              key={request.id}
              className="p-4 rounded-xl"
              style={{ backgroundColor: '#2d2d44' }}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span 
                    className={cn(
                      "px-2 py-1 text-xs rounded",
                      request.type === 'leave' ? "bg-blue-500/20 text-blue-400" : "bg-purple-500/20 text-purple-400"
                    )}
                  >
                    {getTypeLabel(request.type)}
                  </span>
                  {getStatusBadge(request.status)}
                </div>
                {request.status === 'pending' && (
                  <button
                    onClick={() => handleCancel(request.id)}
                    className="text-xs text-red-400 hover:text-red-300"
                  >
                    取消
                  </button>
                )}
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="w-4 h-4 opacity-60" />
                  <span>{request.startDate} 至 {request.endDate}</span>
                </div>
                <div className="text-sm opacity-80">{request.reason}</div>
                {request.teacherReply && (
                  <div className="mt-2 p-2 rounded-lg text-sm" style={{ backgroundColor: '#1a1a2e' }}>
                    <div className="text-xs opacity-60 mb-1">教师回复：</div>
                    <div>{request.teacherReply}</div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
