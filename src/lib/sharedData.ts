import { AttendanceType, Student, UserRole, GradeRecord, MessageRecord, MediaRecord, ParentInfo, SeatLayout, SeatAssignment, DutySchedule, ClassPerformance, MediaComment, PointRecord, Announcement } from '@/types/attendance';

// Re-export types for external use
export type { SeatAssignment, DutySchedule, ClassPerformance, SeatLayout, MediaComment, PointRecord, Announcement };

// 考勤记录类型
export interface SharedAttendanceRecord {
  id: string;
  studentId: string;
  studentName: string;
  classId: string;
  type: AttendanceType;
  timestamp: string;
  method: 'face' | 'voice' | 'both';
  verified: boolean;
  // 定位信息
  latitude?: number;
  longitude?: number;
  locationAccuracy?: number;    // 定位精度(米)
  locationAddress?: string;     // 逆地理编码地址(可选)
}

// 共享数据存储的 key
const SHARED_CLASSES_KEY = 'shared_classes';
const SHARED_STUDENTS_KEY = 'shared_students';
const SHARED_ATTENDANCE_KEY = 'shared_attendance';
const SHARED_TIMETABLE_KEY = 'shared_timetable';
const SHARED_ANNOUNCEMENTS_KEY = 'shared_announcements';
const CURRENT_USER_KEY = 'user';

// 新增存储 key
const MEDIA_COMMENTS_KEY = 'media_comments';
const POINT_RECORDS_KEY = 'point_records';

// 生物识别特征存储的 key
const FACE_DESCRIPTORS_KEY = 'face_descriptors';
const VOICE_DESCRIPTORS_KEY = 'voice_descriptors';

// 人脸特征数据结构
export interface FaceDescriptorData {
  studentId: string;
  username: string;
  name: string;
  descriptor: number[]; // 128维人脸特征向量
  registeredAt: string;
}

// 声纹特征数据结构
export interface VoiceDescriptorData {
  studentId: string;
  username: string;
  name: string;
  descriptor: number[]; // 声纹特征向量
  registeredAt: string;
}

// 班级类型
export interface SharedClass {
  id: string;
  name: string;
  teacherName: string;
  createdAt: string;
}

// 课程节次
export interface TimetablePeriod {
  period: number;      // 第几节课
  subject: string;    // 科目名称
  teacher?: string;   // 任课教师
}

// 课程表条目
export interface TimetableEntry {
  id: string;
  classId: string;
  dayOfWeek: number;    // 1-7 (周日到周六)
  period: number;        // 第几节课
  subject: string;       // 科目名称
  teacher: string;       // 任课教师
}

// 课程表类型
export interface SharedTimetable {
  entries: TimetableEntry[];
}

// 公告类型
export interface SharedAnnouncement {
  id: string;
  classId: string;
  title: string;
  content: string;
  author: string;
  createdAt: string;
  important: boolean;
}

// 学生类型（扩展）
export interface SharedStudent {
  id: string;
  username: string;
  name: string;
  role: UserRole;
  classId: string;
  className?: string;
  studentId?: string;
  faceRegistered: boolean;
  voiceRegistered: boolean;
  password: string;
}

// 默认班级数据
const defaultClasses: SharedClass[] = [
  { id: 'class-001', name: '初三（1）班', teacherName: '张老师', createdAt: new Date().toISOString() },
  { id: 'class-002', name: '初三（2）班', teacherName: '李老师', createdAt: new Date().toISOString() },
  { id: 'class-003', name: '初三（3）班', teacherName: '王老师', createdAt: new Date().toISOString() },
];

// 默认学生数据
const defaultStudents: SharedStudent[] = [
  { id: 'stu-001', username: 'student001', name: '李明', role: 'student', classId: 'class-001', className: '初三（1）班', studentId: '2024001', faceRegistered: true, voiceRegistered: true, password: '123456' },
  { id: 'stu-002', username: 'student002', name: '王芳', role: 'student', classId: 'class-001', className: '初三（1）班', studentId: '2024002', faceRegistered: true, voiceRegistered: false, password: '123456' },
  { id: 'stu-003', username: 'student003', name: '张伟', role: 'student', classId: 'class-001', className: '初三（1）班', studentId: '2024003', faceRegistered: false, voiceRegistered: false, password: '123456' },
  { id: 'stu-004', username: 'student004', name: '刘洋', role: 'student', classId: 'class-002', className: '初三（2）班', studentId: '2024004', faceRegistered: true, voiceRegistered: true, password: '123456' },
  { id: 'stu-005', username: 'student005', name: '陈静', role: 'student', classId: 'class-002', className: '初三（2）班', studentId: '2024005', faceRegistered: false, voiceRegistered: true, password: '123456' },
  { id: 'stu-006', username: 'student006', name: '赵强', role: 'student', classId: 'class-003', className: '初三（3）班', studentId: '2024006', faceRegistered: true, voiceRegistered: false, password: '123456' },
];

// 获取班级列表
export function getClasses(): SharedClass[] {
  if (typeof window === 'undefined') return defaultClasses;
  
  const stored = localStorage.getItem(SHARED_CLASSES_KEY);
  if (!stored) {
    // 初始化默认数据
    localStorage.setItem(SHARED_CLASSES_KEY, JSON.stringify(defaultClasses));
    return defaultClasses;
  }
  
  try {
    return JSON.parse(stored);
  } catch {
    return defaultClasses;
  }
}

// 保存班级列表
export function saveClasses(classes: SharedClass[]): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(SHARED_CLASSES_KEY, JSON.stringify(classes));
}

// 添加班级
export function addClass(name: string, teacherName: string): SharedClass {
  const classes = getClasses();
  const newClass: SharedClass = {
    id: `class-${Date.now()}`,
    name,
    teacherName,
    createdAt: new Date().toISOString(),
  };
  classes.push(newClass);
  saveClasses(classes);
  return newClass;
}

// 删除班级
export function deleteClass(classId: string): void {
  const classes = getClasses().filter(c => c.id !== classId);
  saveClasses(classes);
  // 同时删除该班级下的学生
  const students = getStudents().filter(s => s.classId !== classId);
  saveStudents(students);
}

// 获取学生列表
export function getStudents(): SharedStudent[] {
  if (typeof window === 'undefined') return defaultStudents;
  
  const stored = localStorage.getItem(SHARED_STUDENTS_KEY);
  console.log('[getStudents] 从 localStorage 读取，原始数据:', stored);
  if (!stored) {
    // 初始化默认数据
    console.log('[getStudents] localStorage 为空，初始化默认数据');
    localStorage.setItem(SHARED_STUDENTS_KEY, JSON.stringify(defaultStudents));
    return defaultStudents;
  }
  
  try {
    const parsed = JSON.parse(stored);
    console.log('[getStudents] 解析后的学生列表:', parsed.map((s: any) => s.username));
    return parsed;
  } catch (e) {
    console.error('[getStudents] 解析失败:', e);
    return defaultStudents;
  }
}

/** 获取已知的教师用户列表（从消息历史中提取，由 syncOnLogin 维护） */
export function getTeacherUsers(): { id: string; name: string }[] {
  if (typeof window === 'undefined') return [];
  try {
    const stored = localStorage.getItem('shared_teacher_users');
    if (!stored) return [];
    return JSON.parse(stored);
  } catch {
    return [];
  }
}

// 保存学生列表
export function saveStudents(students: SharedStudent[]): void {
  if (typeof window === 'undefined') return;
  console.log('[saveStudents] 保存学生列表:', students.map(s => s.username));
  localStorage.setItem(SHARED_STUDENTS_KEY, JSON.stringify(students));
  // 验证保存
  const stored = localStorage.getItem(SHARED_STUDENTS_KEY);
  console.log('[saveStudents] 验证保存，localStorage 内容:', stored);
}

// 添加学生
export function addStudent(student: Omit<SharedStudent, 'id' | 'faceRegistered' | 'voiceRegistered'>): SharedStudent {
  const students = getStudents();
  const classInfo = getClasses().find(c => c.id === student.classId);
  const newStudent: SharedStudent = {
    ...student,
    id: `stu-${Date.now()}`,
    className: classInfo?.name || '未知班级',
    faceRegistered: false,
    voiceRegistered: false,
  };
  students.push(newStudent);
  saveStudents(students);
  return newStudent;
}

// 更新学生信息
export function updateStudent(studentId: string, updates: Partial<SharedStudent>): SharedStudent | null {
  const students = getStudents();
  const index = students.findIndex(s => s.id === studentId);
  if (index === -1) return null;
  
  students[index] = { ...students[index], ...updates };
  saveStudents(students);
  return students[index];
}

// 通过用户名更新学生信息（用于学生端修改个人信息）
export function updateStudentInSharedData(username: string, updates: { name?: string; classId?: string; className?: string; studentId?: string; password?: string }): SharedStudent | null {
  const students = getStudents();
  const index = students.findIndex(s => s.username === username);
  if (index === -1) return null;
  
  const oldClassId = students[index].classId;
  
  // 更新学生信息
  students[index] = { ...students[index], ...updates };
  
  // 如果班级变更，更新班级名称
  if (updates.classId && updates.classId !== oldClassId) {
    const classes = getClasses();
    const newClass = classes.find(c => c.id === updates.classId);
    if (newClass) {
      students[index].className = newClass.name;
    }
  }
  
  saveStudents(students);
  return students[index];
}

