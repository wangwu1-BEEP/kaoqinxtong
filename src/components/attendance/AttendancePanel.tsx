'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AttendanceType, ATTENDANCE_TYPE_LABELS, RecognitionResult, Student } from '@/types/attendance';
import { StoredUser } from '@/lib/userUtils';
import {
  LogIn,
  LogOut,
  CalendarX,
  ExternalLink,
  CheckCircle2,
  XCircle,
  Fingerprint,
  Volume2,
  User as UserIcon,
  Loader2,
} from 'lucide-react';

interface AttendancePanelProps {
  faceResult: RecognitionResult | null;
  voiceResult: RecognitionResult | null;
  onAttendanceComplete: (type: AttendanceType, student: Student | StoredUser, method: 'face' | 'voice' | 'both') => void;
}

const ATTENDANCE_ICONS: Record<AttendanceType, React.ReactNode> = {
  check_in: <LogIn className="w-5 h-5" />,
  check_out: <LogOut className="w-5 h-5" />,
  leave: <CalendarX className="w-5 h-5" />,
  go_out: <ExternalLink className="w-5 h-5" />,
};

const ATTENDANCE_COLORS: Record<AttendanceType, string> = {
  check_in: 'bg-green-500 hover:bg-green-600',
  check_out: 'bg-blue-500 hover:bg-blue-600',
  leave: 'bg-yellow-500 hover:bg-yellow-600',
  go_out: 'bg-purple-500 hover:bg-purple-600',
};

