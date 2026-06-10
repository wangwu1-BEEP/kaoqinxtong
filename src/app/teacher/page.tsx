'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { User, GraduationCap, Users, ClipboardList, LogOut, Plus, Search, Trash2, Edit2, BarChart3, Clock, CheckCircle2, CalendarX, ExternalLink, BookOpen, Megaphone, Pin, FileText, MessageSquare, Camera, LayoutDashboard, Armchair, CalendarCheck, Flame, Star, Cloud, CloudOff, RefreshCw, MapPin } from 'lucide-react';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import AIAssistant from '@/components/assistant/AIAssistant';
import ParentTeacherMessage from '@/components/messages/ParentTeacherMessage';
import { LeaveApprovalPanel, LeaveHistoryPanel } from '@/components/attendance/LeaveApprovalPanel';
import { AttendanceStatsPanel } from '@/components/attendance/AttendanceStatsPanel';
import { ChangePasswordModal } from '@/components/settings/ChangePasswordModal';
import { LoginLogsPanel } from '@/components/settings/LoginLogsPanel';
import GradeManagementPanel from '@/components/grades/GradeManagementPanel';
import MessageSystem from '@/components/messages/MessageSystem';
import MediaGallery from '@/components/media/MediaGallery';
import { DataExportPanel } from '@/components/settings/DataExportPanel';
import { syncLocalToCloud, syncOnLogin } from '@/lib/syncUtils';
import TeacherDashboard from '@/components/dashboard/TeacherDashboard';
import SeatManager from '@/components/seats/SeatManager';
import DutySchedulePanel from '@/components/duty/DutySchedulePanel';
import AttendanceHeatmap from '@/components/attendance/AttendanceHeatmap';
import ClassPerformancePanel from '@/components/performance/ClassPerformancePanel';
import { getClasses, addClass as addSharedClass, deleteClass as deleteSharedClass, getStudents, addStudent as addSharedStudent, deleteStudent as deleteSharedStudent, getClassStudentCount, getClassCheckedInCount, getTodayAttendanceRecords, SharedClass, SharedStudent, SharedAttendanceRecord, getTimetableEntries, addTimetableEntry, deleteTimetableEntry, getAnnouncements, addAnnouncement, deleteAnnouncement, updateAnnouncement, TimetableEntry, SharedAnnouncement, getPendingLeaveRequests, addNotification, getParents } from '@/lib/sharedData';
import { syncFromCloud, upsertClassSynced, deleteClassSynced, upsertStudentSynced, deleteStudentSynced, saveTimetableEntrySynced, saveAnnouncementSynced } from '@/lib/syncUtils';
import { Shield, History, FileSpreadsheet, Trophy } from 'lucide-react';
import ScrollingAnnouncement from '@/components/announcements/ScrollingAnnouncement';
import PointsPanel from '@/components/points/PointsPanel';

interface MockAttendance {
  id: string;
  studentName: string;
  type: 'check_in' | 'check_out' | 'leave' | 'go_out';
  timestamp: Date;
  method: 'face' | 'voice' | 'both';
}

const mockAttendances: MockAttendance[] = [
  { id: 'att-001', studentName: '李明', type: 'check_in', timestamp: new Date(), method: 'both' },
  { id: 'att-002', studentName: '王芳', type: 'check_in', timestamp: new Date(), method: 'face' },
  { id: 'att-003', studentName: '刘洋', type: 'check_in', timestamp: new Date(), method: 'voice' },
  { id: 'att-004', studentName: '张伟', type: 'leave', timestamp: new Date(), method: 'face' },
];

const ATTENDANCE_LABELS = {
  check_in: '上课打卡',
  check_out: '下课打卡',
  leave: '请假',
  go_out: '外出',
};

const ATTENDANCE_COLORS = {
  check_in: 'bg-green-100 text-green-700',
  check_out: 'bg-blue-100 text-blue-700',
  leave: 'bg-yellow-100 text-yellow-700',
  go_out: 'bg-purple-100 text-purple-700',
};