// 更新学生的人脸/声纹注册状态（用于考勤打卡成功后）
export function updateStudentRegistration(username: string, type: 'face' | 'voice'): boolean {
  const students = getStudents();
  
  // 尝试通过 username 查找
  let index = students.findIndex(s => s.username === username);
  
  // 如果没找到，尝试通过 id 查找（id 格式：stu-时间戳 或 user-时间戳）
  if (index === -1 && username.startsWith('stu-')) {
    index = students.findIndex(s => s.id === username);
  }
  if (index === -1 && username.startsWith('user-')) {
    index = students.findIndex(s => s.id === username);
  }
  
  // 如果还没找到，尝试通过 name 查找（姓名匹配）
  if (index === -1) {
    index = students.findIndex(s => s.name === username);
  }
  
  // 如果还是没找到，尝试模糊匹配（用户名包含输入的字符串）
  if (index === -1) {
    index = students.findIndex(s => 
      s.username?.includes(username) || 
      s.name?.includes(username) ||
      username.includes(s.username || '') ||
      username.includes(s.name || '')
    );
  }
  
  if (index === -1) {
    console.error(`[updateStudentRegistration] 未找到学生: ${username}`);
    console.error(`[updateStudentRegistration] 可用的学生列表:`, students.map(s => ({ username: s.username, id: s.id, name: s.name })));
    return false;
  }
  
  console.log(`[updateStudentRegistration] 找到学生: ${students[index].name} (${students[index].username}), 索引: ${index}`);
  
  if (type === 'face') {
    students[index].faceRegistered = true;
    console.log(`[updateStudentRegistration] 设置 faceRegistered = true`);
  } else {
    students[index].voiceRegistered = true;
    console.log(`[updateStudentRegistration] 设置 voiceRegistered = true`);
  }
  
  saveStudents(students);
  console.log(`[updateStudentRegistration] 已保存到 localStorage`);
  
  return true;
}

// 通过 ID 更新学生的人脸/声纹注册状态
export function updateStudentRegistrationById(studentId: string, type: 'face' | 'voice'): boolean {
  const students = getStudents();
  const index = students.findIndex(s => s.id === studentId);
  
  if (index === -1) {
    console.error(`[updateStudentRegistrationById] 未找到学生ID: ${studentId}`);
    console.error(`[updateStudentRegistrationById] 可用的学生ID列表:`, students.map(s => s.id));
    return false;
  }
  
  console.log(`[updateStudentRegistrationById] 找到学生: ${students[index].name} (${students[index].username}), ID: ${studentId}`);
  
  if (type === 'face') {
    students[index].faceRegistered = true;
  } else {
    students[index].voiceRegistered = true;
  }
  
  saveStudents(students);
  
  return true;
}

// 删除学生
export function deleteStudent(studentId: string): void {
  const students = getStudents().filter(s => s.id !== studentId);
  saveStudents(students);
  // 同时删除该学生的人脸和声纹描述符
  removeFaceDescriptor(studentId);
  removeVoiceDescriptor(studentId);
}

// 获取班级的学生数量
export function getClassStudentCount(classId: string): number {
  return getStudents().filter(s => s.classId === classId).length;
}

// 获取班级的已签到人数（从实际考勤记录统计）
export function getClassCheckedInCount(classId: string): number {
  const todayRecords = getTodayAttendanceRecords();
  // 统计今日该班级中已签到（不含请假、外出）的人数
  const checkedInStudentIds = new Set(
    todayRecords
      .filter(r => r.type === 'check_in' || r.type === 'check_out')
      .map(r => r.studentId)
  );
  
  // 获取班级中学生中已签到的人数
  const classStudentIds = getStudents()
    .filter(s => s.classId === classId)
    .map(s => s.id);
  
  return classStudentIds.filter(id => checkedInStudentIds.has(id)).length;
}

// 获取当前登录用户
export function getCurrentUser(): { id: string; username: string; name: string; role: UserRole; classId?: string; className?: string; childId?: string; childName?: string } | null {
  if (typeof window === 'undefined') return null;
  
  const stored = localStorage.getItem(CURRENT_USER_KEY);
  if (!stored) return null;
  
  try {
    return JSON.parse(stored);
  } catch {
    return null;
  }
}

// 更新当前用户信息
export function updateCurrentUser(updates: { name?: string; classId?: string; className?: string; studentId?: string }): void {
  if (typeof window === 'undefined') return;
  
  const currentUser = getCurrentUser();
  if (!currentUser) return;
  
  const updatedUser = { ...currentUser, ...updates };
  localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(updatedUser));
  
  // 如果是学生，也更新学生列表中的信息
  if (currentUser.role === 'student') {
    updateStudentInSharedData(currentUser.username, updates);
  }
}

// 验证用户登录
export function validateLogin(username: string, password: string): { id: string; username: string; name: string; role: UserRole; classId?: string; className?: string } | null {
  // 检查是否是教师
  if (username === 'teacher001' && password === '123456') {
    const teacher = { id: 'teacher-001', username: 'teacher001', name: '张老师', role: 'teacher' as UserRole };
    localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(teacher));
    return teacher;
  }
  
  // 检查学生列表
  const students = getStudents();
  const student = students.find(s => s.username === username && s.password === password);
  
  if (student) {
    const user = {
      id: student.id,
      username: student.username,
      name: student.name,
      role: student.role as UserRole,
      classId: student.classId,
      className: student.className,
    };
    localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(user));
    return user;
  }
  
  return null;
}

// 注册新用户
export function registerUser(username: string, password: string, name: string, role: UserRole, classId?: string): boolean {
  const students = getStudents();
  
  // 检查用户名是否已存在
  if (students.some(s => s.username === username)) {
    return false;
  }
  
  // 添加新学生
  const classInfo = classId ? getClasses().find(c => c.id === classId) : undefined;
  const newStudent: SharedStudent = {
    id: `stu-${Date.now()}`,
    username,
    password,
    name,
    role,
    classId: classId || 'class-001',
    className: classInfo?.name || '默认班级',
    faceRegistered: false,
    voiceRegistered: false,
  };
  
  students.push(newStudent);
  saveStudents(students);
  return true;
}

// 重置所有数据（用于测试）
export function resetAllData(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(SHARED_CLASSES_KEY);
  localStorage.removeItem(SHARED_STUDENTS_KEY);
  localStorage.removeItem(SHARED_ATTENDANCE_KEY);
  localStorage.removeItem(CURRENT_USER_KEY);
}

// ============ 考勤记录管理 ============

// 获取考勤记录列表
export function getAttendanceRecords(): SharedAttendanceRecord[] {
  if (typeof window === 'undefined') return [];
  
  const stored = localStorage.getItem(SHARED_ATTENDANCE_KEY);
  if (!stored) return [];
  
  try {
    return JSON.parse(stored);
  } catch {
    return [];
  }
}

// 保存考勤记录
export function saveAttendanceRecord(record: SharedAttendanceRecord): void {
  if (typeof window === 'undefined') return;
  
  const records = getAttendanceRecords();
  records.unshift(record); // 添加到开头
  localStorage.setItem(SHARED_ATTENDANCE_KEY, JSON.stringify(records));
}

// 获取班级的考勤记录
export function getClassAttendanceRecords(classId: string): SharedAttendanceRecord[] {
  return getAttendanceRecords().filter(r => r.classId === classId);
}

// 获取学生的考勤记录
export function getStudentAttendanceRecords(studentId: string): SharedAttendanceRecord[] {
  return getAttendanceRecords().filter(r => r.studentId === studentId);
}

// 获取今日考勤记录
export function getTodayAttendanceRecords(): SharedAttendanceRecord[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  return getAttendanceRecords().filter(r => {
    const recordDate = new Date(r.timestamp);
    recordDate.setHours(0, 0, 0, 0);
    return recordDate.getTime() === today.getTime();
  });
}

// 更新学生的注册状态
export function updateStudentRegistrationStatus(
  studentId: string, 
  updates: { faceRegistered?: boolean; voiceRegistered?: boolean }
): void {
  updateStudent(studentId, updates);
}

// ============ 课程表管理 ============

