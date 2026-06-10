'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AttendanceRecord, ATTENDANCE_TYPE_LABELS, AttendanceType } from '@/types/attendance';
import { format } from 'date-fns';
import { List, Clock, CheckCircle2, XCircle, Calendar } from 'lucide-react';

interface AttendanceListProps {
  records: AttendanceRecord[];
}

const ATTENDANCE_TYPE_STYLES: Record<AttendanceType, { bg: string; text: string }> = {
  check_in: { bg: 'bg-green-100', text: 'text-green-700' },
  check_out: { bg: 'bg-blue-100', text: 'text-blue-700' },
  leave: { bg: 'bg-yellow-100', text: 'text-yellow-700' },
  go_out: { bg: 'bg-purple-100', text: 'text-purple-700' },
};

const METHOD_STYLES: Record<string, { icon: string; label: string }> = {
  face: { icon: 'F', label: '人脸' },
};

export function AttendanceList({ records }: AttendanceListProps) {
  const [filter, setFilter] = useState<'all' | AttendanceType>('all');

  const filteredRecords = filter === 'all' 
    ? records 
    : records.filter(r => r.type === filter);

  // 按时间分组显示
  const groupedRecords = filteredRecords.reduce((groups, record) => {
    const dateKey = format(record.timestamp, 'yyyy-MM-dd');
    if (!groups[dateKey]) {
      groups[dateKey] = [];
    }
    groups[dateKey].push(record);
    return groups;
  }, {} as Record<string, AttendanceRecord[]>);

  return (
    <Card className="h-full">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <List className="w-5 h-5" />
            考勤记录
          </CardTitle>
          <Badge variant="outline">{filteredRecords.length} 条</Badge>
        </div>

        {/* 筛选按钮 */}
        <div className="flex gap-1 flex-wrap">
          <Badge
            variant={filter === 'all' ? 'default' : 'outline'}
            className="cursor-pointer"
            onClick={() => setFilter('all')}
          >
            全部
          </Badge>
          {(Object.keys(ATTENDANCE_TYPE_LABELS) as AttendanceType[]).map((type) => (
            <Badge
              key={type}
              variant={filter === type ? 'default' : 'outline'}
              className={`cursor-pointer ${filter === type ? '' : ATTENDANCE_TYPE_STYLES[type].bg + ' ' + ATTENDANCE_TYPE_STYLES[type].text}`}
              onClick={() => setFilter(type)}
            >
              {ATTENDANCE_TYPE_LABELS[type]}
            </Badge>
          ))}
        </div>
      </CardHeader>

      <CardContent>
        {filteredRecords.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-gray-400">
            <Calendar className="w-12 h-12 mb-3" />
            <p className="text-sm">暂无考勤记录</p>
          </div>
        ) : (
          <div className="space-y-4 max-h-[400px] overflow-y-auto">
            {Object.entries(groupedRecords)
              .sort(([a], [b]) => b.localeCompare(a))
              .map(([dateKey, dayRecords]) => (
                <div key={dateKey}>
                  <div className="flex items-center gap-2 mb-2">
                    <Calendar className="w-4 h-4 text-gray-400" />
                    <span className="text-sm font-medium text-gray-600">
                      {format(new Date(dateKey), 'MM月dd日')}
                    </span>
                    <span className="text-xs text-gray-400">
                      {format(new Date(dateKey), 'EEEE', { weekStartsOn: 1 })}
                    </span>
                  </div>
                  <div className="space-y-2">
                    {dayRecords
                      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
                      .map((record) => (
                        <div
                          key={record.id}
                          className="flex items-center justify-between p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            <div
                              className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-medium ${
                                record.verified
                                  ? 'bg-green-500'
                                  : 'bg-yellow-500'
                              }`}
                            >
                              {record.studentName.charAt(0)}
                            </div>
                            <div>
                              <p className="font-medium text-gray-900">
                                {record.studentName}
                              </p>
                              <p className="text-xs text-gray-500 flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {format(record.timestamp, 'HH:mm:ss')}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <Badge
                              className={`${ATTENDANCE_TYPE_STYLES[record.type].bg} ${ATTENDANCE_TYPE_STYLES[record.type].text}`}
                            >
                              {ATTENDANCE_TYPE_LABELS[record.type]}
                            </Badge>
                            <Badge variant="outline" className="text-xs">
                              {METHOD_STYLES[record.method]?.label}
                            </Badge>
                            {record.verified ? (
                              <CheckCircle2 className="w-4 h-4 text-green-500" />
                            ) : (
                              <XCircle className="w-4 h-4 text-yellow-500" />
                            )}
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