export function AttendancePanel({
  faceResult,
  voiceResult,
  onAttendanceComplete,
}: AttendancePanelProps) {
  const [selectedType, setSelectedType] = useState<AttendanceType>('check_in');
  const [isProcessing, setIsProcessing] = useState(false);
  const [attendanceStatus, setAttendanceStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [attendanceMessage, setAttendanceMessage] = useState('');

  // 考勤状态
  const currentStudent = faceResult?.student || voiceResult?.student;
  const hasFaceResult = faceResult?.success;
  const hasVoiceResult = voiceResult?.success;
  const hasAnyResult = hasFaceResult || hasVoiceResult;
  const verificationMode = hasFaceResult && hasVoiceResult ? 'both' : hasFaceResult ? 'face' : 'voice';

  // 处理考勤打卡
  const handleAttendance = async () => {
    if (!currentStudent) return;

    setIsProcessing(true);
    setAttendanceStatus('idle');

    try {
      // 模拟打卡延迟
      await new Promise((resolve) => setTimeout(resolve, 1500));

      onAttendanceComplete(selectedType, currentStudent, verificationMode);

      setAttendanceStatus('success');
      setAttendanceMessage(
        `${currentStudent.name} ${ATTENDANCE_TYPE_LABELS[selectedType]}成功！`
      );
    } catch (error) {
      setAttendanceStatus('error');
      setAttendanceMessage('打卡失败，请重试');
    } finally {
      setIsProcessing(false);
    }
  };

  // 重置状态
  const handleReset = () => {
    setAttendanceStatus('idle');
    setAttendanceMessage('');
  };

  return (
    <Card className="h-full">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">考勤打卡</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* 考勤类型选择 */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700">考勤类型</label>
          <div className="grid grid-cols-2 gap-2">
            {(Object.keys(ATTENDANCE_TYPE_LABELS) as AttendanceType[]).map((type) => (
              <Button
                key={type}
                variant={selectedType === type ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedType(type)}
                disabled={!hasAnyResult || isProcessing}
                className={selectedType === type ? ATTENDANCE_COLORS[type] : ''}
              >
                {ATTENDANCE_ICONS[type]}
                <span className="ml-1">{ATTENDANCE_TYPE_LABELS[type]}</span>
              </Button>
            ))}
          </div>
        </div>

        {/* 验证状态 */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700">身份验证</label>
          <div className="space-y-2">
            {/* 人脸验证 */}
            <div
              className={`flex items-center justify-between p-3 rounded-lg border ${
                faceResult?.success
                  ? 'border-green-500 bg-green-50'
                  : faceResult
                  ? 'border-red-500 bg-red-50'
                  : 'border-gray-200 bg-gray-50'
              }`}
            >
              <div className="flex items-center gap-2">
                <Fingerprint
                  className={`w-5 h-5 ${
                    faceResult?.success ? 'text-green-500' : faceResult ? 'text-red-500' : 'text-gray-400'
                  }`}
                />
                <span className="text-sm font-medium">人脸识别</span>
              </div>
              {faceResult?.success ? (
                <Badge variant="outline" className="bg-green-100 text-green-700 border-green-500">
                  <CheckCircle2 className="w-3 h-3 mr-1" />
                  已通过
                </Badge>
              ) : faceResult?.success === false ? (
                <Badge variant="outline" className="bg-red-100 text-red-700 border-red-500">
                  <XCircle className="w-3 h-3 mr-1" />
                  未通过
                </Badge>
              ) : (
                <Badge variant="outline" className="bg-gray-100 text-gray-500">
                  待验证
                </Badge>
              )}
            </div>

            {/* 声纹验证 */}
            <div
              className={`flex items-center justify-between p-3 rounded-lg border ${
                voiceResult?.success
                  ? 'border-green-500 bg-green-50'
                  : voiceResult?.success === false
                  ? 'border-red-500 bg-red-50'
                  : 'border-gray-200 bg-gray-50'
              }`}
            >
              <div className="flex items-center gap-2">
                <Volume2
                  className={`w-5 h-5 ${
                    voiceResult?.success ? 'text-green-500' : voiceResult?.success === false ? 'text-red-500' : 'text-gray-400'
                  }`}
                />
                <span className="text-sm font-medium">声纹识别</span>
              </div>
              {voiceResult?.success ? (
                <Badge variant="outline" className="bg-green-100 text-green-700 border-green-500">
                  <CheckCircle2 className="w-3 h-3 mr-1" />
                  已通过
                </Badge>
              ) : voiceResult?.success === false ? (
                <Badge variant="outline" className="bg-red-100 text-red-700 border-red-500">
                  <XCircle className="w-3 h-3 mr-1" />
                  未通过
                </Badge>
              ) : (
                <Badge variant="outline" className="bg-gray-100 text-gray-500">
                  待验证
                </Badge>
              )}
            </div>
          </div>
        </div>

        {/* 识别结果 */}
        {hasAnyResult && (
          <div className="p-4 rounded-lg bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-blue-500 flex items-center justify-center text-white">
                <UserIcon className="w-6 h-6" />
              </div>
              <div>
                <p className="font-medium text-gray-900">{currentStudent?.name}</p>
                <p className="text-sm text-gray-500">{currentStudent?.className}</p>
                <p className="text-xs text-gray-400 mt-1">
                  验证方式：
                  {verificationMode === 'both' ? '人脸 + 声纹' : verificationMode === 'face' ? '人脸' : '声纹'}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* 打卡按钮 */}
        <div className="space-y-2">
          {!hasAnyResult ? (
            <div className="text-center text-sm text-gray-500 py-4">
              请先完成人脸识别或声纹识别
            </div>
          ) : (
            <Button
              onClick={handleAttendance}
              disabled={isProcessing || attendanceStatus === 'success'}
              className={`w-full h-12 text-lg ${ATTENDANCE_COLORS[selectedType]}`}
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  处理中...
                </>
              ) : attendanceStatus === 'success' ? (
                <>
                  <CheckCircle2 className="w-5 h-5 mr-2" />
                  打卡成功
                </>
              ) : (
                <>
                  {ATTENDANCE_ICONS[selectedType]}
                  <span className="ml-2">{ATTENDANCE_TYPE_LABELS[selectedType]}</span>
                </>
              )}
            </Button>
          )}

          {attendanceStatus === 'success' && (
            <Button onClick={handleReset} variant="outline" className="w-full">
              继续考勤
            </Button>
          )}
        </div>

        {/* 结果提示 */}
        {attendanceMessage && (
          <div
            className={`p-3 rounded-lg text-center text-sm ${
              attendanceStatus === 'success'
                ? 'bg-green-100 text-green-700'
                : 'bg-red-100 text-red-700'
            }`}
          >
            {attendanceMessage}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