// 初始化默认课程表数据
function initDefaultTimetable(): SharedTimetable {
  // 使用 TimetableEntry 格式的数组
  const entries: TimetableEntry[] = [
    // 初三(1)班 - 周一
    { id: 'tt-1-1-1', classId: 'class-001', dayOfWeek: 1, period: 1, subject: '语文', teacher: '张老师' },
    { id: 'tt-1-1-2', classId: 'class-001', dayOfWeek: 1, period: 2, subject: '数学', teacher: '李老师' },
    { id: 'tt-1-1-3', classId: 'class-001', dayOfWeek: 1, period: 3, subject: '英语', teacher: '王老师' },
    { id: 'tt-1-1-4', classId: 'class-001', dayOfWeek: 1, period: 4, subject: '物理', teacher: '赵老师' },
    // 初三(1)班 - 周二
    { id: 'tt-1-2-1', classId: 'class-001', dayOfWeek: 2, period: 1, subject: '数学', teacher: '李老师' },
    { id: 'tt-1-2-2', classId: 'class-001', dayOfWeek: 2, period: 2, subject: '语文', teacher: '张老师' },
    { id: 'tt-1-2-3', classId: 'class-001', dayOfWeek: 2, period: 3, subject: '物理', teacher: '赵老师' },
    { id: 'tt-1-2-4', classId: 'class-001', dayOfWeek: 2, period: 4, subject: '英语', teacher: '王老师' },
    // 初三(1)班 - 周三
    { id: 'tt-1-3-1', classId: 'class-001', dayOfWeek: 3, period: 1, subject: '英语', teacher: '王老师' },
    { id: 'tt-1-3-2', classId: 'class-001', dayOfWeek: 3, period: 2, subject: '物理', teacher: '赵老师' },
    { id: 'tt-1-3-3', classId: 'class-001', dayOfWeek: 3, period: 3, subject: '数学', teacher: '李老师' },
    { id: 'tt-1-3-4', classId: 'class-001', dayOfWeek: 3, period: 4, subject: '语文', teacher: '张老师' },
    // 初三(1)班 - 周四
    { id: 'tt-1-4-1', classId: 'class-001', dayOfWeek: 4, period: 1, subject: '物理', teacher: '赵老师' },
    { id: 'tt-1-4-2', classId: 'class-001', dayOfWeek: 4, period: 2, subject: '英语', teacher: '王老师' },
    { id: 'tt-1-4-3', classId: 'class-001', dayOfWeek: 4, period: 3, subject: '语文', teacher: '张老师' },
    { id: 'tt-1-4-4', classId: 'class-001', dayOfWeek: 4, period: 4, subject: '数学', teacher: '李老师' },
    // 初三(1)班 - 周五
    { id: 'tt-1-5-1', classId: 'class-001', dayOfWeek: 5, period: 1, subject: '数学', teacher: '李老师' },
    { id: 'tt-1-5-2', classId: 'class-001', dayOfWeek: 5, period: 2, subject: '英语', teacher: '王老师' },
    { id: 'tt-1-5-3', classId: 'class-001', dayOfWeek: 5, period: 3, subject: '物理', teacher: '赵老师' },
    { id: 'tt-1-5-4', classId: 'class-001', dayOfWeek: 5, period: 4, subject: '语文', teacher: '张老师' },
    // 初三(2)班 - 周一
    { id: 'tt-2-1-1', classId: 'class-002', dayOfWeek: 1, period: 1, subject: '数学', teacher: '孙老师' },
    { id: 'tt-2-1-2', classId: 'class-002', dayOfWeek: 1, period: 2, subject: '英语', teacher: '周老师' },
    { id: 'tt-2-1-3', classId: 'class-002', dayOfWeek: 1, period: 3, subject: '语文', teacher: '吴老师' },
    { id: 'tt-2-1-4', classId: 'class-002', dayOfWeek: 1, period: 4, subject: '化学', teacher: '郑老师' },
    // 初三(2)班 - 周二
    { id: 'tt-2-2-1', classId: 'class-002', dayOfWeek: 2, period: 1, subject: '英语', teacher: '周老师' },
    { id: 'tt-2-2-2', classId: 'class-002', dayOfWeek: 2, period: 2, subject: '化学', teacher: '郑老师' },
    { id: 'tt-2-2-3', classId: 'class-002', dayOfWeek: 2, period: 3, subject: '数学', teacher: '孙老师' },
    { id: 'tt-2-2-4', classId: 'class-002', dayOfWeek: 2, period: 4, subject: '语文', teacher: '吴老师' },
    // 初三(2)班 - 周三
    { id: 'tt-2-3-1', classId: 'class-002', dayOfWeek: 3, period: 1, subject: '语文', teacher: '吴老师' },
    { id: 'tt-2-3-2', classId: 'class-002', dayOfWeek: 3, period: 2, subject: '数学', teacher: '孙老师' },
    { id: 'tt-2-3-3', classId: 'class-002', dayOfWeek: 3, period: 3, subject: '化学', teacher: '郑老师' },
    { id: 'tt-2-3-4', classId: 'class-002', dayOfWeek: 3, period: 4, subject: '英语', teacher: '周老师' },
    // 初三(2)班 - 周四
    { id: 'tt-2-4-1', classId: 'class-002', dayOfWeek: 4, period: 1, subject: '化学', teacher: '郑老师' },
    { id: 'tt-2-4-2', classId: 'class-002', dayOfWeek: 4, period: 2, subject: '语文', teacher: '吴老师' },
    { id: 'tt-2-4-3', classId: 'class-002', dayOfWeek: 4, period: 3, subject: '英语', teacher: '周老师' },
    { id: 'tt-2-4-4', classId: 'class-002', dayOfWeek: 4, period: 4, subject: '数学', teacher: '孙老师' },
    // 初三(2)班 - 周五
    { id: 'tt-2-5-1', classId: 'class-002', dayOfWeek: 5, period: 1, subject: '英语', teacher: '周老师' },
    { id: 'tt-2-5-2', classId: 'class-002', dayOfWeek: 5, period: 2, subject: '数学', teacher: '孙老师' },
    { id: 'tt-2-5-3', classId: 'class-002', dayOfWeek: 5, period: 3, subject: '语文', teacher: '吴老师' },
    { id: 'tt-2-5-4', classId: 'class-002', dayOfWeek: 5, period: 4, subject: '化学', teacher: '郑老师' },
  ];
  return { entries };
}

// 获取课程表
export function getTimetable(): SharedTimetable {
  if (typeof window === 'undefined') return initDefaultTimetable();
  
  let timetable: SharedTimetable;
  const stored = localStorage.getItem(SHARED_TIMETABLE_KEY);
  
  if (stored) {
    timetable = JSON.parse(stored);
  } else {
    timetable = initDefaultTimetable();
    localStorage.setItem(SHARED_TIMETABLE_KEY, JSON.stringify(timetable));
  }
  
  return timetable;
}

// 获取班级的本周课程表
export function getClassTimetable(classId: string): TimetableEntry[] {
  const timetable = getTimetable();
  return timetable.entries
    .filter(e => e.classId === classId)
    .sort((a, b) => a.dayOfWeek - b.dayOfWeek);
}

// 获取今日课程
export function getTodayCourses(classId: string): TimetableEntry[] {
  const today = new Date().getDay();
  const adjustedDay = today === 0 ? 7 : today; // 周日转为7
  const entries = getClassTimetable(classId);
  return entries.filter(e => e.dayOfWeek === adjustedDay).sort((a, b) => a.period - b.period);
}

// 获取所有课程表条目
export function getTimetableEntries(): TimetableEntry[] {
  return getTimetable().entries;
}

// ============ 班级公告管理 ============

// 初始化默认公告数据
function initDefaultAnnouncements(): SharedAnnouncement[] {
  return [
    {
      id: 'ann-001',
      classId: 'class-001',
      title: '下周期中考试安排',
      content: '各位同学，下周一至周三将进行期中考试，请做好复习准备。考试科目依次为：语文、数学、英语。',
      author: '张老师',
      createdAt: new Date().toISOString(),
      important: true,
    },
    {
      id: 'ann-002',
      classId: 'class-001',
      title: '本周五班级大扫除',
      content: '本周五下午最后一节课进行班级大扫除，请同学们自带抹布和清洁工具。',
      author: '王老师',
      createdAt: new Date().toISOString(),
      important: false,
    },
    {
      id: 'ann-003',
      classId: 'class-001',
      title: '春季运动会报名通知',
      content: '学校将于下月举办春季运动会，现开始接受报名。有兴趣的同学请到体育委员处报名。',
      author: '赵老师',
      createdAt: new Date().toISOString(),
      important: false,
    },
    {
      id: 'ann-004',
      classId: 'class-002',
      title: '家长会通知',
      content: '本周六上午9点将召开家长会，请各位家长准时参加。',
      author: '刘老师',
      createdAt: new Date().toISOString(),
      important: true,
    },
  ];
}

// 获取所有公告
export function getAnnouncements(): SharedAnnouncement[] {
  if (typeof window === 'undefined') return initDefaultAnnouncements();
  
  let announcements: SharedAnnouncement[];
  const stored = localStorage.getItem(SHARED_ANNOUNCEMENTS_KEY);
  
  if (stored) {
    announcements = JSON.parse(stored);
  } else {
    announcements = initDefaultAnnouncements();
    localStorage.setItem(SHARED_ANNOUNCEMENTS_KEY, JSON.stringify(announcements));
  }
  
  return announcements;
}

// 获取班级的公告
export function getClassAnnouncements(classId: string): SharedAnnouncement[] {
  return getAnnouncements()
    .filter(a => a.classId === classId)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

// 获取最新的公告
export function getLatestAnnouncements(limit: number = 5): SharedAnnouncement[] {
  return getAnnouncements()
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, limit);
}

// 添加公告
export function addAnnouncement(announcement: Omit<SharedAnnouncement, 'id' | 'createdAt'>): void {
  const announcements = getAnnouncements();
  const newAnnouncement: SharedAnnouncement = {
    ...announcement,
    id: `ann-${Date.now()}`,
    createdAt: new Date().toISOString(),
  };
  announcements.push(newAnnouncement);
  localStorage.setItem(SHARED_ANNOUNCEMENTS_KEY, JSON.stringify(announcements));
}