export default function TeacherPage() {
  const router = useRouter();
  const [user, setUser] = useState<{ id: string; name: string; role: string } | null>(null);
  const [classes, setClasses] = useState<SharedClass[]>([]);
  const [students, setStudents] = useState<SharedStudent[]>([]);
  const [attendances, setAttendances] = useState<SharedAttendanceRecord[]>([]);
  const [timetable, setTimetable] = useState<TimetableEntry[]>([]);
  const [announcements, setAnnouncements] = useState<SharedAnnouncement[]>([]);
  const [selectedClass, setSelectedClass] = useState<SharedClass | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddClassOpen, setIsAddClassOpen] = useState(false);
  const [isAddStudentOpen, setIsAddStudentOpen] = useState(false);
  const [isAddTimetableOpen, setIsAddTimetableOpen] = useState(false);
  const [isAddAnnouncementOpen, setIsAddAnnouncementOpen] = useState(false);
  const [newClassName, setNewClassName] = useState('');
  const [newStudent, setNewStudent] = useState({ name: '', username: '', classId: '', password: '' });
  const [newTimetable, setNewTimetable] = useState({ classId: '', dayOfWeek: 1, period: 1, subject: '', teacher: '' });
  const [newAnnouncement, setNewAnnouncement] = useState({ title: '', content: '', classId: '', important: false, targetStudentIds: [] as string[] });
  const [currentTime, setCurrentTime] = useState(new Date());
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [settingsTab, setSettingsTab] = useState<'logs' | 'export'>('logs');
  const [msgTargetStudentIds, setMsgTargetStudentIds] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'success' | 'error'>('idle');

  // 加载共享数据
  useEffect(() => {
    // 先从云端同步数据，再读取本地
    syncFromCloud().then(() => {
      const loadedClasses = getClasses();
      const loadedStudents = getStudents();
      const loadedAttendances = getTodayAttendanceRecords();
      const loadedTimetable = getTimetableEntries();
      const loadedAnnouncements = getAnnouncements();
      setClasses(loadedClasses);
      setStudents(loadedStudents);
      setAttendances(loadedAttendances);
      setTimetable(loadedTimetable);
      setAnnouncements(loadedAnnouncements);
      // 默认选中第一个班级
      if (loadedClasses.length > 0 && !selectedClass) {
        setSelectedClass(loadedClasses[0]);
      }
    }).catch(err => {
      console.error('[Teacher] 云端同步失败:', err);
      // 同步失败时仍显示本地数据
      const loadedClasses = getClasses();
      const loadedStudents = getStudents();
      const loadedAttendances = getTodayAttendanceRecords();
      const loadedTimetable = getTimetableEntries();
      const loadedAnnouncements = getAnnouncements();
      setClasses(loadedClasses);
      setStudents(loadedStudents);
      setAttendances(loadedAttendances);
      setTimetable(loadedTimetable);
      setAnnouncements(loadedAnnouncements);
      // 默认选中第一个班级
      if (loadedClasses.length > 0 && !selectedClass) {
        setSelectedClass(loadedClasses[0]);
      }
    });
  }, []);

  // 定期刷新数据（每5秒同步云端 + 刷新本地）
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        await syncFromCloud();
      } catch {
        // 同步失败静默处理
      }
      const loadedAttendances = getTodayAttendanceRecords();
      const loadedStudents = getStudents();
      const loadedTimetable = getTimetableEntries();
      const loadedAnnouncements = getAnnouncements();
      setAttendances(loadedAttendances);
      setStudents(loadedStudents);
      setTimetable(loadedTimetable);
      setAnnouncements(loadedAnnouncements);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  // 检查登录状态
  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (!storedUser) {
      router.push('/login');
      return;
    }
    const userData = JSON.parse(storedUser);
    if (userData.role !== 'teacher') {
      router.push('/student');
      return;
    }
    setUser(userData);

    // 定时更新
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, [router]);

  // 登出
  const handleLogout = () => {
    localStorage.removeItem('user');
    router.push('/login');
  };

  // 云端同步
  const handleSyncToCloud = async () => {
    setSyncStatus('syncing');
    try {
      await syncLocalToCloud();
      setSyncStatus('success');
      setTimeout(() => setSyncStatus('idle'), 3000);
    } catch (e) {
      console.warn('sync to cloud failed:', e);
      setSyncStatus('error');
      setTimeout(() => setSyncStatus('idle'), 3000);
    }
  };

  const handleSyncFromCloud = async () => {
    setSyncStatus('syncing');
    try {
      await syncOnLogin();
      // 重新加载本地数据
      setClasses(getClasses());
      setStudents(getStudents());
      setSyncStatus('success');
      setTimeout(() => setSyncStatus('idle'), 3000);
    } catch (e) {
      console.warn('sync from cloud failed:', e);
      setSyncStatus('error');
      setTimeout(() => setSyncStatus('idle'), 3000);
    }
  };

  // 添加班级
  const handleAddClass = () => {
    if (!newClassName.trim()) return;
    const teacherName = user?.name || '教师';
    const newClass = addSharedClass(newClassName, teacherName);
    setClasses([...classes, newClass]);
    setNewClassName('');
    setIsAddClassOpen(false);
    // 同步班级到云端
    upsertClassSynced({ id: newClass.id, name: newClass.name, teacherName }).catch(err => console.error('[Teacher] 同步班级失败:', err));
  };

  // 删除班级
  const handleDeleteClass = (classId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('确定要删除该班级吗？该操作将同时删除班级下的所有学生。')) return;
    deleteSharedClass(classId);
    setClasses(classes.filter(c => c.id !== classId));
    setStudents(students.filter(s => s.classId !== classId));
    if (selectedClass?.id === classId) {
      setSelectedClass(null);
    }
    // 同步删除到云端
    deleteClassSynced(classId).catch(err => console.error('[Teacher] 同步删除班级失败:', err));
  };

  // 添加课程
  const handleAddTimetable = () => {
    if (!newTimetable.classId || !newTimetable.subject || !newTimetable.teacher) return;
    const entry = { ...newTimetable, id: `tt-${Date.now()}-${Math.random().toString(36).substr(2, 9)}` };
    addTimetableEntry(newTimetable);
    setTimetable([...timetable, entry]);
    // 同步到云端
    saveTimetableEntrySynced(entry).then(ok => {
      if (!ok) console.warn('[Teacher] 课程表同步到云端失败');
    }).catch(err => console.error('[Teacher] 课程表同步到云端出错:', err));
    setNewTimetable({ classId: '', dayOfWeek: 1, period: 1, subject: '', teacher: '' });
    setIsAddTimetableOpen(false);
  };

  // 删除课程
  const handleDeleteTimetable = (id: string) => {
    if (!confirm('确定要删除该课程吗？')) return;
    deleteTimetableEntry(id);
    setTimetable(timetable.filter(t => t.id !== id));
  };

  // 添加公告
  const handleAddAnnouncement = () => {
    if (!newAnnouncement.title || !newAnnouncement.content || !newAnnouncement.classId) return;
    const announcementData = {
      title: newAnnouncement.title,
      content: newAnnouncement.content,
      classId: newAnnouncement.classId,
      important: newAnnouncement.important,
      author: user?.name || '教师',
    };
    addAnnouncement(announcementData);
    const updatedAnnouncements = getAnnouncements();
    setAnnouncements(updatedAnnouncements);
    // 找到刚添加的公告（最新的那个）同步到云端
    const newAnn = updatedAnnouncements.find(
      (a: SharedAnnouncement) => a.title === announcementData.title && a.content === announcementData.content && a.classId === announcementData.classId
    );
    if (newAnn) {
      saveAnnouncementSynced(newAnn as unknown as Record<string, unknown>).then(ok => {
        if (!ok) console.warn('[Teacher] 公告同步到云端失败');
      }).catch(err => console.error('[Teacher] 公告同步到云端出错:', err));
    }
    // 向选中的学生推送通知（如果未选择则推送给全班）
    const classStudents = students.filter(s => s.classId === newAnnouncement.classId);
    const targetIds = newAnnouncement.targetStudentIds.length > 0
      ? newAnnouncement.targetStudentIds
      : classStudents.map(s => s.id);
    targetIds.forEach(studentId => {
      addNotification({
        userId: studentId,
        title: '新公告',
        message: `${announcementData.title}: ${announcementData.content.slice(0, 50)}...`,
        type: 'announcement',
        read: false,
      });
      // 同时推送给该学生的家长
      const parents = getParents();
      const parentOfStudent = parents.find(p => p.childrenIds?.includes(studentId));
      if (parentOfStudent) {
        addNotification({
          userId: parentOfStudent.id,
          title: '班级新公告',
          message: `${announcementData.title}: ${announcementData.content.slice(0, 50)}...`,
          type: 'announcement',
          read: false,
        });
      }
    });
    setNewAnnouncement({ title: '', content: '', classId: '', important: false, targetStudentIds: [] });
    setIsAddAnnouncementOpen(false);
  };

  // 删除公告
  const handleDeleteAnnouncement = (id: string) => {
    if (!confirm('确定要删除该公告吗？')) return;
    deleteAnnouncement(id);
    setAnnouncements(announcements.filter(a => a.id !== id));
  };

  // 切换公告重要标记
  const handleToggleImportant = (id: string, currentStatus: boolean) => {
    updateAnnouncement(id, { important: !currentStatus });
    const updatedAnnouncements = getAnnouncements();
    setAnnouncements(updatedAnnouncements);
  };

  // 添加学生
  const handleAddStudent = () => {
    if (!newStudent.name || !newStudent.username || !newStudent.classId || !newStudent.password) return;
    // 检查用户名是否已存在
    if (students.some(s => s.username === newStudent.username)) {
      alert('用户名已存在！');
      return;
    }
    const student = addSharedStudent({
      name: newStudent.name,
      username: newStudent.username,
      password: newStudent.password,
      classId: newStudent.classId,
      role: 'student',
    });
    setStudents([...students, student]);
    setNewStudent({ name: '', username: '', classId: '', password: '' });
    setIsAddStudentOpen(false);
    // 同步学生到云端
    const cls = classes.find(c => c.id === newStudent.classId);
    upsertStudentSynced({
      id: student.id,
      username: student.username,
      password: student.password,
      name: student.name,
      role: 'student',
      classId: student.classId,
      className: cls?.name || '',
      faceRegistered: false,
      voiceRegistered: false,
    }).catch(err => console.error('[Teacher] 同步学生失败:', err));
  };

  // 删除学生
  const handleDeleteStudent = (id: string) => {
    deleteSharedStudent(id);
    setStudents(students.filter(s => s.id !== id));
    // 同步删除到云端
    deleteStudentSynced(id).catch(err => console.error('[Teacher] 同步删除学生失败:', err));
  };

  // 获取班级的学生
  const getClassStudents = (classId: string) => {
    return students.filter(s => s.classId === classId);
  };

  // 获取过滤后的学生
  const getFilteredStudents = () => {
    if (!searchTerm) return students;
    return students.filter(s => 
      s.name.includes(searchTerm) || 
      s.username.includes(searchTerm)
    );
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0a0a1a] via-[#0d1b2a] to-[#1a1a3e] relative overflow-hidden">
      {/* 背景装饰 */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-[500px] h-[500px] bg-gradient-to-br from-blue-500/15 to-indigo-500/15 rounded-full blur-[120px] animate-pulse" />
        <div className="absolute -bottom-40 -left-40 w-[500px] h-[500px] bg-gradient-to-tr from-purple-500/15 to-indigo-500/15 rounded-full blur-[120px] animate-pulse" style={{ animationDelay: '2s' }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-gradient-to-br from-cyan-500/8 to-blue-500/8 rounded-full blur-[100px]" />
        {/* 网格背景 */}
        <div className="absolute inset-0" style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px)', backgroundSize: '60px 60px' }} />
      </div>

      {/* 顶部导航 */}
      <header className="bg-gradient-to-r from-blue-900/60 via-indigo-900/60 to-purple-900/60 text-white shadow-2xl backdrop-blur-xl border-b border-white/10 relative z-10">
        <div className="container mx-auto px-6 py-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-gradient-to-br from-blue-400/30 to-indigo-400/30 rounded-2xl flex items-center justify-center backdrop-blur-sm border border-white/20 shadow-lg shadow-blue-500/20">
                <GraduationCap className="w-8 h-8 text-blue-300" />
              </div>
              <div>
                <h1 className="text-2xl font-bold tracking-tight bg-gradient-to-r from-blue-200 via-indigo-200 to-purple-200 bg-clip-text text-transparent">{user.name?.replace(/老师$/, '')}老师，您好</h1>
              </div>
            </div>
            <div className="flex items-center gap-6">
              <div className="text-right bg-white/5 rounded-xl px-4 py-2 backdrop-blur-sm border border-white/10">
                <p className="font-mono text-2xl font-bold tracking-wider text-blue-200">{format(currentTime, 'HH:mm:ss')}</p>
                <p className="text-blue-300/60 text-sm">{format(currentTime, 'yyyy年MM月dd日')}</p>
              </div>
              <Button 
                variant="outline" 
                onClick={handleLogout} 
                className="bg-white/5 border-white/20 text-white/80 hover:bg-red-500/20 hover:border-red-400/30 hover:text-red-300 backdrop-blur-sm transition-all duration-300 hover:scale-105"
              >
                <LogOut className="w-4 h-4 mr-2" />
                退出登录
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* 主内容 */}
      <div className="container mx-auto px-6 py-8 relative z-10">
        {/* 滚动公告 */}
        <ScrollingAnnouncement />

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="flex flex-wrap gap-1 bg-white/5 backdrop-blur-xl p-1.5 rounded-2xl shadow-2xl border border-white/10 w-full">
            <TabsTrigger value="dashboard" className="flex items-center gap-1.5 shrink-0 px-3 py-2 rounded-lg text-white/50 hover:text-white hover:bg-white/8 data-[state=active]:bg-gradient-to-br data-[state=active]:from-sky-500/90 data-[state=active]:to-blue-600/90 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-sky-500/25 transition-all duration-300">
              <LayoutDashboard className="w-4 h-4" />
              <span className="text-xs font-medium whitespace-nowrap">数据看板</span>
            </TabsTrigger>
            <TabsTrigger value="classes" className="flex items-center gap-1.5 shrink-0 px-3 py-2 rounded-lg text-white/50 hover:text-white hover:bg-white/8 data-[state=active]:bg-gradient-to-br data-[state=active]:from-blue-500/90 data-[state=active]:to-indigo-600/90 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-blue-500/25 transition-all duration-300">
              <GraduationCap className="w-4 h-4" />
              <span className="text-xs font-medium whitespace-nowrap">班级管理</span>
            </TabsTrigger>
            <TabsTrigger value="students" className="flex items-center gap-1.5 shrink-0 px-3 py-2 rounded-lg text-white/50 hover:text-white hover:bg-white/8 data-[state=active]:bg-gradient-to-br data-[state=active]:from-indigo-500/90 data-[state=active]:to-purple-600/90 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-indigo-500/25 transition-all duration-300">
              <Users className="w-4 h-4" />
              <span className="text-xs font-medium whitespace-nowrap">学生管理</span>
            </TabsTrigger>
            <TabsTrigger value="timetable" className="flex items-center gap-1.5 shrink-0 px-3 py-2 rounded-lg text-white/50 hover:text-white hover:bg-white/8 data-[state=active]:bg-gradient-to-br data-[state=active]:from-green-500/90 data-[state=active]:to-teal-600/90 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-green-500/25 transition-all duration-300">
              <BookOpen className="w-4 h-4" />
              <span className="text-xs font-medium whitespace-nowrap">课程表</span>
            </TabsTrigger>
            <TabsTrigger value="announcements" className="flex items-center gap-1.5 shrink-0 px-3 py-2 rounded-lg text-white/50 hover:text-white hover:bg-white/8 data-[state=active]:bg-gradient-to-br data-[state=active]:from-orange-500/90 data-[state=active]:to-red-600/90 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-orange-500/25 transition-all duration-300">
              <Megaphone className="w-4 h-4" />
              <span className="text-xs font-medium whitespace-nowrap">公告</span>
            </TabsTrigger>
            <TabsTrigger value="attendance" className="flex items-center gap-1.5 shrink-0 px-3 py-2 rounded-lg text-white/50 hover:text-white hover:bg-white/8 data-[state=active]:bg-gradient-to-br data-[state=active]:from-purple-500/90 data-[state=active]:to-pink-600/90 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-purple-500/25 transition-all duration-300">
              <ClipboardList className="w-4 h-4" />
              <span className="text-xs font-medium whitespace-nowrap">考勤记录</span>
            </TabsTrigger>
            <TabsTrigger value="stats" className="flex items-center gap-1.5 shrink-0 px-3 py-2 rounded-lg text-white/50 hover:text-white hover:bg-white/8 data-[state=active]:bg-gradient-to-br data-[state=active]:from-pink-500/90 data-[state=active]:to-rose-600/90 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-pink-500/25 transition-all duration-300">
              <BarChart3 className="w-4 h-4" />
              <span className="text-xs font-medium whitespace-nowrap">数据统计</span>
            </TabsTrigger>
            <TabsTrigger value="leave" className="flex items-center gap-1.5 shrink-0 px-3 py-2 rounded-lg text-white/50 hover:text-white hover:bg-white/8 data-[state=active]:bg-gradient-to-br data-[state=active]:from-amber-500/90 data-[state=active]:to-orange-600/90 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-amber-500/25 transition-all duration-300">
              <FileText className="w-4 h-4" />
              <span className="text-xs font-medium whitespace-nowrap">请假审批</span>
            </TabsTrigger>
            <TabsTrigger value="grades" className="flex items-center gap-1.5 shrink-0 px-3 py-2 rounded-lg text-white/50 hover:text-white hover:bg-white/8 data-[state=active]:bg-gradient-to-br data-[state=active]:from-emerald-500/90 data-[state=active]:to-green-600/90 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-emerald-500/25 transition-all duration-300">
              <BarChart3 className="w-4 h-4" />
              <span className="text-xs font-medium whitespace-nowrap">成绩管理</span>
            </TabsTrigger>
            <TabsTrigger value="messages" className="flex items-center gap-1.5 shrink-0 px-3 py-2 rounded-lg text-white/50 hover:text-white hover:bg-white/8 data-[state=active]:bg-gradient-to-br data-[state=active]:from-cyan-500/90 data-[state=active]:to-blue-600/90 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-cyan-500/25 transition-all duration-300">
              <MessageSquare className="w-4 h-4" />
              <span className="text-xs font-medium whitespace-nowrap">师生消息</span>
            </TabsTrigger>
            <TabsTrigger value="parentMsg" className="flex items-center gap-1.5 shrink-0 px-3 py-2 rounded-lg text-white/50 hover:text-white hover:bg-white/8 data-[state=active]:bg-gradient-to-br data-[state=active]:from-teal-500/90 data-[state=active]:to-cyan-600/90 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-teal-500/25 transition-all duration-300">
              <Users className="w-4 h-4" />
              <span className="text-xs font-medium whitespace-nowrap">家校沟通</span>
            </TabsTrigger>
            <TabsTrigger value="media" className="flex items-center gap-1.5 shrink-0 px-3 py-2 rounded-lg text-white/50 hover:text-white hover:bg-white/8 data-[state=active]:bg-gradient-to-br data-[state=active]:from-violet-500/90 data-[state=active]:to-purple-600/90 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-violet-500/25 transition-all duration-300">
              <Camera className="w-4 h-4" />
              <span className="text-xs font-medium whitespace-nowrap">班级相册</span>
            </TabsTrigger>
            <TabsTrigger value="seats" className="flex items-center gap-1.5 shrink-0 px-3 py-2 rounded-lg text-white/50 hover:text-white hover:bg-white/8 data-[state=active]:bg-gradient-to-br data-[state=active]:from-lime-500/90 data-[state=active]:to-green-600/90 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-lime-500/25 transition-all duration-300">
              <Armchair className="w-4 h-4" />
              <span className="text-xs font-medium whitespace-nowrap">座位表</span>
            </TabsTrigger>
            <TabsTrigger value="duty" className="flex items-center gap-1.5 shrink-0 px-3 py-2 rounded-lg text-white/50 hover:text-white hover:bg-white/8 data-[state=active]:bg-gradient-to-br data-[state=active]:from-yellow-500/90 data-[state=active]:to-amber-600/90 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-yellow-500/25 transition-all duration-300">
              <CalendarCheck className="w-4 h-4" />
              <span className="text-xs font-medium whitespace-nowrap">值日安排</span>
            </TabsTrigger>
            <TabsTrigger value="performance" className="flex items-center gap-1.5 shrink-0 px-3 py-2 rounded-lg text-white/50 hover:text-white hover:bg-white/8 data-[state=active]:bg-gradient-to-br data-[state=active]:from-rose-500/90 data-[state=active]:to-pink-600/90 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-rose-500/25 transition-all duration-300">
              <Star className="w-4 h-4" />
              <span className="text-xs font-medium whitespace-nowrap">课堂表现</span>
            </TabsTrigger>
            <TabsTrigger value="heatmap" className="flex items-center gap-1.5 shrink-0 px-3 py-2 rounded-lg text-white/50 hover:text-white hover:bg-white/8 data-[state=active]:bg-gradient-to-br data-[state=active]:from-red-500/90 data-[state=active]:to-orange-600/90 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-red-500/25 transition-all duration-300">
              <Flame className="w-4 h-4" />
              <span className="text-xs font-medium whitespace-nowrap">考勤热力图</span>
            </TabsTrigger>
            <TabsTrigger value="points" className="flex items-center gap-1.5 shrink-0 px-3 py-2 rounded-lg text-white/50 hover:text-white hover:bg-white/8 data-[state=active]:bg-gradient-to-br data-[state=active]:from-amber-500/90 data-[state=active]:to-yellow-600/90 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-amber-500/25 transition-all duration-300">
              <Trophy className="w-4 h-4" />
              <span className="text-xs font-medium whitespace-nowrap">积分奖励</span>
            </TabsTrigger>
            <TabsTrigger value="settings" className="flex items-center gap-1.5 shrink-0 px-3 py-2 rounded-lg text-white/50 hover:text-white hover:bg-white/8 data-[state=active]:bg-gradient-to-br data-[state=active]:from-slate-500/90 data-[state=active]:to-gray-600/90 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-slate-500/25 transition-all duration-300">
              <Shield className="w-4 h-4" />
              <span className="text-xs font-medium whitespace-nowrap">安全设置</span>
            </TabsTrigger>
          </TabsList>

          {/* 班级管理 */}
          <TabsContent value="classes" className="mt-8">
            <Card className="shadow-2xl border-0 overflow-hidden bg-white/5 backdrop-blur-xl border border-white/10">
              <div className="h-2 bg-gradient-to-r from-blue-400 via-indigo-400 to-purple-400" />
              <CardHeader className="bg-gradient-to-r from-blue-900/30 to-indigo-900/30 border-b border-white/10">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-3 text-blue-200">
                      <div className="w-10 h-10 bg-gradient-to-br from-blue-500/40 to-indigo-500/40 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20 border border-blue-400/30">
                        <GraduationCap className="w-5 h-5 text-blue-300" />
                      </div>
                      班级列表
                    </CardTitle>
                    <CardDescription className="text-blue-300/50 mt-1">管理您负责的班级和学生</CardDescription>
                  </div>
                  <Dialog open={isAddClassOpen} onOpenChange={setIsAddClassOpen}>
                    <DialogTrigger asChild>
                      <Button className="bg-gradient-to-r from-blue-500/80 to-indigo-500/80 hover:from-blue-500 hover:to-indigo-500 text-white border-0 shadow-lg shadow-blue-500/20 hover:shadow-xl hover:shadow-blue-500/30 transition-all duration-300">
                        <Plus className="w-4 h-4 mr-2" />
                        添加班级
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="rounded-2xl">
                      <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                          <GraduationCap className="w-5 h-5 text-blue-500" />
                          添加新班级
                        </DialogTitle>
                        <DialogDescription>输入班级名称创建新班级</DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4 py-4">
                        <div className="space-y-2">
                          <Label htmlFor="class-name">班级名称</Label>
                          <Input
                            id="class-name"
                            placeholder="例如：初三（1）班"
                            value={newClassName}
                            onChange={(e) => setNewClassName(e.target.value)}
                            className="rounded-xl"
                          />
                        </div>
                        <Button onClick={handleAddClass} className="w-full bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 text-white border-0 rounded-xl">
                          确认添加
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardHeader>
              <CardContent className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {classes.map((cls) => (
                    <Card key={cls.id} className="cursor-pointer hover:shadow-2xl hover:shadow-blue-500/10 hover:-translate-y-1 transition-all duration-300 bg-white/5 backdrop-blur-sm border border-white/10 hover:border-blue-400/30" onClick={() => setSelectedClass(cls)}>
                      <CardContent className="p-6">
                        <div className="flex items-center justify-between mb-5">
                          <div className="flex items-center gap-3">
                            <div className="w-14 h-14 bg-gradient-to-br from-blue-500/20 to-indigo-500/20 rounded-2xl flex items-center justify-center border border-blue-400/20">
                              <GraduationCap className="w-7 h-7 text-blue-400" />
                            </div>
                            <div>
                              <h3 className="font-bold text-lg text-white">{cls.name}</h3>
                              <p className="text-xs text-white/30 font-mono">编号：{cls.id}</p>
                            </div>
                          </div>
                          <ExternalLink className="w-5 h-5 text-white/20" />
                        </div>
                        <div className="flex items-center justify-between p-4 bg-white/5 rounded-xl border border-white/5">
                          <span className="text-sm text-white/50 flex items-center gap-1">
                            <Users className="w-4 h-4" />
                            学生数：{getClassStudentCount(cls.id)}
                          </span>
                          <Badge className="bg-gradient-to-r from-green-500/20 to-emerald-500/20 text-green-400 border-0 border border-green-400/20">
                            <CheckCircle2 className="w-3 h-3 mr-1" />
                            已签到 {getClassCheckedInCount(cls.id)}
                          </Badge>
                        </div>
                      </CardContent>
                      {/* 删除按钮 */}
                      <div className="px-6 pb-4 flex justify-end">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => handleDeleteClass(cls.id, e)}
                          className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                        >
                          <Trash2 className="w-4 h-4 mr-1" />
                          删除班级
                        </Button>
                      </div>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* 学生管理 */}
          <TabsContent value="students" className="mt-8">
            <Card className="shadow-2xl border-0 overflow-hidden bg-white/5 backdrop-blur-xl border border-white/10">
              <div className="h-2 bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400" />
              <CardHeader className="bg-gradient-to-r from-indigo-900/30 to-purple-900/30 border-b border-white/10">
                <div className="flex items-center justify-between flex-wrap gap-4">
                  <div>
                    <CardTitle className="flex items-center gap-3 text-indigo-200">
                      <div className="w-10 h-10 bg-gradient-to-br from-indigo-500/40 to-purple-500/40 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/20 border border-indigo-400/30">
                        <Users className="w-5 h-5 text-indigo-300" />
                      </div>
                      学生列表
                    </CardTitle>
                    <CardDescription className="text-indigo-300/50 mt-1">管理班级内的学生信息</CardDescription>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <Input
                        placeholder="搜索学生..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10 w-64 rounded-xl bg-white/5 border-white/10 text-white placeholder:text-white/30 focus:bg-white/10 transition-all"
                      />
                    </div>
                    <Dialog open={isAddStudentOpen} onOpenChange={setIsAddStudentOpen}>
                      <DialogTrigger asChild>
                        <Button className="bg-gradient-to-r from-indigo-500/80 to-purple-500/80 hover:from-indigo-500 hover:to-purple-500 text-white border-0 shadow-lg shadow-indigo-500/20 hover:shadow-xl transition-all duration-300">
                          <Plus className="w-4 h-4 mr-2" />
                          添加学生
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="rounded-2xl">
                        <DialogHeader>
                          <DialogTitle className="flex items-center gap-2">
                            <Users className="w-5 h-5 text-indigo-500" />
                            添加新学生
                          </DialogTitle>
                          <DialogDescription>填写学生信息添加到班级</DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                          <div className="space-y-2">
                            <Label htmlFor="stu-name">姓名</Label>
                            <Input
                              id="stu-name"
                              placeholder="学生姓名"
                              value={newStudent.name}
                              onChange={(e) => setNewStudent({ ...newStudent, name: e.target.value })}
                              className="rounded-xl"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="stu-username">用户名</Label>
                            <Input
                              id="stu-username"
                              placeholder="登录用户名"
                              value={newStudent.username}
                              onChange={(e) => setNewStudent({ ...newStudent, username: e.target.value })}
                              className="rounded-xl"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="stu-class">班级</Label>
                            <select
                              id="stu-class"
                              className="w-full h-10 px-3 border rounded-xl bg-gray-50"
                              value={newStudent.classId}
                              onChange={(e) => setNewStudent({ ...newStudent, classId: e.target.value })}
                            >
                              <option value="">选择班级</option>
                              {classes.map((cls) => (
                                <option key={cls.id} value={cls.id}>{cls.name}</option>
                              ))}
                            </select>
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="stu-password">密码</Label>
                            <Input
                              id="stu-password"
                              type="password"
                              placeholder="登录密码"
                              value={newStudent.password}
                              onChange={(e) => setNewStudent({ ...newStudent, password: e.target.value })}
                              className="rounded-xl"
                            />
                          </div>
                          <Button onClick={handleAddStudent} className="w-full bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 text-white border-0 rounded-xl">
                            确认添加
                          </Button>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-6">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-white/5 border-white/10 hover:bg-white/5">
                      <TableHead className="font-semibold text-white/60">姓名</TableHead>
                      <TableHead className="font-semibold text-white/60">用户名</TableHead>
                      <TableHead className="font-semibold text-white/60">班级</TableHead>
                      <TableHead className="font-semibold text-white/60">人脸录入</TableHead>
                      <TableHead className="font-semibold text-white/60">操作</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {getFilteredStudents().map((student) => (
                      <TableRow key={student.id} className="hover:bg-white/5 transition-colors border-white/5">
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-gradient-to-br from-blue-500/20 to-indigo-500/20 rounded-xl flex items-center justify-center text-blue-400 font-bold border border-blue-400/20">
                              {student.name.charAt(0)}
                            </div>
                            <span className="font-semibold text-white">{student.name}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="font-mono text-white/50">{student.username}</span>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="bg-indigo-500/10 text-indigo-300 border-indigo-400/30">
                            {student.className || student.classId}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {student.faceRegistered ? (
                            <Badge className="bg-gradient-to-r from-green-500/20 to-emerald-500/20 text-green-400 border-0 border border-green-400/20">
                              <CheckCircle2 className="w-3 h-3 mr-1" />
                              已录入
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-white/30 border-white/10">未录入</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Button variant="ghost" size="sm" className="hover:bg-blue-500/10">
                              <Edit2 className="w-4 h-4 text-blue-400" />
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => handleDeleteStudent(student.id)} className="hover:bg-red-500/10">
                              <Trash2 className="w-4 h-4 text-red-400" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* 课程表管理 */}
          <TabsContent value="timetable" className="mt-8">
            <Card className="shadow-2xl border-0 overflow-hidden bg-white/5 backdrop-blur-xl border border-white/10">
              <div className="h-2 bg-gradient-to-r from-green-400 via-teal-400 to-cyan-400" />
              <CardHeader className="bg-gradient-to-r from-green-900/30 to-teal-900/30 border-b border-white/10">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-3 text-green-200">
                      <div className="w-10 h-10 bg-gradient-to-br from-green-500/40 to-teal-500/40 rounded-xl flex items-center justify-center shadow-lg shadow-green-500/20 border border-green-400/30">
                        <BookOpen className="w-5 h-5 text-green-300" />
                      </div>
                      课程表管理
                    </CardTitle>
                    <CardDescription className="text-green-300/50">管理班级课程安排</CardDescription>
                  </div>
                  <Dialog open={isAddTimetableOpen} onOpenChange={setIsAddTimetableOpen}>
                    <DialogTrigger asChild>
                      <Button className="bg-gradient-to-r from-green-500/80 to-teal-500/80 hover:from-green-500 hover:to-teal-500 text-white border-0 shadow-lg shadow-green-500/20 hover:shadow-xl transition-all duration-300">
                        <Plus className="w-4 h-4 mr-2" />
                        添加课程
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="rounded-2xl">
                      <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                          <BookOpen className="w-5 h-5 text-green-500" />
                          添加课程
                        </DialogTitle>
                        <DialogDescription>填写课程信息</DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4 py-4">
                        <div className="space-y-2">
                          <Label>所属班级</Label>
                          <select
                            className="w-full p-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 bg-white"
                            value={newTimetable.classId}
                            onChange={(e) => setNewTimetable({ ...newTimetable, classId: e.target.value })}
                          >
                            <option value="">选择班级</option>
                            {classes.map((cls) => (
                              <option key={cls.id} value={cls.id}>{cls.name}</option>
                            ))}
                          </select>
                        </div>
                        <div className="space-y-2">
                          <Label>星期</Label>
                          <select
                            className="w-full p-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 bg-white"
                            value={newTimetable.dayOfWeek}
                            onChange={(e) => setNewTimetable({ ...newTimetable, dayOfWeek: parseInt(e.target.value) })}
                          >
                            <option value={1}>周日</option>
                            <option value={2}>周一</option>
                            <option value={3}>周二</option>
                            <option value={4}>周三</option>
                            <option value={5}>周四</option>
                            <option value={6}>周五</option>
                            <option value={7}>周六</option>
                          </select>
                        </div>
                        <div className="space-y-2">
                          <Label>节次</Label>
                          <select
                            className="w-full p-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 bg-white"
                            value={newTimetable.period}
                            onChange={(e) => setNewTimetable({ ...newTimetable, period: parseInt(e.target.value) })}
                          >
                            <option value={1}>第1节 (08:00-08:45)</option>
                            <option value={2}>第2节 (08:55-09:40)</option>
                            <option value={3}>第3节 (10:00-10:45)</option>
                            <option value={4}>第4节 (10:55-11:40)</option>
                            <option value={5}>第5节 (14:00-14:45)</option>
                            <option value={6}>第6节 (14:55-15:40)</option>
                            <option value={7}>第7节 (15:50-16:35)</option>
                            <option value={8}>第8节 (16:45-17:30)</option>
                          </select>
                        </div>
                        <div className="space-y-2">
                          <Label>科目</Label>
                          <Input
                            placeholder="如：语文、数学、英语"
                            value={newTimetable.subject}
                            onChange={(e) => setNewTimetable({ ...newTimetable, subject: e.target.value })}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>任课教师</Label>
                          <Input
                            placeholder="教师姓名"
                            value={newTimetable.teacher}
                            onChange={(e) => setNewTimetable({ ...newTimetable, teacher: e.target.value })}
                          />
                        </div>
                        <Button onClick={handleAddTimetable} className="w-full bg-gradient-to-r from-green-500 to-teal-500 hover:from-green-600 hover:to-teal-600 text-white border-0">
                          添加课程
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardHeader>
              <CardContent className="p-6">
                {timetable.length === 0 ? (
                  <div className="text-center py-12 text-white/30">
                    <Clock className="w-16 h-16 mx-auto mb-4 opacity-50" />
                    <p>暂无课程安排</p>
                    <p className="text-sm mt-2">点击上方按钮添加课程</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {['周日', '周一', '周二', '周三', '周四', '周五', '周六'].map((day, index) => {
                      const dayTimetable = timetable.filter(t => t.dayOfWeek === index + 1).sort((a, b) => a.period - b.period);
                      if (dayTimetable.length === 0) return null;
                      return (
                        <div key={day} className="border border-white/10 rounded-xl p-4 bg-white/5">
                          <h3 className="font-bold text-green-300 mb-3 flex items-center gap-2">
                            <span className="w-8 h-8 bg-green-500/20 rounded-lg flex items-center justify-center text-sm border border-green-400/20">{day}</span>
                            {day}
                          </h3>
                          <div className="grid gap-2">
                            {dayTimetable.map((entry) => {
                              const classInfo = classes.find(c => c.id === entry.classId);
                              return (
                                <div key={entry.id} className="flex items-center justify-between p-3 bg-white/5 rounded-lg hover:bg-white/10 transition-colors border border-white/5">
                                  <div className="flex items-center gap-3">
                                    <span className="w-16 text-sm font-medium text-green-400">第{entry.period}节</span>
                                    <div>
                                      <p className="font-medium text-white">{entry.subject}</p>
                                      <p className="text-sm text-white/40">{entry.teacher} · {classInfo?.name || '未知班级'}</p>
                                    </div>
                                  </div>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleDeleteTimetable(entry.id)}
                                    className="text-red-500 hover:text-red-700 hover:bg-red-50"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* 公告管理 */}
          <TabsContent value="announcements" className="mt-8">
            <Card className="shadow-2xl border-0 overflow-hidden bg-white/5 backdrop-blur-xl border border-white/10">
              <div className="h-2 bg-gradient-to-r from-orange-400 via-red-400 to-pink-400" />
              <CardHeader className="bg-gradient-to-r from-orange-900/30 to-red-900/30 border-b border-white/10">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-3 text-orange-200">
                      <div className="w-10 h-10 bg-gradient-to-br from-orange-500/40 to-red-500/40 rounded-xl flex items-center justify-center shadow-lg shadow-orange-500/20 border border-orange-400/30">
                        <Megaphone className="w-5 h-5 text-orange-300" />
                      </div>
                      班级公告
                    </CardTitle>
                    <CardDescription className="text-orange-300/50">发布和管理班级公告</CardDescription>
                  </div>
                  <Dialog open={isAddAnnouncementOpen} onOpenChange={setIsAddAnnouncementOpen}>
                    <DialogTrigger asChild>
                      <Button className="bg-gradient-to-r from-orange-500/80 to-red-500/80 hover:from-orange-500 hover:to-red-500 text-white border-0 shadow-lg shadow-orange-500/20 hover:shadow-xl transition-all duration-300">
                        <Plus className="w-4 h-4 mr-2" />
                        发布公告
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="rounded-2xl">
                      <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                          <Megaphone className="w-5 h-5 text-orange-500" />
                          发布公告
                        </DialogTitle>
                        <DialogDescription>填写公告信息</DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4 py-4">
                        <div className="space-y-2">
                          <Label>公告标题</Label>
                          <Input
                            placeholder="公告标题"
                            value={newAnnouncement.title}
                            onChange={(e) => setNewAnnouncement({ ...newAnnouncement, title: e.target.value })}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>公告内容</Label>
                          <textarea
                            className="w-full p-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 bg-white min-h-[100px] resize-none"
                            placeholder="公告内容..."
                            value={newAnnouncement.content}
                            onChange={(e) => setNewAnnouncement({ ...newAnnouncement, content: e.target.value })}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>发布班级</Label>
                          <select
                            className="w-full p-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 bg-white"
                            value={newAnnouncement.classId}
                            onChange={(e) => setNewAnnouncement({ ...newAnnouncement, classId: e.target.value })}
                          >
                            <option value="">选择班级</option>
                            {classes.map((cls) => (
                              <option key={cls.id} value={cls.id}>{cls.name}</option>
                            ))}
                          </select>
                        </div>
                        <div className="space-y-2">
                          <Label>推送对象（不选则推送全班）</Label>
                          <div className="max-h-[150px] overflow-y-auto border border-gray-200 rounded-xl p-2 space-y-1">
                            <label className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-gray-50 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={newAnnouncement.targetStudentIds.length === students.filter(s => s.classId === newAnnouncement.classId).length && students.filter(s => s.classId === newAnnouncement.classId).length > 0}
                                onChange={(e) => {
                                  const classStudents = students.filter(s => s.classId === newAnnouncement.classId);
                                  setNewAnnouncement({ ...newAnnouncement, targetStudentIds: e.target.checked ? classStudents.map(s => s.id) : [] });
                                }}
                                className="w-4 h-4 rounded accent-orange-500"
                              />
                              <span className="text-sm font-medium text-gray-600">全选</span>
                            </label>
                            <div className="border-t border-gray-100 my-1" />
                            {students.filter(s => s.classId === newAnnouncement.classId).map((student) => (
                              <label key={student.id} className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-gray-50 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={newAnnouncement.targetStudentIds.includes(student.id)}
                                  onChange={(e) => {
                                    const ids = e.target.checked
                                      ? [...newAnnouncement.targetStudentIds, student.id]
                                      : newAnnouncement.targetStudentIds.filter(id => id !== student.id);
                                    setNewAnnouncement({ ...newAnnouncement, targetStudentIds: ids });
                                  }}
                                  className="w-4 h-4 rounded accent-orange-500"
                                />
                                <span className="text-sm">{student.name}</span>
                              </label>
                            ))}
                            {students.filter(s => s.classId === newAnnouncement.classId).length === 0 && (
                              <p className="text-xs text-gray-400 text-center py-2">请先选择班级</p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            id="isImportant"
                            checked={newAnnouncement.important}
                            onChange={(e) => setNewAnnouncement({ ...newAnnouncement, important: e.target.checked })}
                            className="w-4 h-4"
                          />
                          <Label htmlFor="isImportant" className="text-red-600 font-medium">标记为重要公告</Label>
                        </div>
                        <Button onClick={handleAddAnnouncement} className="w-full bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white border-0">
                          发布公告
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardHeader>
              <CardContent className="p-6">
                {announcements.length === 0 ? (
                  <div className="text-center py-12 text-white/30">
                    <Megaphone className="w-16 h-16 mx-auto mb-4 opacity-50" />
                    <p>暂无公告</p>
                    <p className="text-sm mt-2">点击上方按钮发布公告</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {announcements.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).map((ann) => {
                      const classInfo = classes.find(c => c.id === ann.classId);
                      return (
                        <div key={ann.id} className={`p-4 rounded-xl border ${ann.important ? 'bg-red-500/10 border-red-400/30' : 'bg-white/5 border-white/10'}`}>
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                {ann.important && (
                                  <Badge variant="destructive" className="flex items-center gap-1">
                                    <Pin className="w-3 h-3" />
                                    重要
                                  </Badge>
                                )}
                                <span className="text-sm text-white/40">{classInfo?.name || '所有班级'}</span>
                              </div>
                              <h3 className="font-bold text-white mb-1">{ann.title}</h3>
                              <p className="text-white/60 text-sm">{ann.content}</p>
                              <p className="text-white/30 text-xs mt-2">
                                {new Date(ann.createdAt).toLocaleString('zh-CN')}
                              </p>
                            </div>
                            <div className="flex flex-col gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleToggleImportant(ann.id, ann.important)}
                                className={ann.important ? 'text-gray-500 hover:text-orange-600 hover:bg-orange-50' : 'text-red-500 hover:text-red-700 hover:bg-red-50'}
                              >
                                <Pin className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDeleteAnnouncement(ann.id)}
                                className="text-red-500 hover:text-red-700 hover:bg-red-50"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* 考勤记录 */}
          <TabsContent value="attendance" className="mt-8">
            <Card className="shadow-2xl border-0 overflow-hidden bg-white/5 backdrop-blur-xl border border-white/10">
              <div className="h-2 bg-gradient-to-r from-purple-400 via-pink-400 to-rose-400" />
              <CardHeader className="bg-gradient-to-r from-purple-900/30 to-pink-900/30 border-b border-white/10">
                <CardTitle className="flex items-center gap-3 text-purple-200">
                  <div className="w-10 h-10 bg-gradient-to-br from-purple-500/40 to-pink-500/40 rounded-xl flex items-center justify-center shadow-lg shadow-purple-500/20 border border-purple-400/30">
                    <ClipboardList className="w-5 h-5 text-purple-300" />
                  </div>
                  今日考勤记录
                </CardTitle>
                <CardDescription className="text-purple-300/50">查看学生的考勤情况</CardDescription>
              </CardHeader>
              <CardContent className="p-6">
                {attendances.length === 0 ? (
                  <div className="text-center py-12 text-white/30">
                    <ClipboardList className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>暂无考勤记录</p>
                    <p className="text-sm mt-2">学生完成打卡后将在此显示</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-gray-50">
                        <TableHead className="font-semibold text-white/60">时间</TableHead>
                        <TableHead className="font-semibold text-white/60">学生</TableHead>
                        <TableHead className="font-semibold text-white/60">考勤类型</TableHead>
                        <TableHead className="font-semibold text-white/60">验证方式</TableHead>
                        <TableHead className="font-semibold text-white/60">定位</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {attendances.map((att) => (
                        <TableRow key={att.id} className="hover:bg-white/5 transition-colors border-white/5">
                          <TableCell className="flex items-center gap-2">
                            <Clock className="w-4 h-4 text-purple-400/60" />
                            <span className="font-mono text-white/60">{format(new Date(att.timestamp), 'HH:mm:ss')}</span>
                          </TableCell>
                          <TableCell className="font-medium text-white">{att.studentName}</TableCell>
                          <TableCell>
                            <Badge className={`${ATTENDANCE_COLORS[att.type as keyof typeof ATTENDANCE_COLORS]} border-0`}>
                              {ATTENDANCE_LABELS[att.type as keyof typeof ATTENDANCE_LABELS]}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <span className="text-sm text-white/50 bg-white/5 border border-white/10 px-3 py-1 rounded-full">
                              {att.method === 'face' ? '人脸' : att.method}
                            </span>
                          </TableCell>
                          <TableCell>
                            {att.latitude && att.longitude ? (
                              <span className="inline-flex items-center gap-1 text-xs text-emerald-300/70 bg-emerald-500/10 border border-emerald-500/20 px-2 py-1 rounded-full">
                                <MapPin className="w-3 h-3" />
                                {Math.abs(att.latitude).toFixed(4)}°{att.latitude >= 0 ? 'N' : 'S'}
                              </span>
                            ) : (
                              <span className="text-xs text-white/20">—</span>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* 数据统计 */}
          <TabsContent value="stats" className="mt-8">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <Card className="shadow-2xl border-0 overflow-hidden hover:shadow-purple-500/10 transition-all duration-300 bg-white/5 backdrop-blur-xl border border-white/10">
                <div className="h-1.5 bg-gradient-to-r from-blue-400 to-indigo-400" />
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-white/40 font-medium">班级数量</p>
                      <p className="text-4xl font-bold text-blue-400 mt-1">{classes.length}</p>
                    </div>
                    <div className="w-16 h-16 bg-gradient-to-br from-blue-500/20 to-indigo-500/20 rounded-2xl flex items-center justify-center border border-blue-400/20">
                      <GraduationCap className="w-8 h-8 text-blue-400" />
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className="shadow-2xl border-0 overflow-hidden hover:shadow-green-500/10 transition-all duration-300 bg-white/5 backdrop-blur-xl border border-white/10">
                <div className="h-1.5 bg-gradient-to-r from-green-400 to-emerald-400" />
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-white/40 font-medium">学生总数</p>
                      <p className="text-4xl font-bold text-green-400 mt-1">{students.length}</p>
                    </div>
                    <div className="w-16 h-16 bg-gradient-to-br from-green-500/20 to-emerald-500/20 rounded-2xl flex items-center justify-center border border-green-400/20">
                      <Users className="w-8 h-8 text-green-400" />
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className="shadow-2xl border-0 overflow-hidden hover:shadow-emerald-500/10 transition-all duration-300 bg-white/5 backdrop-blur-xl border border-white/10">
                <div className="h-1.5 bg-gradient-to-r from-emerald-400 to-teal-400" />
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-white/40 font-medium">今日签到</p>
                      <p className="text-4xl font-bold text-emerald-400 mt-1">
                        {attendances.filter(a => a.type === 'check_in').length}
                      </p>
                    </div>
                    <div className="w-16 h-16 bg-gradient-to-br from-emerald-500/20 to-teal-500/20 rounded-2xl flex items-center justify-center border border-emerald-400/20">
                      <CheckCircle2 className="w-8 h-8 text-emerald-400" />
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className="shadow-2xl border-0 overflow-hidden hover:shadow-amber-500/10 transition-all duration-300 bg-white/5 backdrop-blur-xl border border-white/10">
                <div className="h-1.5 bg-gradient-to-r from-yellow-400 to-orange-400" />
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-white/40 font-medium">请假/外出</p>
                      <p className="text-4xl font-bold text-amber-400 mt-1">
                        {attendances.filter(a => a.type === 'leave' || a.type === 'go_out').length}
                      </p>
                    </div>
                    <div className="w-16 h-16 bg-gradient-to-br from-yellow-500/20 to-orange-500/20 rounded-2xl flex items-center justify-center border border-amber-400/20">
                      <CalendarX className="w-8 h-8 text-amber-400" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* 各班考勤情况 */}
            <Card className="mt-8 shadow-2xl border-0 overflow-hidden bg-white/5 backdrop-blur-xl border border-white/10">
              <div className="h-2 bg-gradient-to-r from-pink-400 via-rose-400 to-red-400" />
              <CardHeader className="bg-gradient-to-r from-pink-900/20 to-rose-900/20 border-b border-white/10">
                <CardTitle className="flex items-center gap-3 text-rose-300">
                  <div className="w-10 h-10 bg-gradient-to-br from-pink-500/40 to-rose-500/40 rounded-xl flex items-center justify-center shadow-lg shadow-pink-500/20 border border-pink-400/30">
                    <BarChart3 className="w-5 h-5 text-pink-300" />
                  </div>
                  班级考勤详情
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-5">
                  {classes.map((cls) => {
                    const classStudents = getClassStudents(cls.id);
                    const classAttendances = attendances.filter(a => 
                      classStudents.some(s => s.name === a.studentName)
                    );
                    const rate = classStudents.length > 0 
                      ? (classAttendances.filter(a => a.type === 'check_in').length / classStudents.length) * 100 
                      : 0;
                    return (
                      <div key={cls.id} className="p-5 bg-white/5 rounded-2xl hover:bg-white/10 transition-all duration-300 border border-white/5">
                        <div className="flex items-center justify-between mb-4">
                          <h3 className="font-bold flex items-center gap-3 text-white">
                            <div className="w-10 h-10 bg-gradient-to-br from-pink-500/20 to-rose-500/20 rounded-xl flex items-center justify-center border border-pink-400/20">
                              <GraduationCap className="w-5 h-5 text-pink-400" />
                            </div>
                            {cls.name}
                          </h3>
                          <span className="text-sm font-medium text-white/40">
                            <span className="text-green-400 font-bold">{classAttendances.filter(a => a.type === 'check_in').length}</span>
                            {' / '}
                            {classStudents.length}
                            {' '}已签到
                          </span>
                        </div>
                        <div className="relative h-3 bg-white/10 rounded-full overflow-hidden">
                          <div 
                            className="absolute inset-y-0 left-0 bg-gradient-to-r from-green-400 to-emerald-500 rounded-full transition-all duration-500 shadow-lg shadow-green-500/30"
                            style={{ width: `${rate}%` }}
                          />
                        </div>
                        <div className="flex justify-end mt-2">
                          <span className="text-sm font-bold text-green-400">{Math.round(rate)}% 出勤率</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* 请假审批 */}
          <TabsContent value="leave" className="mt-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <LeaveApprovalPanel />
              <LeaveHistoryPanel />
            </div>
          </TabsContent>

          {/* 成绩管理 */}
          <TabsContent value="grades" className="mt-8">
            <GradeManagementPanel />
          </TabsContent>

          {/* 消息中心 */}
          <TabsContent value="messages" className="mt-8">
            <MessageSystem userId={user?.id || 'teacher'} userRole="teacher" />
          </TabsContent>

          {/* 家校沟通 */}
          <TabsContent value="parentMsg" className="mt-8">
            <Card className="shadow-2xl border-0 overflow-hidden bg-white/5 backdrop-blur-xl border border-white/10">
              <div className="h-2 bg-gradient-to-r from-teal-400 via-cyan-400 to-sky-400" />
              <CardHeader className="bg-gradient-to-r from-teal-900/30 to-cyan-900/30 border-b border-white/10">
                <CardTitle className="flex items-center gap-3 text-teal-200">
                  <div className="w-10 h-10 bg-gradient-to-br from-teal-500/40 to-cyan-500/40 rounded-xl flex items-center justify-center shadow-lg shadow-teal-500/20 border border-teal-400/30">
                    <Users className="w-5 h-5 text-teal-300" />
                  </div>
                  家校沟通
                  <Badge className="bg-teal-500/20 text-teal-300 border-teal-400/30">与家长对话</Badge>
                </CardTitle>
                <CardDescription className="text-white/40">与家长进行一对一沟通，了解学生在家学习情况</CardDescription>
              </CardHeader>
              <CardContent className="p-6">
                <ParentTeacherMessage userId={user?.id || 'teacher'} userName={user?.name || '教师'} userRole="teacher" />
              </CardContent>
            </Card>
          </TabsContent>

          {/* 班级相册 */}
          <TabsContent value="media" className="mt-8">
            <MediaGallery userRole="teacher" userId={user?.id || 'teacher'} userName={user?.name || '教师'} />
          </TabsContent>

          {/* 数据看板 */}
          <TabsContent value="dashboard" className="mt-8">
            <div className="mb-4 flex items-center gap-3">
              <label className="text-sm text-white/50">当前班级:</label>
              <select
                value={selectedClass?.id || ''}
                onChange={e => { const cls = classes.find(c => c.id === e.target.value); if (cls) setSelectedClass(cls); }}
                className="px-3 py-1.5 rounded-lg bg-[#1a1a3e] border border-white/10 text-white text-sm"
              >
                {classes.map(cls => <option key={cls.id} value={cls.id}>{cls.name}</option>)}
              </select>
            </div>
            <TeacherDashboard classId={selectedClass?.id || classes[0]?.id || ''} teacherId={user?.id || 'teacher'} onNavigate={(tab) => {
              setActiveTab(tab);
            }} />
          </TabsContent>

          {/* 座位表 */}
          <TabsContent value="seats" className="mt-8">
            <div className="mb-4 flex items-center gap-3">
              <label className="text-sm text-white/50">当前班级:</label>
              <select
                value={selectedClass?.id || ''}
                onChange={e => { const cls = classes.find(c => c.id === e.target.value); if (cls) setSelectedClass(cls); }}
                className="px-3 py-1.5 rounded-lg bg-[#1a1a3e] border border-white/10 text-white text-sm"
              >
                {classes.map(cls => <option key={cls.id} value={cls.id}>{cls.name}</option>)}
              </select>
            </div>
            <SeatManager classId={selectedClass?.id || classes[0]?.id || ''} />
          </TabsContent>

          {/* 值日安排 */}
          <TabsContent value="duty" className="mt-8">
            <div className="mb-4 flex items-center gap-3">
              <label className="text-sm text-white/50">当前班级:</label>
              <select
                value={selectedClass?.id || ''}
                onChange={e => { const cls = classes.find(c => c.id === e.target.value); if (cls) setSelectedClass(cls); }}
                className="px-3 py-1.5 rounded-lg bg-[#1a1a3e] border border-white/10 text-white text-sm"
              >
                {classes.map(cls => <option key={cls.id} value={cls.id}>{cls.name}</option>)}
              </select>
            </div>
            <DutySchedulePanel classId={selectedClass?.id || classes[0]?.id || ''} />
          </TabsContent>

          {/* 课堂表现 */}
          <TabsContent value="performance" className="mt-8">
            <div className="mb-4 flex items-center gap-3">
              <label className="text-sm text-white/50">当前班级:</label>
              <select
                value={selectedClass?.id || ''}
                onChange={e => { const cls = classes.find(c => c.id === e.target.value); if (cls) setSelectedClass(cls); }}
                className="px-3 py-1.5 rounded-lg bg-[#1a1a3e] border border-white/10 text-white text-sm"
              >
                {classes.map(cls => <option key={cls.id} value={cls.id}>{cls.name}</option>)}
              </select>
            </div>
            <ClassPerformancePanel classId={selectedClass?.id || classes[0]?.id || ''} />
          </TabsContent>

          {/* 考勤热力图 */}
          <TabsContent value="heatmap" className="mt-8">
            <div className="mb-4 flex items-center gap-3">
              <label className="text-sm text-white/50">当前班级:</label>
              <select
                value={selectedClass?.id || ''}
                onChange={e => { const cls = classes.find(c => c.id === e.target.value); if (cls) setSelectedClass(cls); }}
                className="px-3 py-1.5 rounded-lg bg-[#1a1a3e] border border-white/10 text-white text-sm"
              >
                {classes.map(cls => <option key={cls.id} value={cls.id}>{cls.name}</option>)}
              </select>
            </div>
            <AttendanceHeatmap classId={selectedClass?.id || classes[0]?.id || ''} />
          </TabsContent>

          {/* 积分奖励 */}
          <TabsContent value="points" className="mt-8">
            <PointsPanel classId={selectedClass?.id || classes[0]?.id || ''} />
          </TabsContent>

          {/* 安全设置 */}
          <TabsContent value="settings" className="mt-8">
            <div className="space-y-6">
              {/* 快速操作 */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card 
                  className="cursor-pointer hover:scale-[1.02] transition-all duration-300 bg-white/5 backdrop-blur-xl border border-white/10 hover:border-blue-400/30 hover:shadow-lg hover:shadow-blue-500/10"
                  onClick={() => setShowPasswordModal(true)}
                >
                  <CardContent className="p-6 flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center border border-blue-400/20">
                      <Shield className="w-6 h-6 text-blue-400" />
                    </div>
                    <div>
                      <div className="font-medium text-white">修改密码</div>
                      <div className="text-sm text-white/40">更新您的账户密码</div>
                    </div>
                  </CardContent>
                </Card>
                
                <Card 
                  className="cursor-pointer hover:scale-[1.02] transition-all duration-300 bg-white/5 backdrop-blur-xl border border-white/10 hover:border-green-400/30 hover:shadow-lg hover:shadow-green-500/10"
                  onClick={() => setSettingsTab('logs')}
                >
                  <CardContent className="p-6 flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-green-500/20 flex items-center justify-center border border-green-400/20">
                      <History className="w-6 h-6 text-green-400" />
                    </div>
                    <div>
                      <div className="font-medium text-white">登录日志</div>
                      <div className="text-sm text-white/40">查看账户安全记录</div>
                    </div>
                  </CardContent>
                </Card>
                
                <Card 
                  className="cursor-pointer hover:scale-[1.02] transition-all duration-300 bg-white/5 backdrop-blur-xl border border-white/10 hover:border-purple-400/30 hover:shadow-lg hover:shadow-purple-500/10"
                  onClick={() => setSettingsTab('export')}
                >
                  <CardContent className="p-6 flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-purple-500/20 flex items-center justify-center border border-purple-400/20">
                      <FileSpreadsheet className="w-6 h-6 text-purple-400" />
                    </div>
                    <div>
                      <div className="font-medium text-white">数据导出</div>
                      <div className="text-sm text-white/40">导出考勤记录和学生信息</div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* 云端同步 */}
              <Card className="bg-white/5 backdrop-blur-xl border border-white/10">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <Cloud className="w-5 h-5 text-cyan-400" />
                    云端同步
                  </CardTitle>
                  <CardDescription className="text-white/40">在不同设备间同步您的数据</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-3">
                    <Button
                      onClick={handleSyncToCloud}
                      disabled={syncStatus === 'syncing'}
                      className="bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white"
                    >
                      <RefreshCw className={`w-4 h-4 mr-2 ${syncStatus === 'syncing' ? 'animate-spin' : ''}`} />
                      {syncStatus === 'syncing' ? '同步中...' : '上传到云端'}
                    </Button>
                    <Button
                      onClick={handleSyncFromCloud}
                      disabled={syncStatus === 'syncing'}
                      variant="outline"
                      className="border-white/20 text-white/70 hover:bg-white/10 hover:text-white"
                    >
                      <Cloud className="w-4 h-4 mr-2" />
                      从云端拉取
                    </Button>
                    {syncStatus === 'success' && (
                      <span className="text-green-400 text-sm flex items-center gap-1">
                        <CheckCircle2 className="w-4 h-4" /> 同步成功
                      </span>
                    )}
                    {syncStatus === 'error' && (
                      <span className="text-red-400 text-sm flex items-center gap-1">
                        <CloudOff className="w-4 h-4" /> 同步失败
                      </span>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* 子内容 */}
              {settingsTab === 'logs' && <LoginLogsPanel />}
              {settingsTab === 'export' && <DataExportPanel />}
            </div>
          </TabsContent>
        </Tabs>
      </div>
      
      {/* 弹窗 */}
      {showPasswordModal && (
        <ChangePasswordModal onClose={() => setShowPasswordModal(false)} />
      )}
      
      {/* AI 助手 */}
      <AIAssistant />
    </div>
  );
}
