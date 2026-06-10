'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Download, 
  Upload, 
  FileSpreadsheet, 
  Users, 
  Calendar, 
  ClipboardList,
  CheckCircle,
  AlertCircle,
  Loader2,
  File
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { 
  getStudents, 
  getClasses, 
  getAttendanceRecords,
  getAnnouncements,
  SharedStudent
} from '@/lib/sharedData';

// 所有项目数据的 localStorage 键名
const ALL_DATA_KEYS = [
  'shared_classes',
  'shared_students',
  'shared_teacher_users',
  'shared_attendance',
  'shared_timetable',
  'shared_announcements',
  'shared_leave_requests',
  'shared_login_logs',
  'shared_grades',
  'shared_messages',
  'shared_media',
  'media_comments',
  'shared_parents',
  'user_notifications',
  'seat_layouts',
  'duty_schedules',
  'class_performance',
  'point_records',
  'face_descriptors',
  'voice_descriptors',
  'user',
  'current_user',
] as const;

export function DataExportPanel() {
  const [isExporting, setIsExporting] = useState<string | null>(null);
  const [exportMessage, setExportMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // 获取当前用户信息
  const getUserInfo = () => {
    if (typeof window === 'undefined') return { role: 'student', classId: '', id: '' };
    const stored = localStorage.getItem('user');
    if (!stored) return { role: 'student', classId: '', id: '' };
    const userData = JSON.parse(stored);
    return { role: userData.role || 'student', classId: userData.classId || '', id: userData.id || '' };
  };
  
  const user = getUserInfo();

  // 导出考勤记录为 CSV
  const exportAttendanceCSV = () => {
    setIsExporting('attendance');
    setExportMessage(null);

    try {
      const records = getAttendanceRecords();
      const userRecords = records.filter(r => 
        user?.role === 'teacher' || 
        r.studentId === user?.id
      );

      // CSV 表头
      const headers = ['日期', '时间', '学生姓名', '学号', '班级', '考勤类型', '打卡方式', '状态'];
      
      // 数据行
      const rows = userRecords.map(r => {
        const typeMap: Record<string, string> = {
          'check_in': '上课打卡',
          'check_out': '下课打卡',
          'leave': '请假',
          'go_out': '外出'
        };
        const methodMap: Record<string, string> = {
          'face': '人脸识别',
          'voice': '声纹识别'
        };
        
        const date = new Date(r.timestamp);
        return [
          date.toLocaleDateString('zh-CN'),
          date.toLocaleTimeString('zh-CN'),
          r.studentName,
          r.studentId,
          r.classId,
          typeMap[r.type] || r.type,
          methodMap[r.method] || r.method,
          r.verified ? '正常' : '异常'
        ];
      });

      // 生成 CSV
      const csv = [headers, ...rows]
        .map(row => row.map(cell => `"${cell}"`).join(','))
        .join('\n');

      // 下载
      downloadFile(csv, `attendance_${new Date().toISOString().split('T')[0]}.csv`, 'text/csv');
      
      setExportMessage({ type: 'success', text: `成功导出 ${rows.length} 条考勤记录` });
    } catch (error) {
      setExportMessage({ type: 'error', text: '导出失败，请重试' });
    } finally {
      setIsExporting(null);
    }
  };

  // 导出学生名单
  const exportStudentsCSV = () => {
    setIsExporting('students');
    setExportMessage(null);

    try {
      let students = getStudents();
      
      // 教师只能导出自己班级的学生
      if (user?.role === 'teacher' && user.classId) {
        students = students.filter(s => s.classId === user.classId);
      }

      const headers = ['姓名', '用户名', '学号', '班级ID', '班级名称', '人脸已注册', '声纹已注册'];
      
      const rows = students.map(s => [
        s.name,
        s.username,
        s.studentId || '',
        s.classId,
        s.className || '',
        s.faceRegistered ? '是' : '否',
        s.voiceRegistered ? '是' : '否'
      ]);

      const csv = [headers, ...rows]
        .map(row => row.map(cell => `"${cell}"`).join(','))
        .join('\n');

      downloadFile(csv, `students_${new Date().toISOString().split('T')[0]}.csv`, 'text/csv');
      
      setExportMessage({ type: 'success', text: `成功导出 ${rows.length} 名学生信息` });
    } catch (error) {
      setExportMessage({ type: 'error', text: '导出失败，请重试' });
    } finally {
      setIsExporting(null);
    }
  };

  // 导出班级信息
  const exportClassesCSV = () => {
    setIsExporting('classes');
    setExportMessage(null);

    try {
      const classes = getClasses();
      const students = getStudents();

      const headers = ['班级ID', '班级名称', '学生人数'];
      
      const rows = classes.map(c => {
        const count = students.filter(s => s.classId === c.id).length;
        return [c.id, c.name, count];
      });

      const csv = [headers, ...rows]
        .map(row => row.map(cell => `"${cell}"`).join(','))
        .join('\n');

      downloadFile(csv, `classes_${new Date().toISOString().split('T')[0]}.csv`, 'text/csv');
      
      setExportMessage({ type: 'success', text: `成功导出 ${rows.length} 个班级信息` });
    } catch (error) {
      setExportMessage({ type: 'error', text: '导出失败，请重试' });
    } finally {
      setIsExporting(null);
    }
  };

  // 导出全部项目数据为 JSON
  const exportAllDataJSON = () => {
    setIsExporting('all_json');
    setExportMessage(null);

    try {
      const allData: Record<string, unknown> = {};
      let totalRecords = 0;

      for (const key of ALL_DATA_KEYS) {
        const stored = localStorage.getItem(key);
        if (stored) {
          try {
            allData[key] = JSON.parse(stored);
            const parsed = allData[key];
            if (Array.isArray(parsed)) {
              totalRecords += parsed.length;
            } else if (typeof parsed === 'object' && parsed !== null) {
              totalRecords += 1;
            }
          } catch {
            allData[key] = stored;
            totalRecords += 1;
          }
        }
      }

      const exportPayload = {
        _meta: {
          exportTime: new Date().toISOString(),
          version: '1.0',
          source: '智能考勤系统-电子班牌',
          totalRecords,
          keyCount: Object.keys(allData).length,
        },
        data: allData,
      };

      const jsonStr = JSON.stringify(exportPayload, null, 2);
      downloadFile(jsonStr, `attendance_system_backup_${new Date().toISOString().split('T')[0]}.json`, 'application/json');

      setExportMessage({
        type: 'success',
        text: `成功导出 ${Object.keys(allData).length} 个数据集，共 ${totalRecords} 条记录`,
      });
    } catch (error) {
      setExportMessage({ type: 'error', text: '导出失败，请重试' });
    } finally {
      setIsExporting(null);
    }
  };

  // 从 JSON 导入全部项目数据
  const handleImportAllJSON = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsExporting('import_json');
    setExportMessage(null);

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const parsed = JSON.parse(content);

        // 支持两种格式：带 _meta 的完整格式 或 纯键值对格式
        const dataToImport: Record<string, unknown> = parsed.data || parsed;

        if (typeof dataToImport !== 'object' || dataToImport === null) {
          setExportMessage({ type: 'error', text: 'JSON 格式错误，需要对象格式' });
          setIsExporting(null);
          return;
        }

        let importedKeys = 0;
        let totalRecords = 0;

        for (const [key, value] of Object.entries(dataToImport)) {
          // 只导入已知的键，防止导入无关数据
          if ((ALL_DATA_KEYS as readonly string[]).includes(key)) {
            localStorage.setItem(key, typeof value === 'string' ? value : JSON.stringify(value));
            importedKeys++;
            if (Array.isArray(value)) {
              totalRecords += value.length;
            } else {
              totalRecords += 1;
            }
          }
        }

        setExportMessage({
          type: 'success',
          text: `成功导入 ${importedKeys} 个数据集，共 ${totalRecords} 条记录。请刷新页面查看最新数据。`,
        });
      } catch (error) {
        setExportMessage({ type: 'error', text: 'JSON 文件解析失败，请检查文件格式' });
      } finally {
        setIsExporting(null);
        event.target.value = '';
      }
    };

    reader.readAsText(file);
  };

  // 下载文件
  const downloadFile = (content: string, filename: string, type: string) => {
    const blob = new Blob([content], { type: `${type};charset=utf-8;` });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // 导入学生（Excel 解析）
  const handleImportStudents = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsExporting('import');
    setExportMessage(null);

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const lines = content.split('\n').filter(line => line.trim());
        
        if (lines.length < 2) {
          setExportMessage({ type: 'error', text: '文件格式错误或没有数据' });
          setIsExporting(null);
          return;
        }

        // 解析 CSV（简单处理）
        const parseCSV = (line: string) => {
          const result: string[] = [];
          let current = '';
          let inQuotes = false;
          
          for (const char of line) {
            if (char === '"') {
              inQuotes = !inQuotes;
            } else if (char === ',' && !inQuotes) {
              result.push(current.trim());
              current = '';
            } else {
              current += char;
            }
          }
          result.push(current.trim());
          return result;
        };

        const headers = parseCSV(lines[0]);
        const data = lines.slice(1).map(parseCSV);
        
        // 验证格式
        if (headers.length < 3) {
          setExportMessage({ type: 'error', text: 'CSV 格式错误，需要包含：姓名,用户名,学号 等列' });
          setIsExporting(null);
          return;
        }

        // 更新学生数据
        const students = getStudents();
        data.forEach(row => {
          if (row.length >= 1) {
            const name = row[0];
            const username = row[1] || name;
            const studentId = row[2] || '';
            const classId = row[3] || user?.classId || '';
            const className = row[4] || '';
            
            // 检查是否已存在
            const existingIndex = students.findIndex(s => s.username === username);
            if (existingIndex >= 0) {
              // 更新
              students[existingIndex] = {
                ...students[existingIndex],
                name,
                studentId,
                classId,
                className
              };
            } else {
              // 添加
              students.push({
                id: `student-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                username,
                password: '123456', // 默认密码
                name,
                studentId,
                classId,
                className,
                faceRegistered: false,
                voiceRegistered: false,
                role: 'student'
              } as SharedStudent);
            }
          }
        });

        localStorage.setItem('shared_students', JSON.stringify(students));
        setExportMessage({ type: 'success', text: `成功导入 ${data.length} 条学生记录` });
      } catch (error) {
        setExportMessage({ type: 'error', text: '文件解析失败，请检查格式' });
      } finally {
        setIsExporting(null);
        event.target.value = '';
      }
    };
    
    reader.readAsText(file);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <FileSpreadsheet className="w-6 h-6" />
          数据导入导出
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          导出考勤记录和学生信息，支持 CSV / JSON 格式导入导出
        </p>
      </div>

      {/* 消息提示 */}
      {exportMessage && (
        <div className={cn(
          "p-4 rounded-lg flex items-center gap-3",
          exportMessage.type === 'success' ? "bg-green-500/20 border border-green-500/30" : "bg-red-500/20 border border-red-500/30"
        )}>
          {exportMessage.type === 'success' ? (
            <CheckCircle className="w-5 h-5 text-green-400" />
          ) : (
            <AlertCircle className="w-5 h-5 text-red-400" />
          )}
          <span>{exportMessage.text}</span>
        </div>
      )}

      {/* 导出选项 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card className="bg-slate-800/50 border-slate-700">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
                <ClipboardList className="w-5 h-5 text-blue-400" />
              </div>
              <div>
                <CardTitle className="text-base">考勤记录</CardTitle>
                <CardDescription>导出打卡历史</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              包含日期、时间、学生信息、考勤类型等
            </p>
            <Button 
              onClick={exportAttendanceCSV} 
              disabled={isExporting === 'attendance'}
              className="w-full"
              variant="outline"
            >
              {isExporting === 'attendance' ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Download className="w-4 h-4 mr-2" />
              )}
              导出 CSV
            </Button>
          </CardContent>
        </Card>

        <Card className="bg-slate-800/50 border-slate-700">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center">
                <Users className="w-5 h-5 text-green-400" />
              </div>
              <div>
                <CardTitle className="text-base">学生名单</CardTitle>
                <CardDescription>导出学生信息</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              包含姓名、学号、班级、人脸/声纹注册状态
            </p>
            <Button 
              onClick={exportStudentsCSV} 
              disabled={isExporting === 'students'}
              className="w-full"
              variant="outline"
            >
              {isExporting === 'students' ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Download className="w-4 h-4 mr-2" />
              )}
              导出 CSV
            </Button>
          </CardContent>
        </Card>

        <Card className="bg-slate-800/50 border-slate-700">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center">
                <Calendar className="w-5 h-5 text-purple-400" />
              </div>
              <div>
                <CardTitle className="text-base">班级信息</CardTitle>
                <CardDescription>导出班级列表</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              包含班级ID、名称、学生人数
            </p>
            <Button 
              onClick={exportClassesCSV} 
              disabled={isExporting === 'classes'}
              className="w-full"
              variant="outline"
            >
              {isExporting === 'classes' ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Download className="w-4 h-4 mr-2" />
              )}
              导出 CSV
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* 全量 JSON 导出/导入 */}
      <Card className="bg-slate-800/50 border-slate-700 border-2 border-dashed border-cyan-500/40">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-cyan-500/20 flex items-center justify-center">
              <File className="w-5 h-5 text-cyan-400" />
            </div>
            <div>
              <CardTitle className="text-base">全量数据备份与恢复 (JSON)</CardTitle>
              <CardDescription>导出/导入项目全部数据，可在其他软件中编辑</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            包含学生、考勤、成绩、消息、班级、课程表、请假、通知、座位、值日、积分、媒体等所有数据
          </p>
          <div className="flex flex-col sm:flex-row gap-3">
            <Button
              onClick={exportAllDataJSON}
              disabled={isExporting === 'all_json'}
              className="flex-1 bg-cyan-600 hover:bg-cyan-700"
            >
              {isExporting === 'all_json' ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Download className="w-4 h-4 mr-2" />
              )}
              导出全部数据 JSON
            </Button>
            <div className="flex-1">
              <input
                type="file"
                accept=".json"
                onChange={handleImportAllJSON}
                className="hidden"
                id="import-all-json"
              />
              <label htmlFor="import-all-json" className="block">
                <Button
                  disabled={isExporting === 'import_json'}
                  className="w-full"
                  variant="outline"
                  asChild
                >
                  <span>
                    {isExporting === 'import_json' ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Upload className="w-4 h-4 mr-2" />
                    )}
                    从 JSON 导入全部数据
                  </span>
                </Button>
              </label>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 导入区域 */}
      {user?.role === 'teacher' && (
        <Card className="bg-slate-800/50 border-slate-700">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-amber-500/20 flex items-center justify-center">
                <Upload className="w-5 h-5 text-amber-400" />
              </div>
              <div>
                <CardTitle className="text-base">导入学生</CardTitle>
                <CardDescription>通过 CSV 文件批量导入学生</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="border-2 border-dashed border-slate-600 rounded-lg p-8 text-center hover:border-slate-500 transition-colors">
              <input
                type="file"
                accept=".csv"
                onChange={handleImportStudents}
                className="hidden"
                id="import-students"
              />
              <label htmlFor="import-students" className="cursor-pointer">
                <Upload className="w-12 h-12 mx-auto mb-3 text-slate-400" />
                <p className="text-sm text-muted-foreground mb-2">
                  点击选择 CSV 文件，或拖拽文件到此处
                </p>
                <p className="text-xs text-slate-500">
                  支持格式：姓名, 用户名, 学号, 班级ID, 班级名称
                </p>
              </label>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 导出格式说明 */}
      <Card className="bg-slate-800/50 border-slate-700">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <File className="w-4 h-4" />
            CSV 格式说明
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 text-sm">
            <div>
              <div className="font-medium text-blue-400 mb-1">学生名单 CSV 格式：</div>
              <code className="block bg-slate-900 p-2 rounded text-xs">
                &quot;姓名&quot;,&quot;用户名&quot;,&quot;学号&quot;,&quot;班级ID&quot;,&quot;班级名称&quot;,&quot;人脸已注册&quot;,&quot;声纹已注册&quot;
              </code>
            </div>
            <div>
              <div className="font-medium text-green-400 mb-1">导入 CSV 格式（简化）：</div>
              <code className="block bg-slate-900 p-2 rounded text-xs">
                &quot;张三&quot;,&quot;zhangsan&quot;,&quot;2024001&quot;,&quot;class-001&quot;,&quot;初三(1)班&quot;
              </code>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