// 删除公告
export function deleteAnnouncement(id: string): void {
  const announcements = getAnnouncements().filter(a => a.id !== id);
  localStorage.setItem(SHARED_ANNOUNCEMENTS_KEY, JSON.stringify(announcements));
}

// ============ 考勤统计辅助函数 ============

// 获取考勤统计数据
export function getAttendanceStats(classId: string): {
  shouldAttend: number;
  actualAttend: number;
  attendanceRate: number;
  lateCount: number;
} {
  const students = getStudents().filter(s => s.classId === classId);
  const shouldAttend = students.length;
  const todayRecords = getTodayAttendanceRecords().filter(r => r.classId === classId);
  
  // 已签到（不含请假、外出）
  const checkedIn = new Set(
    todayRecords
      .filter(r => r.type === 'check_in' || r.type === 'check_out')
      .map(r => r.studentId)
  );
  
  // 迟到人数
  const lateRecords = todayRecords.filter(r => {
    const hour = new Date(r.timestamp).getHours();
    return (r.type === 'check_in' && hour >= 8);
  });
  const lateCount = lateRecords.length;
  
  const actualAttend = checkedIn.size;
  const attendanceRate = shouldAttend > 0 ? Math.round((actualAttend / shouldAttend) * 100) : 0;
  
  return { shouldAttend, actualAttend, attendanceRate, lateCount };
}

// ============ 课程表管理函数 ============

