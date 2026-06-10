'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { 
  CheckCircle, 
  XCircle, 
  Clock, 
  Calendar, 
  FileText,
  User,
  Check,
  X
} from 'lucide-react';
import { 
  getPendingLeaveRequests, 
  approveLeaveRequest, 
  rejectLeaveRequest,
  LeaveRequest,
  getClasses,
  getStudents
} from '@/lib/sharedData';
import { cn } from '@/lib/utils';

export function LeaveApprovalPanel() {
  const [pendingRequests, setPendingRequests] = useState<LeaveRequest[]>([]);
  const [selectedRequest, setSelectedRequest] = useState<LeaveRequest | null>(null);
  const [reply, setReply] = useState('');
  const [selectedClassId, setSelectedClassId] = useState<string>('');

  // 加载待审批申请
  useEffect(() => {
    const loadRequests = () => {
      const requests = getPendingLeaveRequests(selectedClassId || undefined);
      setPendingRequests(requests);
    };
    loadRequests();
    const interval = setInterval(loadRequests, 3000);
    return () => clearInterval(interval);
  }, [selectedClassId]);

  // 处理审批
  const handleApprove = (request: LeaveRequest) => {
    approveLeaveRequest(request.id, reply || undefined);
    setPendingRequests(getPendingLeaveRequests(selectedClassId || undefined));
    setSelectedRequest(null);
    setReply('');
  };

  const handleReject = (request: LeaveRequest) => {
    rejectLeaveRequest(request.id, reply || undefined);
    setPendingRequests(getPendingLeaveRequests(selectedClassId || undefined));
    setSelectedRequest(null);
    setReply('');
  };

  const classes = getClasses();
  const pendingCount = pendingRequests.length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">请假审批</h2>
          <p className="text-sm text-muted-foreground mt-1">
            共 {pendingCount} 条待审批申请
          </p>
        </div>
        
        {/* 班级筛选 */}
        <div className="flex items-center gap-2">
          <select
            value={selectedClassId}
            onChange={(e) => setSelectedClassId(e.target.value)}
            className="px-3 py-2 rounded-lg border bg-background"
          >
            <option value="">全部班级</option>
            {classes.map((cls) => (
              <option key={cls.id} value={cls.id}>{cls.name}</option>
            ))}
          </select>
        </div>
      </div>

      {pendingRequests.length === 0 ? (
        <Card className="bg-slate-800/50 border-slate-700">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <CheckCircle className="w-16 h-16 text-green-500 mb-4" />
            <p className="text-lg font-medium">暂无待审批申请</p>
            <p className="text-sm text-muted-foreground mt-1">所有请假申请已处理完毕</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {pendingRequests.map((request) => (
            <Card 
              key={request.id} 
              className={cn(
                "bg-slate-800/50 border-slate-700 transition-all cursor-pointer hover:bg-slate-800/70",
                selectedRequest?.id === request.id && "ring-2 ring-blue-500"
              )}
              onClick={() => setSelectedRequest(request)}
            >
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center">
                      <User className="w-5 h-5 text-blue-400" />
                    </div>
                    <div>
                      <CardTitle className="text-base">{request.studentName}</CardTitle>
                      <CardDescription className="text-xs">{request.className}</CardDescription>
                    </div>
                  </div>
                  <Badge 
                    variant="outline" 
                    className={cn(
                      request.type === 'leave' 
                        ? "border-blue-500 text-blue-400" 
                        : "border-purple-500 text-purple-400"
                    )}
                  >
                    {request.type === 'leave' ? '请假' : '外出'}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm">
                    <Calendar className="w-4 h-4 text-muted-foreground" />
                    <span>{request.startDate} 至 {request.endDate}</span>
                  </div>
                  <div className="p-3 rounded-lg bg-slate-900/50">
                    <div className="text-xs text-muted-foreground mb-1">申请理由：</div>
                    <p className="text-sm">{request.reason}</p>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    申请时间：{new Date(request.createdAt).toLocaleString('zh-CN')}
                  </div>
                </div>

                {/* 展开的操作区域 */}
                {selectedRequest?.id === request.id && (
                  <div className="mt-4 pt-4 border-t border-slate-700 space-y-3">
                    <div>
                      <Label className="text-xs text-muted-foreground">回复说明（可选）</Label>
                      <Textarea
                        value={reply}
                        onChange={(e) => setReply(e.target.value)}
                        placeholder="输入审批意见..."
                        rows={2}
                        className="mt-1 bg-slate-900/50 border-slate-700"
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button
                        onClick={() => handleApprove(request)}
                        className="flex-1 bg-green-600 hover:bg-green-700"
                      >
                        <CheckCircle className="w-4 h-4 mr-2" />
                        批准
                      </Button>
                      <Button
                        onClick={() => handleReject(request)}
                        variant="destructive"
                        className="flex-1"
                      >
                        <XCircle className="w-4 h-4 mr-2" />
                        拒绝
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

// 历史审批记录组件
export function LeaveHistoryPanel() {
  const [history, setHistory] = useState<LeaveRequest[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<string>('');

  useEffect(() => {
    const loadHistory = () => {
      const classes = getClasses();
      let requests: LeaveRequest[] = [];
      
      if (selectedClassId) {
        requests = classes.find(c => c.id === selectedClassId)
          ? getClasses().flatMap(c => c.id === selectedClassId 
              ? getStudents().filter(s => s.classId === selectedClassId).flatMap(s => 
                  getPendingLeaveRequests(c.id).length > 0 
                    ? [] 
                    : []
                )
              : []
            )
          : [];
      }
      
      // 简化：获取所有已处理的申请
      if (typeof window !== 'undefined') {
        const stored = localStorage.getItem('shared_leave_requests');
        if (stored) {
          const all = JSON.parse(stored);
          requests = all.filter((r: LeaveRequest) => 
            r.status !== 'pending' && (!selectedClassId || r.classId === selectedClassId)
          ).slice(0, 20);
        }
      }
      setHistory(requests);
    };
    loadHistory();
    const interval = setInterval(loadHistory, 3000);
    return () => clearInterval(interval);
  }, [selectedClassId]);

  const classes = getClasses();

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">审批历史</h2>
        <select
          value={selectedClassId}
          onChange={(e) => setSelectedClassId(e.target.value)}
          className="px-3 py-2 rounded-lg border bg-background"
        >
          <option value="">全部班级</option>
          {classes.map((cls) => (
            <option key={cls.id} value={cls.id}>{cls.name}</option>
          ))}
        </select>
      </div>

      {history.length === 0 ? (
        <Card className="bg-slate-800/50 border-slate-700">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FileText className="w-16 h-16 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">暂无审批历史</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {history.map((request) => (
            <Card key={request.id} className="bg-slate-800/50 border-slate-700">
              <CardContent className="pt-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{request.studentName}</span>
                    <Badge variant="outline" className="text-xs">
                      {request.className}
                    </Badge>
                  </div>
                  <Badge 
                    className={cn(
                      request.status === 'approved' 
                        ? "bg-green-500/20 text-green-400 border-green-500" 
                        : "bg-red-500/20 text-red-400 border-red-500"
                    )}
                  >
                    {request.status === 'approved' ? '已批准' : '已拒绝'}
                  </Badge>
                </div>
                <div className="text-sm text-muted-foreground mb-2">
                  {request.startDate} 至 {request.endDate}
                </div>
                {request.teacherReply && (
                  <div className="p-2 rounded bg-slate-900/50 text-sm">
                    <span className="text-muted-foreground">审批意见：</span>
                    {request.teacherReply}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
