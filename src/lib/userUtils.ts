/* eslint-disable @typescript-eslint/no-explicit-any */
import { Student, UserRole } from '@/types/attendance';

// 学生共享数据类型（用于考勤等）
export interface SharedStudent {
  id: string;
  username: string;
  name: string;
  classId?: string;
  className?: string;
  studentId?: string;
}

const CURRENT_USER_KEY = 'user';

// 本地存储的用户信息结构
export interface StoredUser {
  id: string;
  username: string;
  name: string;
  role: UserRole;
  password?: string;
  classId?: string;
  className?: string;
  studentId?: string;
}

// 获取当前登录用户
export function getCurrentUser(): StoredUser | null {
  if (typeof window === 'undefined') return null;
  
  const stored = localStorage.getItem(CURRENT_USER_KEY);
  if (!stored) return null;
  
  try {
    const user: StoredUser = JSON.parse(stored);
    
    // 如果是学生，从 shared_students 同步最新的注册状态和个人信息
    if (user.role === 'student') {
      try {
        const studentsStr = localStorage.getItem('shared_students');
        if (studentsStr) {
          const students = JSON.parse(studentsStr);
          const student = students.find((s: any) => s.username === user.username || s.id === user.id);
          if (student) {
            (user as any).faceRegistered = student.faceRegistered || false;
            (user as any).voiceRegistered = student.voiceRegistered || false;
            // 同步最新个人信息
            user.name = student.name || user.name;
            user.classId = student.classId || user.classId;
            user.className = student.className || user.className;
            user.studentId = student.studentId || user.studentId;
          }
        }
      } catch {
        // 忽略错误
      }
    }
    
    return user;
  } catch {
    return null;
  }
}

// 获取班级名称
function getClassName(classId?: string): string | undefined {
  if (!classId) return undefined;
  const classNames: Record<string, string> = {
    'class-001': '初三（1）班',
    'class-002': '初三（2）班',
    'class-003': '初三（3）班',
  };
  return classNames[classId];
}

// 获取当前用户姓名
export function getCurrentUserName(): string {
  const user = getCurrentUser();
  return user?.name || '未知用户';
}

// 检查是否已登录
export function isLoggedIn(): boolean {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem(CURRENT_USER_KEY) !== null;
}

// 获取登录用户角色
export function getUserRole(): UserRole | null {
  if (typeof window === 'undefined') return null;
  const stored = localStorage.getItem(CURRENT_USER_KEY);
  if (!stored) return null;
  try {
    const user = JSON.parse(stored);
    return user.role || null;
  } catch {
    return null;
  }
}

// 退出登录
export function getLogout(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(CURRENT_USER_KEY);
}