// 添加课程表条目
export function addTimetableEntry(entry: Omit<TimetableEntry, 'id'>): void {
  const timetable = getTimetable();
  const newEntry: TimetableEntry = {
    ...entry,
    id: `tt-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  };
  timetable.entries.push(newEntry);
  localStorage.setItem(SHARED_TIMETABLE_KEY, JSON.stringify(timetable));
}

// 更新课程表条目
export function updateTimetableEntry(id: string, updates: Partial<Omit<TimetableEntry, 'id'>>): void {
  const timetable = getTimetable();
  const index = timetable.entries.findIndex(e => e.id === id);
  if (index !== -1) {
    timetable.entries[index] = { ...timetable.entries[index], ...updates };
    localStorage.setItem(SHARED_TIMETABLE_KEY, JSON.stringify(timetable));
  }
}

// ============ 请假申请管理 ============
export function deleteTimetableEntry(id: string): void {
  const timetable = getTimetable();
  timetable.entries = timetable.entries.filter(e => e.id !== id);
  localStorage.setItem(SHARED_TIMETABLE_KEY, JSON.stringify(timetable));
}

// 获取班级的课程表
export function getClassTimetableByDay(classId: string, day: number): TimetableEntry[] {
  const entries = getTimetableEntries();
  return entries.filter(e => e.classId === classId && e.dayOfWeek === day)
    .sort((a, b) => a.period - b.period);
}

// ============ 公告管理函数 ============

// 更新公告
export function updateAnnouncement(id: string, updates: Partial<Omit<SharedAnnouncement, 'id' | 'createdAt'>>): void {
  const announcements = getAnnouncements();
  const index = announcements.findIndex(a => a.id === id);
  if (index !== -1) {
    announcements[index] = { ...announcements[index], ...updates };
    localStorage.setItem(SHARED_ANNOUNCEMENTS_KEY, JSON.stringify(announcements));
  }
}

// ============ 请假申请管理 ============

// 请假申请类型
export interface LeaveRequest {
  id: string;
  studentId: string;
  studentName: string;
  classId: string;
  className: string;
  type: 'leave' | 'go_out'; // 请假 或 外出
  reason: string;
  startDate: string; // 开始日期
  endDate: string; // 结束日期
  status: 'pending' | 'approved' | 'rejected'; // 待审批、已通过、已拒绝
  teacherReply?: string; // 教师回复
  createdAt: string;
  updatedAt: string;
}

const SHARED_LEAVE_REQUESTS_KEY = 'shared_leave_requests';

// 获取请假申请列表
export function getLeaveRequests(): LeaveRequest[] {
  if (typeof window === 'undefined') return [];
  
  const stored = localStorage.getItem(SHARED_LEAVE_REQUESTS_KEY);
  if (!stored) return [];
  
  try {
    return JSON.parse(stored);
  } catch {
    return [];
  }
}

// 保存请假申请列表
function saveLeaveRequests(requests: LeaveRequest[]): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(SHARED_LEAVE_REQUESTS_KEY, JSON.stringify(requests));
}

// 提交请假申请
export function submitLeaveRequest(request: Omit<LeaveRequest, 'id' | 'status' | 'createdAt' | 'updatedAt' | 'teacherReply'>): LeaveRequest {
  const requests = getLeaveRequests();
  const newRequest: LeaveRequest = {
    ...request,
    id: `leave-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    status: 'pending',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  requests.unshift(newRequest);
  saveLeaveRequests(requests);
  return newRequest;
}

// 获取学生的请假申请
export function getStudentLeaveRequests(studentId: string): LeaveRequest[] {
  return getLeaveRequests().filter(r => r.studentId === studentId);
}

// 获取班级的请假申请
export function getClassLeaveRequests(classId: string): LeaveRequest[] {
  return getLeaveRequests().filter(r => r.classId === classId);
}

// 获取待审批的请假申请
export function getPendingLeaveRequests(classId?: string): LeaveRequest[] {
  const requests = getLeaveRequests().filter(r => r.status === 'pending');
  if (classId) {
    return requests.filter(r => r.classId === classId);
  }
  return requests;
}

// 审批请假申请
export function approveLeaveRequest(requestId: string, teacherReply?: string): boolean {
  const requests = getLeaveRequests();
  const index = requests.findIndex(r => r.id === requestId);
  if (index === -1) return false;
  
  requests[index] = {
    ...requests[index],
    status: 'approved',
    teacherReply,
    updatedAt: new Date().toISOString(),
  };
  saveLeaveRequests(requests);
  return true;
}

// 拒绝请假申请
export function rejectLeaveRequest(requestId: string, teacherReply?: string): boolean {
  const requests = getLeaveRequests();
  const index = requests.findIndex(r => r.id === requestId);
  if (index === -1) return false;
  
  requests[index] = {
    ...requests[index],
    status: 'rejected',
    teacherReply,
    updatedAt: new Date().toISOString(),
  };
  saveLeaveRequests(requests);
  return true;
}

// 取消请假申请（学生）
export function cancelLeaveRequest(requestId: string): boolean {
  const requests = getLeaveRequests();
  const index = requests.findIndex(r => r.id === requestId && r.status === 'pending');
  if (index === -1) return false;
  
  requests.splice(index, 1);
  saveLeaveRequests(requests);
  return true;
}

// ============ 登录日志管理 ============

export interface LoginLog {
  id: string;
  username: string;
  userId: string;
  userName: string;
  role: 'teacher' | 'student';
  timestamp: string;
  ip?: string;
}

const SHARED_LOGIN_LOGS_KEY = 'shared_login_logs';

// 获取登录日志
export function getLoginLogs(): LoginLog[] {
  if (typeof window === 'undefined') return [];
  const stored = localStorage.getItem(SHARED_LOGIN_LOGS_KEY);
  if (!stored) return [];
  try {
    return JSON.parse(stored);
  } catch {
    return [];
  }
}

// 添加登录日志
export function addLoginLog(user: { id: string; username: string; name: string; role: 'teacher' | 'student' }): void {
  if (typeof window === 'undefined') return;
  const logs = getLoginLogs();
  const newLog: LoginLog = {
    id: `log-${Date.now()}`,
    username: user.username,
    userId: user.id,
    userName: user.name,
    role: user.role,
    timestamp: new Date().toISOString(),
  };
  logs.unshift(newLog);
  // 只保留最近100条日志
  if (logs.length > 100) {
    logs.splice(100);
  }
  localStorage.setItem(SHARED_LOGIN_LOGS_KEY, JSON.stringify(logs));
}

// 获取用户的登录日志
export function getUserLoginLogs(userId: string): LoginLog[] {
  return getLoginLogs().filter(log => log.userId === userId);
}

// ============ 考勤统计管理 ============

export interface AttendanceStats {
  totalDays: number; // 应到天数
  presentDays: number; // 实到天数
  absentDays: number; // 缺勤天数
  lateDays: number; // 迟到天数
  leaveDays: number; // 请假天数
  goOutDays: number; // 外出天数
  attendanceRate: number; // 出勤率
}

// 获取学生考勤统计
export function getStudentAttendanceStats(studentId: string, startDate?: string, endDate?: string): AttendanceStats {
  let records = getAttendanceRecords().filter(r => r.studentId === studentId);
  
  // 按日期筛选
  if (startDate) {
    records = records.filter(r => new Date(r.timestamp) >= new Date(startDate));
  }
  if (endDate) {
    records = records.filter(r => new Date(r.timestamp) <= new Date(endDate));
  }
  
  const stats: AttendanceStats = {
    totalDays: 0,
    presentDays: 0,
    absentDays: 0,
    lateDays: 0,
    leaveDays: 0,
    goOutDays: 0,
    attendanceRate: 0,
  };
  
  // 按日期分组统计
  const dates = new Set(records.map(r => r.timestamp.split('T')[0]));
  stats.totalDays = dates.size;
  stats.presentDays = records.filter(r => r.type === 'check_in' || r.type === 'check_out').length;
  stats.leaveDays = records.filter(r => r.type === 'leave').length;
  stats.goOutDays = records.filter(r => r.type === 'go_out').length;
  stats.absentDays = Math.max(0, stats.totalDays - stats.presentDays - stats.leaveDays - stats.goOutDays);
  
  if (stats.totalDays > 0) {
    stats.attendanceRate = Math.round((stats.presentDays / stats.totalDays) * 100);
  }
  
  return stats;
}

// 获取班级考勤统计
export function getClassAttendanceStats(classId: string): {
  totalStudents: number;
  checkedInToday: number;
  absentToday: number;
  leaveToday: number;
  attendanceRate: number;
} {
  const students = getStudents().filter(s => s.classId === classId);
  const todayRecords = getTodayAttendanceRecords().filter(r => r.classId === classId);
  
  const checkedInStudents = new Set(
    todayRecords.filter(r => r.type === 'check_in' || r.type === 'check_out').map(r => r.studentId)
  );
  
  const leaveStudents = new Set(
    todayRecords.filter(r => r.type === 'leave').map(r => r.studentId)
  );
  
  const total = students.length;
  const checkedIn = checkedInStudents.size;
  const onLeave = leaveStudents.size;
  const absent = total - checkedIn - onLeave;
  
  return {
    totalStudents: total,
    checkedInToday: checkedIn,
    absentToday: absent,
    leaveToday: onLeave,
    attendanceRate: total > 0 ? Math.round((checkedIn / total) * 100) : 0,
  };
}

// 获取学生本周考勤统计（简化版，用于组件显示）
export function getStudentWeeklyStats(studentId: string): {
  presentDays: number;
  totalDays: number;
  attendanceRate: number;
  lateDays: number;
} {
  const records = getAttendanceRecords().filter(r => r.studentId === studentId);
  const today = new Date();
  const weekStart = new Date(today);
  weekStart.setDate(today.getDate() - 6);
  
  const weekRecords = records.filter(r => {
    const recordDate = new Date(r.timestamp);
    return recordDate >= weekStart && recordDate <= today && r.type === 'check_in';
  });
  
  const presentDays = new Set(weekRecords.map(r => r.timestamp.split('T')[0])).size;
  const totalDays = 7;
  
  return {
    presentDays,
    totalDays,
    attendanceRate: Math.round((presentDays / totalDays) * 100),
    lateDays: weekRecords.filter(r => r.verified === false).length,
  };
}

// 获取班级本周考勤统计（简化版）
export function getClassWeeklyStats(classId: string): {
  totalStudents: number;
  checkedInToday: number;
  leaveToday: number;
  absentToday: number;
  lateToday: number;
} {
  const students = getStudents().filter(s => s.classId === classId);
  const todayRecords = getAttendanceRecords().filter(r => r.classId === classId);
  const today = new Date().toISOString().split('T')[0];
  
  const todayRecordsFiltered = todayRecords.filter(r => r.timestamp.startsWith(today));
  const checkedInStudents = new Set(todayRecordsFiltered.map(r => r.studentId));
  
  return {
    totalStudents: students.length,
    checkedInToday: checkedInStudents.size,
    leaveToday: 0,
    absentToday: students.length - checkedInStudents.size,
    lateToday: todayRecordsFiltered.filter(r => r.verified === false).length,
  };
}

// ============ 人脸特征管理（唯一性保证） ============

// 获取所有已注册的人脸特征
export function getFaceDescriptors(): FaceDescriptorData[] {
  if (typeof window === 'undefined') return [];
  const stored = localStorage.getItem(FACE_DESCRIPTORS_KEY);
  if (!stored) {
    console.log('[getFaceDescriptors] localStorage 中无 face_descriptors 数据');
    return [];
  }
  try {
    const parsed = JSON.parse(stored);
    console.log('[getFaceDescriptors] 读取到', parsed.length, '条人脸特征记录');
    return parsed;
  } catch {
    console.log('[getFaceDescriptors] 解析 face_descriptors 数据失败');
    return [];
  }
}

// 保存人脸特征
function saveFaceDescriptors(descriptors: FaceDescriptorData[]): void {
  if (typeof window === 'undefined') return;
  try {
    const jsonStr = JSON.stringify(descriptors);
    localStorage.setItem(FACE_DESCRIPTORS_KEY, jsonStr);
    console.log('[saveFaceDescriptors] 成功保存', descriptors.length, '条人脸特征记录, 数据大小:', jsonStr.length, '字节');
    // 验证保存是否成功
    const saved = localStorage.getItem(FACE_DESCRIPTORS_KEY);
    if (saved) {
      const verified = JSON.parse(saved);
      console.log('[saveFaceDescriptors] 验证保存成功, 记录数:', verified.length);
    } else {
      console.error('[saveFaceDescriptors] 验证失败! localStorage 中未找到保存的数据');
    }
  } catch (e) {
    console.error('[saveFaceDescriptors] 保存失败:', e);
  }
}

// 计算两个人脸特征向量的欧氏距离
function calculateFaceDistance(desc1: number[], desc2: number[]): number {
  if (desc1.length !== desc2.length) return Infinity;
  let sum = 0;
  for (let i = 0; i < desc1.length; i++) {
    sum += Math.pow(desc1[i] - desc2[i], 2);
  }
  return Math.sqrt(sum);
}

// 清理孤立的人脸/声纹描述符（对应的学生已不存在）
function cleanupOrphanedDescriptors(): void {
  const students = getStudents();
  const studentIds = new Set(students.map(s => s.id));
  
  // 清理人脸描述符
  const faceDescriptors = getFaceDescriptors();
  const validFaceDescriptors = faceDescriptors.filter(d => studentIds.has(d.studentId));
  if (validFaceDescriptors.length !== faceDescriptors.length) {
    const removed = faceDescriptors.length - validFaceDescriptors.length;
    console.log(`[cleanupOrphanedDescriptors] 清理了 ${removed} 条孤立的人脸描述符`);
    saveFaceDescriptors(validFaceDescriptors);
  }
  
  // 清理声纹描述符
  const voiceDescriptors = getVoiceDescriptors();
  const validVoiceDescriptors = voiceDescriptors.filter(d => studentIds.has(d.studentId));
  if (validVoiceDescriptors.length !== voiceDescriptors.length) {
    const removed = voiceDescriptors.length - validVoiceDescriptors.length;
    console.log(`[cleanupOrphanedDescriptors] 清理了 ${removed} 条孤立的声纹描述符`);
    saveVoiceDescriptors(validVoiceDescriptors);
  }
}

// 检查人脸特征是否已存在（唯一性验证）
// 返回 { isUnique: boolean, existingUser?: FaceDescriptorData, distance?: number }
// threshold: 注册时用 0.55（平衡安全性与可用性），打卡时用 0.65（宽松，允许拍摄条件变化）
export function checkFaceDescriptorUniqueness(
  newDescriptor: number[],
  excludeStudentId?: string,
  threshold: number = 0.45
): { isUnique: boolean; existingUser?: FaceDescriptorData; distance?: number } {
  const existingDescriptors = getFaceDescriptors();
  
  // 人脸识别欧氏距离阈值（face-api.js 128维描述子）
  // 注册唯一性检查：默认 0.45（同一人不同帧通常 < 0.4，不同人通常 > 0.6）
  // 打卡验证：使用 0.6（face-api.js 官方推荐标准阈值）
  const DISTANCE_THRESHOLD = threshold;
  
  console.log('[checkFaceDescriptorUniqueness] 新描述符长度:', newDescriptor.length, 
    '已有记录数:', existingDescriptors.length, 
    '排除学生ID:', excludeStudentId || '无',
    '阈值:', DISTANCE_THRESHOLD);
  
  // 输出新描述符的前5个值用于验证
  console.log('[checkFaceDescriptorUniqueness] 新描述符前5位:', newDescriptor.slice(0, 5));
  
  for (const existing of existingDescriptors) {
    // 跳过排除的用户（用于更新自己）
    if (excludeStudentId && existing.studentId === excludeStudentId) {
      console.log('[checkFaceDescriptorUniqueness] 跳过自身:', existing.studentId, existing.name);
      continue;
    }
    
    const distance = calculateFaceDistance(newDescriptor, existing.descriptor);
    console.log('[checkFaceDescriptorUniqueness] 与', existing.name, '(' + existing.studentId + ') 的距离:', distance.toFixed(4), 
      existing.descriptor ? '已有描述符长度:' + existing.descriptor.length : '已有描述符为空');
    
    if (distance < DISTANCE_THRESHOLD) {
      console.log('[checkFaceDescriptorUniqueness] ⚠️ 检测到重复人脸! 距离', distance.toFixed(4), '< 阈值', DISTANCE_THRESHOLD);
      return {
        isUnique: false,
        existingUser: existing,
        distance: distance,
      };
    }
  }
  
  console.log('[checkFaceDescriptorUniqueness] ✅ 人脸特征唯一性验证通过');
  return { isUnique: true };
}

// 注册人脸特征
export function registerFaceDescriptor(
  studentId: string,
  username: string,
  name: string,
  descriptor: number[]
): { success: boolean; message: string } {
  console.log('[registerFaceDescriptor] 开始注册人脸特征, studentId:', studentId, 'username:', username, 'name:', name, 'descriptor长度:', descriptor ? descriptor.length : 0);
  
  // 检查唯一性（排除自己的旧记录）
  const checkResult = checkFaceDescriptorUniqueness(descriptor, studentId);
  
  if (!checkResult.isUnique && checkResult.existingUser) {
    console.log('[registerFaceDescriptor] ❌ 人脸特征重复，注册失败');
    return {
      success: false,
      message: `人脸特征已存在！该人脸已被用户「${checkResult.existingUser.name}」(${checkResult.existingUser.username}) 注册。请使用本人真实人脸进行注册。`,
    };
  }
  
  // 添加或更新人脸特征（如果已有则替换旧记录）
  const descriptors = getFaceDescriptors();
  const existingIndex = descriptors.findIndex(d => d.studentId === studentId);
  const newEntry: FaceDescriptorData = {
    studentId,
    username,
    name,
    descriptor,
    registeredAt: new Date().toISOString(),
  };
  
  if (existingIndex >= 0) {
    descriptors[existingIndex] = newEntry;
    console.log(`[registerFaceDescriptor] 更新已有记录, 索引: ${existingIndex}`);
  } else {
    descriptors.push(newEntry);
  }
  saveFaceDescriptors(descriptors);
  
  console.log(`[registerFaceDescriptor] ✅ 人脸特征注册成功: ${name} (${username}), 当前总记录数: ${descriptors.length}`);
  
  return {
    success: true,
    message: '人脸特征注册成功！',
  };
}

// 获取用户的人脸特征
export function getFaceDescriptor(studentId: string): FaceDescriptorData | null {
  const descriptors = getFaceDescriptors();
  return descriptors.find(d => d.studentId === studentId) || null;
}

// 删除用户的人脸特征
export function removeFaceDescriptor(studentId: string): void {
  const descriptors = getFaceDescriptors().filter(d => d.studentId !== studentId);
  saveFaceDescriptors(descriptors);
}

// ============ 声纹特征管理（唯一性保证） ============

// 获取所有已注册的声纹特征
export function getVoiceDescriptors(): VoiceDescriptorData[] {
  if (typeof window === 'undefined') return [];
  const stored = localStorage.getItem(VOICE_DESCRIPTORS_KEY);
  if (!stored) return [];
  try {
    return JSON.parse(stored);
  } catch {
    return [];
  }
}

// 保存声纹特征
function saveVoiceDescriptors(descriptors: VoiceDescriptorData[]): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(VOICE_DESCRIPTORS_KEY, JSON.stringify(descriptors));
}

