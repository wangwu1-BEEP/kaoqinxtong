// 用户角色
export type UserRole = 'teacher' | 'student' | 'parent';

// 用户类型
export interface User {
  id: string;
  username: string;
  name: string;
  role: UserRole;
  classId?: string; // 学生关联班级
  className?: string; // 班级名称
  studentId?: string; // 学号
  childId?: string; // 家长关联的学生ID
  childName?: string; // 家长关联的学生姓名
  avatar?: string;
  faceDescriptor?: Float32Array;
  voiceDescriptor?: Float32Array;
  teacherType?: 'head-teacher' | 'subject-teacher'; // 班主任/任课教师
  subject?: string; // 任教科目
  note?: string; // 备注
  points?: number; // 积分
  createdAt: Date;
}

// 考勤类型枚举
export type AttendanceType = 'check_in' | 'check_out' | 'leave' | 'go_out';

// 考勤状态
export interface AttendanceRecord {
  id: string;
  studentId: string;
  studentName: string;
  classId: string;
  type: AttendanceType;
  timestamp: Date;
  method: 'face' | 'voice' | 'both';
  verified: boolean;
}

// 学生信息
export interface Student {
  id: string;
  username: string;
  name: string;
  classId: string;
  className: string;
  studentId?: string;
  faceDescriptor?: Float32Array;
  voiceDescriptor?: Float32Array;
}

// 班级信息
export interface ClassInfo {
  id: string;
  name: string;
  teacherId: string;
  teacherName: string;
  studentCount: number;
  checkedInCount: number;
}

// 考勤统计
export interface AttendanceStats {
  total: number;
  checkedIn: number;
  checkedOut: number;
  onLeave: number;
  outOfSchool: number;
}

// 识别结果
export interface RecognitionResult {
  success: boolean;
  student?: Student;
  user?: User;
  confidence?: number;
  similarity?: number;
  message: string;
}

// 声纹特征
export interface VoiceFeature {
  data: Float32Array;
  timestamp: number;
}

// ===== 新增类型 =====

// 成绩类型
export interface GradeRecord {
  id: string;
  studentId: string;
  studentName: string;
  classId: string;
  subject: string;
  examName: string;       // 考试名称（如期中考试、月考1等）
  score: number;
  fullScore: number;      // 满分
  rank?: number;          // 排名
  date: string;           // 考试日期
  createdAt: string;
}

// 成绩别名
export type Grade = GradeRecord;

// 请假申请
export interface LeaveRequest {
  id: string;
  studentId: string;
  studentName: string;
  classId: string;
  reason: string;
  startDate: string;
  endDate: string;
  status: 'pending' | 'approved' | 'rejected';
  approvedBy?: string;
  createdAt: string;
}

// 消息类型
export interface Message {
  id: string;
  fromId: string;
  fromName: string;
  fromRole: UserRole;
  toId: string;
  toName: string;
  toRole: UserRole;
  content: string;
  createdAt: string;
  read: boolean;
}

// 媒体类型
export type MediaType = 'photo' | 'video';

// 班级媒体
export interface ClassMedia {
  id: string;
  classId: string;
  title: string;
  description?: string;
  type: MediaType;
  url: string;            // 签名 URL（临时）或 base64
  s3Key?: string;         // S3 对象 key（持久化标识）
  thumbnailUrl?: string;  // 缩略图
  uploadedBy: string;
  uploadedByName: string;
  createdAt: string;
}

// 家长信息
export interface ParentInfo {
  id: string;
  username: string;
  name: string;
  password: string;
  role: 'parent';
  childId: string;        // 关联的学生ID
  childName: string;
  classId: string;
  className: string;
  phone?: string;
  childrenIds?: string[];      // 支持多个孩子
  childrenClassIds?: string[]; // 多个孩子对应的班级
}

// 别名
export type MessageRecord = Message;
export type MediaRecord = ClassMedia;

// 学习趋势数据点
export interface TrendDataPoint {
  date: string;
  subject: string;
  score: number;
  fullScore: number;
  examName: string;
}

// 考勤类型显示配置
export const ATTENDANCE_TYPE_CONFIG: Record<AttendanceType, { label: string; icon: string; color: string }> = {
  check_in: { label: '上课打卡', icon: 'LogIn', color: 'text-green-500' },
  check_out: { label: '下课打卡', icon: 'LogOut', color: 'text-blue-500' },
  leave: { label: '请假', icon: 'CalendarX', color: 'text-yellow-500' },
  go_out: { label: '外出', icon: 'ExternalLink', color: 'text-purple-500' },
};

// 考勤类型中文标签
export const ATTENDANCE_TYPE_LABELS: Record<AttendanceType, string> = {
  check_in: '上课打卡',
  check_out: '下课打卡',
  leave: '请假',
  go_out: '外出',
};

// 座位表
export interface SeatLayout {
  id: string;
  classId: string;
  rows: number;
  cols: number;
  seats: SeatAssignment[];  // 座位分配
  updatedAt: string;
}

export interface SeatAssignment {
  row: number;       // 行(从0开始)
  col: number;       // 列(从0开始)
  studentId: string;
  studentName: string;
}

// 值日安排
export interface DutySchedule {
  id: string;
  classId: string;
  date: string;           // 日期 YYYY-MM-DD
  dutyType: string;       // 值日类型：卫生/纪律/领读/值日班长
  studentIds: string[];   // 值日学生ID列表
  studentNames: string[]; // 值日学生姓名列表
  note?: string;          // 备注
  createdAt: string;
}

// 课堂表现评分
export interface ClassPerformance {
  id: string;
  classId: string;
  studentId: string;
  studentName: string;
  score: number;          // 1-5分
  category: 'participation' | 'discipline' | 'homework' | 'teamwork';  // 评分类别
  note?: string;
  date: string;           // 评分日期
  createdBy: string;      // 评分教师
  createdAt: string;
}

// 相册评论
export interface MediaComment {
  id: string;
  mediaId: string;        // 媒体文件ID
  userId: string;
  userName: string;
  userRole: 'student' | 'teacher' | 'parent';
  content: string;
  type?: 'comment' | 'like';  // 评论或点赞记录
  createdAt: string;
}

// 积分记录
export interface PointRecord {
  id: string;
  userId?: string;
  studentId?: string;
  studentName?: string;
  userName?: string;
  classId?: string;
  type?: 'checkin' | 'performance' | 'duty' | 'bonus' | 'penalty'; // 积分类型
  category?: 'attendance' | 'performance' | 'bonus' | 'deduction';  // 类别
  points: number;         // 积分值(正数加分,负数扣分)
  reason: string;         // 原因描述
  action?: string;        // 操作描述
  createdBy?: string;     // 操作人(教师)
  createdAt: string;
}

// 公告（扩展）
export interface Announcement {
  id: string;
  title: string;
  content: string;
  createdBy: string;
  creatorName: string;
  createdAt: string;
  priority?: 'normal' | 'important' | 'urgent';
}

// 媒体点赞
export interface MediaLike {
  id: string;
  mediaId: string;       // 媒体ID
  userId: string;        // 点赞用户ID
  userName: string;      // 点赞用户名
  createdAt: string;
}

// 媒体评论
// 教师角色类型
export type TeacherRole = 'headteacher' | 'subject';  // 班主任 | 任课教师