// 计算两个声纹特征向量的余弦相似度
function calculateVoiceSimilarity(desc1: number[], desc2: number[]): number {
  if (desc1.length !== desc2.length) return 0;
  
  let dotProduct = 0;
  let norm1 = 0;
  let norm2 = 0;
  
  for (let i = 0; i < desc1.length; i++) {
    dotProduct += desc1[i] * desc2[i];
    norm1 += desc1[i] * desc1[i];
    norm2 += desc2[i] * desc2[i];
  }
  
  if (norm1 === 0 || norm2 === 0) return 0;
  return dotProduct / (Math.sqrt(norm1) * Math.sqrt(norm2));
}

// 检查声纹特征是否已存在（唯一性验证）
// 返回 { isUnique: boolean, existingUser?: VoiceDescriptorData, similarity?: number }
export function checkVoiceDescriptorUniqueness(
  newDescriptor: number[],
  excludeStudentId?: string
): { isUnique: boolean; existingUser?: VoiceDescriptorData; similarity?: number } {
  const existingDescriptors = getVoiceDescriptors();
  
  // 余弦相似度阈值：0.85 认为相似（42维 MFCC+基频特征，同一人相似度通常 > 0.90）
  // 余弦相似度范围是 -1 到 1，1 表示完全相同
  const SIMILARITY_THRESHOLD = 0.85;
  
  for (const existing of existingDescriptors) {
    // 跳过排除的用户（用于更新自己）
    if (excludeStudentId && existing.studentId === excludeStudentId) {
      continue;
    }
    
    const similarity = calculateVoiceSimilarity(newDescriptor, existing.descriptor);
    if (similarity >= SIMILARITY_THRESHOLD) {
      return {
        isUnique: false,
        existingUser: existing,
        similarity: similarity,
      };
    }
  }
  
  return { isUnique: true };
}

// 注册声纹特征
export function registerVoiceDescriptor(
  studentId: string,
  username: string,
  name: string,
  descriptor: number[]
): { success: boolean; message: string } {
  // 检查唯一性（排除自己的旧记录）
  const checkResult = checkVoiceDescriptorUniqueness(descriptor, studentId);
  
  if (!checkResult.isUnique && checkResult.existingUser) {
    return {
      success: false,
      message: `声纹特征已存在！该声纹已被用户「${checkResult.existingUser.name}」(${checkResult.existingUser.username}) 注册。请使用本人真实声纹进行注册。`,
    };
  }
  
  // 添加或更新声纹特征（如果已有则替换旧记录）
  const descriptors = getVoiceDescriptors();
  const existingIndex = descriptors.findIndex(d => d.studentId === studentId);
  const newEntry: VoiceDescriptorData = {
    studentId,
    username,
    name,
    descriptor,
    registeredAt: new Date().toISOString(),
  };
  
  if (existingIndex >= 0) {
    descriptors[existingIndex] = newEntry;
  } else {
    descriptors.push(newEntry);
  }
  saveVoiceDescriptors(descriptors);
  
  console.log(`[registerVoiceDescriptor] 声纹特征注册成功: ${name} (${username})`);
  
  return {
    success: true,
    message: '声纹特征注册成功！',
  };
}

// 获取用户的声纹特征
export function getVoiceDescriptor(studentId: string): VoiceDescriptorData | null {
  const descriptors = getVoiceDescriptors();
  return descriptors.find(d => d.studentId === studentId) || null;
}

// 删除用户的声纹特征
export function removeVoiceDescriptor(studentId: string): void {
  const descriptors = getVoiceDescriptors().filter(d => d.studentId !== studentId);
  saveVoiceDescriptors(descriptors);
}

// ==========================================
// 成绩管理
// ==========================================
const GRADES_KEY = 'shared_grades';

export function getGrades(): GradeRecord[] {
  if (typeof window === 'undefined') return [];
  try {
    const data = localStorage.getItem(GRADES_KEY);
    return data ? JSON.parse(data) : [];
  } catch { return []; }
}

function saveGrades(grades: GradeRecord[]): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(GRADES_KEY, JSON.stringify(grades));
}

export function addGradeRecord(record: Omit<GradeRecord, 'id'>): GradeRecord {
  const grades = getGrades();
  const newRecord: GradeRecord = { ...record, id: `grade-${Date.now()}-${Math.random().toString(36).slice(2, 7)}` };
  grades.push(newRecord);
  saveGrades(grades);
  // 异步同步到云端
  fetch('/api/sync', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'upsert_grade',
      data: {
        id: newRecord.id,
        student_id: newRecord.studentId,
        student_name: newRecord.studentName,
        class_id: newRecord.classId,
        subject: newRecord.subject,
        exam_name: newRecord.examName,
        score: newRecord.score,
        full_score: newRecord.fullScore,
        rank: newRecord.rank,
        date: newRecord.date,
        created_at: newRecord.createdAt,
      },
    }),
  }).catch(() => {});
  return newRecord;
}

/** Alias for addGradeRecord */
export const addGrade = addGradeRecord;

export function importGrades(records: Omit<GradeRecord, 'id'>[]): number {
  const grades = getGrades();
  let count = 0;
  for (const record of records) {
    grades.push({ ...record, id: `grade-${Date.now()}-${count}-${Math.random().toString(36).slice(2, 7)}` });
    count++;
  }
  saveGrades(grades);
  return count;
}

export function getGradesByClass(classId: string): GradeRecord[] {
  return getGrades().filter(g => g.classId === classId);
}

export function getGradesByStudent(studentId: string): GradeRecord[] {
  return getGrades().filter(g => g.studentId === studentId);
}

export function deleteGrade(id: string): void {
  saveGrades(getGrades().filter(g => g.id !== id));
}

export function clearGradesByClass(classId: string): void {
  saveGrades(getGrades().filter(g => g.classId !== classId));
}

// ==========================================
// 师生消息系统
// ==========================================
const MESSAGES_KEY = 'shared_messages';

export function getMessages(): MessageRecord[] {
  if (typeof window === 'undefined') return [];
  try {
    const data = localStorage.getItem(MESSAGES_KEY);
    return data ? JSON.parse(data) : [];
  } catch { return []; }
}

function saveMessages(messages: MessageRecord[]): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(MESSAGES_KEY, JSON.stringify(messages));
}

export function sendMessage(msg: Omit<MessageRecord, 'id' | 'createdAt' | 'read'>): MessageRecord {
  const messages = getMessages();
  const newMsg: MessageRecord = {
    ...msg,
    id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    createdAt: new Date().toISOString(),
    read: false,
  };
  messages.push(newMsg);
  saveMessages(messages);
  // 异步推送消息到云端
  fetch('/api/sync', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'upsert_message',
      data: {
        id: newMsg.id,
        from_id: newMsg.fromId,
        from_name: newMsg.fromName,
        from_role: newMsg.fromRole,
        to_id: newMsg.toId,
        to_name: newMsg.toName,
        to_role: newMsg.toRole,
        content: newMsg.content,
        type: 'text',
        read: newMsg.read,
        created_at: newMsg.createdAt,
      },
    }),
  }).catch(() => {});
  return newMsg;
}

export function getMessagesByUser(userId: string): MessageRecord[] {
  return getMessages().filter(m => m.fromId === userId || m.toId === userId)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export function getConversation(user1Id: string, user2Id: string): MessageRecord[] {
  return getMessages().filter(m =>
    (m.fromId === user1Id && m.toId === user2Id) || (m.fromId === user2Id && m.toId === user1Id)
  ).sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
}

export function markMessageRead(messageId: string): void {
  const messages = getMessages();
  const msg = messages.find(m => m.id === messageId);
  if (msg) { msg.read = true; saveMessages(messages); }
}

/** 判断是否为教师ID变体（teacher / teacher-XXX / user-XXX） */
function isTeacherIdVariant(id: string): boolean {
  return id === 'teacher' || id.startsWith('teacher-') || id.startsWith('user-');
}

export function markAllRead(userId: string): void {
  const messages = getMessages();
  let changed = false;
  const isTeacher = isTeacherIdVariant(userId);
  for (const m of messages) {
    if (!m.read && (
      m.toId === userId ||
      (isTeacher && isTeacherIdVariant(m.toId) && m.toRole === 'teacher')
    )) {
      m.read = true;
      changed = true;
    }
  }
  if (changed) saveMessages(messages);
}

export function getUnreadCount(userId: string): number {
  const isTeacher = isTeacherIdVariant(userId);
  return getMessages().filter(m => !m.read && (
    m.toId === userId ||
    (isTeacher && isTeacherIdVariant(m.toId) && m.toRole === 'teacher')
  )).length;
}

export function deleteMessage(id: string): void {
  saveMessages(getMessages().filter(m => m.id !== id));
}

// ==========================================
// 班级媒体相册
// ==========================================
const MEDIA_KEY = 'shared_media';

export function getMediaList(): MediaRecord[] {
  if (typeof window === 'undefined') return [];
  try {
    const data = localStorage.getItem(MEDIA_KEY);
    return data ? JSON.parse(data) : [];
  } catch { return []; }
}

/** Alias for getMediaList */
export function getMedia(): MediaRecord[] {
  return getMediaList();
}

function saveMediaList(media: MediaRecord[]): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(MEDIA_KEY, JSON.stringify(media));
}

export function addMedia(record: Omit<MediaRecord, 'id' | 'createdAt'>): MediaRecord {
  const media = getMediaList();
  const newRecord: MediaRecord = {
    ...record,
    id: `media-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    createdAt: new Date().toISOString(),
  };
  media.push(newRecord);
  saveMediaList(media);
  // 推送到云端
  fetch('/api/sync', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'upsert_media',
      media: [{
        id: newRecord.id,
        title: newRecord.title || '',
        url: newRecord.url || '',
        s3_key: newRecord.s3Key || '',
        type: newRecord.type || 'photo',
        class_id: newRecord.classId || '',
        uploaded_by: newRecord.uploadedBy || '',
        uploaded_by_name: newRecord.uploadedByName || '',
        description: newRecord.description || '',
        created_at: newRecord.createdAt,
      }],
    }),
  }).catch(() => {});
  return newRecord;
}

export function getMediaByClass(classId: string): MediaRecord[] {
  return getMediaList().filter(m => m.classId === classId)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export function deleteMedia(id: string): void {
  saveMediaList(getMediaList().filter(m => m.id !== id));
}

// ==========================================
// 家长管理
// ==========================================
const PARENTS_KEY = 'shared_parents';

export function getParents(): ParentInfo[] {
  if (typeof window === 'undefined') return [];
  try {
    const data = localStorage.getItem(PARENTS_KEY);
    return data ? JSON.parse(data) : [];
  } catch { return []; }
}

export function saveParents(parents: ParentInfo[]): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(PARENTS_KEY, JSON.stringify(parents));
}

export function addParent(parent: Omit<ParentInfo, 'id'>): ParentInfo {
  const parents = getParents();
  const newParent: ParentInfo = { ...parent, id: `parent-${Date.now()}-${Math.random().toString(36).slice(2, 7)}` };
  parents.push(newParent);
  saveParents(parents);
  return newParent;
}

export function getParentsByStudent(studentId: string): ParentInfo[] {
  return getParents().filter(p => (p.childrenIds || [p.childId]).includes(studentId));
}

export function getParentById(id: string): ParentInfo | null {
  return getParents().find(p => p.id === id) || null;
}

export function getParentsByClass(classId: string): ParentInfo[] {
  return getParents().filter(p => (p.childrenClassIds || [p.classId]).includes(classId));
}

export function deleteParent(id: string): void {
  saveParents(getParents().filter(p => p.id !== id));
}

export function updateParent(id: string, updates: Partial<ParentInfo>): void {
  const parents = getParents();
  const idx = parents.findIndex(p => p.id === id);
  if (idx !== -1) { parents[idx] = { ...parents[idx], ...updates }; saveParents(parents); }
}

// ==========================================
// 通知推送
// ==========================================
const NOTIFICATIONS_KEY = 'user_notifications';

interface SimpleNotification {
  id: string;
  type: string;
  title: string;
  content: string;
  timestamp: string;
  read: boolean;
  priority: string;
  userId?: string;
}

export function addNotification(notification: { userId?: string; title: string; message: string; type: string; read: boolean }): void {
  if (typeof window === 'undefined') return;
  try {
    const data = localStorage.getItem(NOTIFICATIONS_KEY);
    const notifications: SimpleNotification[] = data ? JSON.parse(data) : [];
    notifications.unshift({
      id: `notif-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      type: notification.type || 'system',
      title: notification.title,
      content: notification.message,
      timestamp: new Date().toISOString(),
      read: false,
      priority: 'normal',
      userId: notification.userId,
    });
    localStorage.setItem(NOTIFICATIONS_KEY, JSON.stringify(notifications.slice(0, 200)));
  } catch { /* ignore */ }
}

// ==========================================
// 统一用户查询
// ==========================================
export function getUsers(): Array<{ id: string; username: string; name: string; role: string; classId?: string }> {
  const students = getStudents().map(s => ({ id: s.id, username: s.username, name: s.name, role: 'student' as const, classId: s.classId }));
  const parents = getParents().map(p => ({ id: p.id, username: p.username, name: p.name, role: 'parent' as const, classId: p.classId }));
  const teachers = [{ id: 'teacher', username: 'teacher', name: '教师', role: 'teacher' as const }];
  return [...students, ...parents, ...teachers];
}

// ==========================================
// 座位表
// ==========================================
const SEAT_LAYOUT_KEY = 'seat_layouts';

export function getSeatLayout(classId: string): SeatLayout | null {
  if (typeof window === 'undefined') return null;
  const data = localStorage.getItem(SEAT_LAYOUT_KEY);
  const layouts: SeatLayout[] = data ? JSON.parse(data) : [];
  return layouts.find(l => l.classId === classId) || null;
}

export function saveSeatLayout(layout: SeatLayout): void {
  if (typeof window === 'undefined') return;
  const data = localStorage.getItem(SEAT_LAYOUT_KEY);
  const layouts: SeatLayout[] = data ? JSON.parse(data) : [];
  const idx = layouts.findIndex(l => l.classId === layout.classId);
  if (idx !== -1) { layouts[idx] = layout; } else { layouts.push(layout); }
  localStorage.setItem(SEAT_LAYOUT_KEY, JSON.stringify(layouts));
}

// ==========================================
// 值日安排
// ==========================================
const DUTY_SCHEDULE_KEY = 'duty_schedules';

export function getDutySchedules(classId: string): DutySchedule[] {
  if (typeof window === 'undefined') return [];
  const data = localStorage.getItem(DUTY_SCHEDULE_KEY);
  const schedules: DutySchedule[] = data ? JSON.parse(data) : [];
  return schedules.filter(s => s.classId === classId).sort((a, b) => a.date.localeCompare(b.date));
}

export function addDutySchedule(schedule: Omit<DutySchedule, 'id' | 'createdAt'>): DutySchedule {
  const newSchedule: DutySchedule = {
    ...schedule,
    id: `duty-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    createdAt: new Date().toISOString(),
  };
  const data = localStorage.getItem(DUTY_SCHEDULE_KEY);
  const schedules: DutySchedule[] = data ? JSON.parse(data) : [];
  schedules.push(newSchedule);
  localStorage.setItem(DUTY_SCHEDULE_KEY, JSON.stringify(schedules));
  return newSchedule;
}

export function deleteDutySchedule(id: string): void {
  const data = localStorage.getItem(DUTY_SCHEDULE_KEY);
  const schedules: DutySchedule[] = data ? JSON.parse(data) : [];
  localStorage.setItem(DUTY_SCHEDULE_KEY, JSON.stringify(schedules.filter(s => s.id !== id)));
}

// ==========================================
// 课堂表现评分
// ==========================================
const CLASS_PERFORMANCE_KEY = 'class_performance';

export function getClassPerformances(classId: string): ClassPerformance[] {
  if (typeof window === 'undefined') return [];
  const data = localStorage.getItem(CLASS_PERFORMANCE_KEY);
  const records: ClassPerformance[] = data ? JSON.parse(data) : [];
  return records.filter(r => r.classId === classId);
}

export function getStudentPerformances(studentId: string): ClassPerformance[] {
  if (typeof window === 'undefined') return [];
  const data = localStorage.getItem(CLASS_PERFORMANCE_KEY);
  const records: ClassPerformance[] = data ? JSON.parse(data) : [];
  return records.filter(r => r.studentId === studentId);
}

export function addClassPerformance(record: Omit<ClassPerformance, 'id' | 'createdAt'>): ClassPerformance {
  const newRecord: ClassPerformance = {
    ...record,
    id: `perf-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    createdAt: new Date().toISOString(),
  };
  const data = localStorage.getItem(CLASS_PERFORMANCE_KEY);
  const records: ClassPerformance[] = data ? JSON.parse(data) : [];
  records.push(newRecord);
  localStorage.setItem(CLASS_PERFORMANCE_KEY, JSON.stringify(records));
  return newRecord;
}

export function deleteClassPerformance(id: string): void {
  const data = localStorage.getItem(CLASS_PERFORMANCE_KEY);
  const records: ClassPerformance[] = data ? JSON.parse(data) : [];
  localStorage.setItem(CLASS_PERFORMANCE_KEY, JSON.stringify(records.filter(r => r.id !== id)));
}

// ==========================================
// 消息已读状态
// ==========================================
export function markMessageAsRead(messageId: string): void {
  if (typeof window === 'undefined') return;
  const data = localStorage.getItem(MESSAGES_KEY);
  const messages: MessageRecord[] = data ? JSON.parse(data) : [];
  const idx = messages.findIndex(m => m.id === messageId);
  if (idx !== -1) { messages[idx].read = true; localStorage.setItem(MESSAGES_KEY, JSON.stringify(messages)); }
}

export function markAllMessagesAsRead(userId: string): void {
  if (typeof window === 'undefined') return;
  const messages = getMessages();
  const isTeacher = isTeacherIdVariant(userId);
  let changed = false;
  messages.forEach(m => {
    if (!m.read && (
      m.toId === userId ||
      (isTeacher && isTeacherIdVariant(m.toId) && m.toRole === 'teacher')
    )) {
      m.read = true;
      changed = true;
    }
  });
  if (changed) saveMessages(messages);
}

export function getUnreadMessageCount(userId: string): number {
  if (typeof window === 'undefined') return 0;
  const messages = getMessages();
  const isTeacher = isTeacherIdVariant(userId);
  return messages.filter(m => !m.read && (
    m.toId === userId ||
    (isTeacher && isTeacherIdVariant(m.toId) && m.toRole === 'teacher')
  )).length;
}

// ==================== 媒体评论 ====================

export function getMediaComments(mediaId?: string): MediaComment[] {
  if (typeof window === 'undefined') return [];
  const data = localStorage.getItem(MEDIA_COMMENTS_KEY);
  const comments: MediaComment[] = data ? JSON.parse(data) : [];
  return mediaId ? comments.filter(c => c.mediaId === mediaId) : comments;
}

export function addMediaComment(comment: Omit<MediaComment, 'id' | 'createdAt'>): MediaComment {
  if (typeof window === 'undefined') return comment as MediaComment;
  const data = localStorage.getItem(MEDIA_COMMENTS_KEY);
  const comments: MediaComment[] = data ? JSON.parse(data) : [];
  const newComment: MediaComment = { ...comment, id: `mc-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, createdAt: new Date().toISOString() };
  comments.push(newComment);
  localStorage.setItem(MEDIA_COMMENTS_KEY, JSON.stringify(comments));
  // 推送到云端
  fetch('/api/sync', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'upsert_media_comment',
      comment: {
        id: newComment.id,
        media_id: newComment.mediaId,
        user_id: newComment.userId,
        user_name: newComment.userName || '',
        user_role: newComment.userRole || '',
        content: newComment.content || '',
        type: newComment.type || 'comment',
        created_at: newComment.createdAt,
      },
    }),
  }).catch(() => {});
  return newComment;
}

export function toggleMediaLike(mediaId: string, userId: string): { liked: boolean; count: number } {
  if (typeof window === 'undefined') return { liked: false, count: 0 };
  const data = localStorage.getItem(MEDIA_COMMENTS_KEY);
  const comments: MediaComment[] = data ? JSON.parse(data) : [];
  // 用特殊 comment 存储 like 信息: type='like', content 存 userId 列表
  let likeRecord = comments.find(c => c.mediaId === mediaId && c.type === 'like');
  if (!likeRecord) {
    likeRecord = { id: `like-${mediaId}`, mediaId, userId: 'system', userName: '', userRole: 'teacher', type: 'like', content: JSON.stringify([]), createdAt: new Date().toISOString() };
    comments.push(likeRecord);
  }
  const userIds: string[] = JSON.parse(likeRecord.content || '[]');
  const idx = userIds.indexOf(userId);
  if (idx >= 0) { userIds.splice(idx, 1); } else { userIds.push(userId); }
  likeRecord.content = JSON.stringify(userIds);
  localStorage.setItem(MEDIA_COMMENTS_KEY, JSON.stringify(comments));
  return { liked: userIds.includes(userId), count: userIds.length };
}

export function getMediaLikes(mediaId: string, currentUserId?: string): { userIds: string[]; count: number; isLiked: boolean } {
  if (typeof window === 'undefined') return { userIds: [], count: 0, isLiked: false };
  const data = localStorage.getItem(MEDIA_COMMENTS_KEY);
  const comments: MediaComment[] = data ? JSON.parse(data) : [];
  const likeRecord = comments.find(c => c.mediaId === mediaId && c.type === 'like');
  if (!likeRecord) return { userIds: [], count: 0, isLiked: false };
  const userIds: string[] = JSON.parse(likeRecord.content || '[]');
  const isLiked = currentUserId ? userIds.includes(currentUserId) : false;
  return { userIds, count: userIds.length, isLiked };
}

// ==================== 积分记录 ====================

export function getPointRecords(classId?: string, studentId?: string): PointRecord[] {
  if (typeof window === 'undefined') return [];
  const data = localStorage.getItem(POINT_RECORDS_KEY);
  const records: PointRecord[] = data ? JSON.parse(data) : [];
  return records.filter(r =>
    (!classId || r.classId === classId) &&
    (!studentId || r.studentId === studentId)
  );
}

export function addPointRecord(record: Omit<PointRecord, 'id' | 'createdAt'>): PointRecord {
  if (typeof window === 'undefined') return record as PointRecord;
  const data = localStorage.getItem(POINT_RECORDS_KEY);
  const records: PointRecord[] = data ? JSON.parse(data) : [];
  const newRecord: PointRecord = { ...record, id: `pt-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, createdAt: new Date().toISOString() };
  records.push(newRecord);
  localStorage.setItem(POINT_RECORDS_KEY, JSON.stringify(records));
  // 异步同步到云端
  fetch('/api/sync', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'upsert_point_record',
      data: {
        id: newRecord.id,
        student_id: newRecord.studentId,
        student_name: newRecord.studentName,
        class_id: newRecord.classId,
        points: newRecord.points,
        reason: newRecord.reason,
        created_by: newRecord.createdBy,
        created_at: newRecord.createdAt,
      },
    }),
  }).catch(() => {});
  return newRecord;
}

export function getStudentPoints(classId: string): { studentId: string; studentName: string; totalPoints: number }[] {
  const records = getPointRecords(classId);
  const map = new Map<string, { studentId: string; studentName: string; totalPoints: number }>();
  for (const r of records) {
    const sid = r.studentId || r.userId || '';
    const sname = r.studentName || r.userName || '';
    const existing = map.get(sid);
    if (existing) { existing.totalPoints += r.points; }
    else { map.set(sid, { studentId: sid, studentName: sname, totalPoints: r.points }); }
  }
  return Array.from(map.values()).sort((a, b) => b.totalPoints - a.totalPoints);
}

// ==================== 自动签到检测 ====================

export function autoCheckAbsence(classId: string): { absentStudents: SharedStudent[]; lateStudents: SharedStudent[] } {
  const students = getStudents().filter(s => s.classId === classId);
  const today = new Date().toISOString().split('T')[0];
  const records = getAttendanceRecords();
  const todayRecords = records.filter(r => r.timestamp.startsWith(today) && r.classId === classId);

  const checkedIds = new Set(todayRecords.map(r => r.studentId));
  const absentStudents = students.filter(s => !checkedIds.has(s.id));

  // 迟到: 有签到记录(type=check_in)但签到时间较晚(8:00之后算迟到)
  const lateIds = new Set(todayRecords.filter(r => {
    if (r.type !== 'check_in') return false;
    try {
      const checkinTime = new Date(r.timestamp);
      return checkinTime.getHours() >= 8 && checkinTime.getMinutes() > 0;
    } catch { return false; }
  }).map(r => r.studentId));
  const lateStudents = students.filter(s => lateIds.has(s.id));

  return { absentStudents, lateStudents };
}
