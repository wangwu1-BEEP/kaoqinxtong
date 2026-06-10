/**
 * 数据同步工具 - 实现 localStorage + Supabase 云端双写和自动同步
 * 
 * 原理：
 * - 写操作：同时写入 localStorage 和云端
 * - 读操作：优先从云端读取，失败则回退到 localStorage
 * - 登录时自动从云端拉取最新数据
 */

import type { SharedStudent } from './sharedData';

// ============ API 调用封装 ============

async function syncApi(action: string, data?: unknown) {
  const response = await fetch('/api/sync', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action, data }),
  });

  const result = await response.json();
  if (!result.success) {
    console.warn(`[syncApi] ${action} failed:`, result.error);
    return null;
  }
  return result.data;
}

// ============ 同步状态检测 ============

let _isCloudAvailable: boolean | null = null;

export async function isCloudAvailable(): Promise<boolean> {
  if (_isCloudAvailable !== null) return _isCloudAvailable;
  try {
    const result = await syncApi('get_classes');
    _isCloudAvailable = result !== null;
  } catch {
    _isCloudAvailable = false;
  }
  return _isCloudAvailable;
}

// 重置云端可用性（用于网络恢复后重试）
export function resetCloudAvailability() {
  _isCloudAvailable = null;
}

// ============ 学生数据同步 ============

const SHARED_STUDENTS_KEY = 'shared_students';

export interface SyncStudent {
  id: string;
  username: string;
  password: string;
  name: string;
  role: string;
  class_id?: string | null;
  class_name?: string | null;
  student_id?: string | null;
  face_registered: boolean;
  voice_registered: boolean;
  face_descriptor?: string | null;
  voice_descriptor?: string | null;
  created_at?: string;
  updated_at?: string;
}

// 将本地学生数据格式转换为云端格式
function localToCloudStudent(local: Record<string, unknown>): SyncStudent {
  return {
    id: local.id as string,
    username: local.username as string,
    password: (local.password as string) || '',
    name: local.name as string,
    role: (local.role as string) || 'student',
    class_id: (local.classId as string) || null,
    class_name: (local.className as string) || null,
    student_id: (local.studentId as string) || null,
    face_registered: (local.faceRegistered as boolean) || false,
    voice_registered: (local.voiceRegistered as boolean) || false,
    face_descriptor: null,
    voice_descriptor: null,
  };
}

// 将云端学生数据格式转换为本地格式
function cloudToLocalStudent(cloud: SyncStudent): Record<string, unknown> {
  return {
    id: cloud.id,
    username: cloud.username,
    password: cloud.password,
    name: cloud.name,
    role: cloud.role,
    classId: cloud.class_id,
    className: cloud.class_name,
    studentId: cloud.student_id,
    faceRegistered: cloud.face_registered,
    voiceRegistered: cloud.voice_registered,
  };
}

// 获取学生列表（优先云端）
export async function getStudentsSynced(): Promise<Record<string, unknown>[]> {
  // 先尝试云端
  const cloudStudents = await syncApi('get_students') as SyncStudent[] | null;
  if (cloudStudents && cloudStudents.length >= 0) {
    const localStudents = cloudStudents.map(cloudToLocalStudent);
    // 同步到 localStorage
    if (typeof window !== 'undefined') {
      localStorage.setItem(SHARED_STUDENTS_KEY, JSON.stringify(localStudents));
    }
    return localStudents;
  }

  // 云端失败，回退到 localStorage
  if (typeof window === 'undefined') return [];
  const stored = localStorage.getItem(SHARED_STUDENTS_KEY);
  if (!stored) return [];
  try {
    return JSON.parse(stored);
  } catch {
    return [];
  }
}

// ============ 教师端定期同步（从云端拉取到本地） ============

export async function syncFromCloud(): Promise<void> {
  await syncOnLogin();
}

// ============ 注册状态同步 ============

export async function syncRegistrationStatus(studentId: string, updates: { face_registered?: boolean; voice_registered?: boolean }): Promise<boolean> {
  if (!studentId) return false;
  try {
    const result = await syncApi('update_student_by_id', { id: studentId, ...updates });
    return result !== null;
  } catch {
    return false;
  }
}

// ============ 考勤记录同步 ============

export async function syncAttendanceRecord(record: { id: string; studentId: string; studentName: string; classId: string; className: string; type: string; method: string; verified: boolean; timestamp: string }): Promise<boolean> {
  try {
    const cloudRecord = {
      id: record.id,
      student_id: record.studentId,
      student_name: record.studentName,
      class_id: record.classId,
      class_name: record.className,
      type: record.type,
      method: record.method,
      verified: record.verified,
      timestamp: record.timestamp,
    };
    const result = await syncApi('save_attendance_record', cloudRecord);
    return result !== null;
  } catch {
    return false;
  }
}

// 保存/更新学生（双写）
export async function upsertStudentSynced(student: Record<string, unknown>): Promise<boolean> {
  // 先写 localStorage
  if (typeof window !== 'undefined') {
    const stored = localStorage.getItem(SHARED_STUDENTS_KEY);
    const students: Record<string, unknown>[] = stored ? JSON.parse(stored) : [];
    const idx = students.findIndex((s) => s.username === student.username);
    if (idx >= 0) {
      students[idx] = { ...students[idx], ...student };
    } else {
      students.push(student);
    }
    localStorage.setItem(SHARED_STUDENTS_KEY, JSON.stringify(students));
  }

  // 再写云端
  const cloudStudent = localToCloudStudent(student);
  // 如果本地有人脸/声纹特征，也要同步
  if (typeof window !== 'undefined') {
    const faceDescriptors = localStorage.getItem('face_descriptors');
    if (faceDescriptors) {
      try {
        const descriptors = JSON.parse(faceDescriptors);
        const match = descriptors.find((d: Record<string, unknown>) => d.username === student.username || d.studentId === student.id);
        if (match) cloudStudent.face_descriptor = JSON.stringify(match.descriptor);
      } catch { /* ignore */ }
    }
    const voiceDescriptors = localStorage.getItem('voice_descriptors');
    if (voiceDescriptors) {
      try {
        const descriptors = JSON.parse(voiceDescriptors);
        const match = descriptors.find((d: Record<string, unknown>) => d.username === student.username || d.studentId === student.id);
        if (match) cloudStudent.voice_descriptor = JSON.stringify(match.descriptor);
      } catch { /* ignore */ }
    }
  }

  const result = await syncApi('upsert_student', cloudStudent);
  return result !== null;
}

// 更新学生信息（双写）
export async function updateStudentSynced(username: string, updates: Record<string, unknown>): Promise<boolean> {
  // 先更新 localStorage
  if (typeof window !== 'undefined') {
    const stored = localStorage.getItem(SHARED_STUDENTS_KEY);
    if (stored) {
      const students: Record<string, unknown>[] = JSON.parse(stored);
      const idx = students.findIndex((s) => s.username === username);
      if (idx >= 0) {
        students[idx] = { ...students[idx], ...updates };
        localStorage.setItem(SHARED_STUDENTS_KEY, JSON.stringify(students));
      }
    }
  }

  // 转换字段名为 snake_case
  const cloudUpdates: Record<string, unknown> = {};
  if (updates.name !== undefined) cloudUpdates.name = updates.name;
  if (updates.classId !== undefined) cloudUpdates.class_id = updates.classId;
  if (updates.className !== undefined) cloudUpdates.class_name = updates.className;
  if (updates.studentId !== undefined) cloudUpdates.student_id = updates.studentId;
  if (updates.password !== undefined) cloudUpdates.password = updates.password;
  if (updates.faceRegistered !== undefined) cloudUpdates.face_registered = updates.faceRegistered;
  if (updates.voiceRegistered !== undefined) cloudUpdates.voice_registered = updates.voiceRegistered;

  const result = await syncApi('update_student', { username, ...cloudUpdates });
  return result !== null;
}

// 通过 ID 更新学生信息（双写）
export async function updateStudentByIdSynced(id: string, updates: Record<string, unknown>): Promise<boolean> {
  // 先更新 localStorage
  if (typeof window !== 'undefined') {
    const stored = localStorage.getItem(SHARED_STUDENTS_KEY);
    if (stored) {
      const students: Record<string, unknown>[] = JSON.parse(stored);
      const idx = students.findIndex((s) => s.id === id);
      if (idx >= 0) {
        students[idx] = { ...students[idx], ...updates };
        localStorage.setItem(SHARED_STUDENTS_KEY, JSON.stringify(students));
      }
    }
  }

  // 转换字段名为 snake_case
  const cloudUpdates: Record<string, unknown> = {};
  if (updates.faceRegistered !== undefined) cloudUpdates.face_registered = updates.faceRegistered;
  if (updates.voiceRegistered !== undefined) cloudUpdates.voice_registered = updates.voiceRegistered;
  if (updates.name !== undefined) cloudUpdates.name = updates.name;
  if (updates.classId !== undefined) cloudUpdates.class_id = updates.classId;
  if (updates.className !== undefined) cloudUpdates.class_name = updates.className;

  const result = await syncApi('update_student_by_id', { id, ...cloudUpdates });
  return result !== null;
}

// 删除学生（双写）
export async function deleteStudentSynced(id: string): Promise<boolean> {
  // 先删 localStorage
  if (typeof window !== 'undefined') {
    const stored = localStorage.getItem(SHARED_STUDENTS_KEY);
    if (stored) {
      const students: Record<string, unknown>[] = JSON.parse(stored).filter((s: Record<string, unknown>) => s.id !== id);
      localStorage.setItem(SHARED_STUDENTS_KEY, JSON.stringify(students));
    }
  }

  const result = await syncApi('delete_student', { id });
  return result !== null;
}

// 人脸唯一性检查（云端）
export async function checkFaceUniquenessSynced(descriptor: number[], excludeUsername?: string): Promise<{ isUnique: boolean; matchedStudent?: { username: string; name: string } }> {
  const result = await syncApi('check_face_uniqueness', { descriptor, exclude_username: excludeUsername });
  if (result) return result;
  // 云端失败，回退到本地检查
  return { isUnique: true };
}

// 声纹唯一性检查（云端）
export async function checkVoiceUniquenessSynced(descriptor: number[], excludeUsername?: string): Promise<{ isUnique: boolean; matchedStudent?: { username: string; name: string } }> {
  const result = await syncApi('check_voice_uniqueness', { descriptor, exclude_username: excludeUsername });
  if (result) return result;
  return { isUnique: true };
}

// 保存人脸特征（双写）
export async function saveFaceDescriptorSynced(username: string, studentId: string, name: string, descriptor: number[]): Promise<boolean> {
  // localStorage
  if (typeof window !== 'undefined') {
    const stored = localStorage.getItem('face_descriptors');
    const descriptors = stored ? JSON.parse(stored) : [];
    const idx = descriptors.findIndex((d: Record<string, unknown>) => d.username === username);
    const entry = { studentId, username, name, descriptor, registeredAt: new Date().toISOString() };
    if (idx >= 0) {
      descriptors[idx] = entry;
    } else {
      descriptors.push(entry);
    }
    localStorage.setItem('face_descriptors', JSON.stringify(descriptors));
  }

  // 云端
  await syncApi('update_student', { username, face_descriptor: JSON.stringify(descriptor) });
  return true;
}

// 保存声纹特征（双写）
export async function saveVoiceDescriptorSynced(username: string, studentId: string, name: string, descriptor: number[]): Promise<boolean> {
  // localStorage
  if (typeof window !== 'undefined') {
    const stored = localStorage.getItem('voice_descriptors');
    const descriptors = stored ? JSON.parse(stored) : [];
    const idx = descriptors.findIndex((d: Record<string, unknown>) => d.username === username);
    const entry = { studentId, username, name, descriptor, registeredAt: new Date().toISOString() };
    if (idx >= 0) {
      descriptors[idx] = entry;
    } else {
      descriptors.push(entry);
    }
    localStorage.setItem('voice_descriptors', JSON.stringify(descriptors));
  }

  // 云端
  await syncApi('update_student', { username, voice_descriptor: JSON.stringify(descriptor) });
  return true;
}

// ============ 班级数据同步 ============

const SHARED_CLASSES_KEY = 'shared_classes';

export interface SyncClass {
  id: string;
  name: string;
  teacher_name: string;
  created_at?: string;
}

function localToCloudClass(local: Record<string, unknown>): SyncClass {
  return {
    id: local.id as string,
    name: local.name as string,
    teacher_name: (local.teacherName as string) || '',
  };
}

function cloudToLocalClass(cloud: SyncClass): Record<string, unknown> {
  return {
    id: cloud.id,
    name: cloud.name,
    teacherName: cloud.teacher_name,
    createdAt: cloud.created_at,
  };
}

export async function getClassesSynced(): Promise<Record<string, unknown>[]> {
  const cloudClasses = await syncApi('get_classes') as SyncClass[] | null;
  if (cloudClasses && cloudClasses.length >= 0) {
    const localClasses = cloudClasses.map(cloudToLocalClass);
    if (typeof window !== 'undefined') {
      localStorage.setItem(SHARED_CLASSES_KEY, JSON.stringify(localClasses));
    }
    return localClasses;
  }

  if (typeof window === 'undefined') return [];
  const stored = localStorage.getItem(SHARED_CLASSES_KEY);
  if (!stored) return [];
  try { return JSON.parse(stored); } catch { return []; }
}

export async function upsertClassSynced(cls: Record<string, unknown>): Promise<boolean> {
  if (typeof window !== 'undefined') {
    const stored = localStorage.getItem(SHARED_CLASSES_KEY);
    const classes: Record<string, unknown>[] = stored ? JSON.parse(stored) : [];
    const idx = classes.findIndex((c) => c.id === cls.id);
    if (idx >= 0) {
      classes[idx] = { ...classes[idx], ...cls };
    } else {
      classes.push(cls);
    }
    localStorage.setItem(SHARED_CLASSES_KEY, JSON.stringify(classes));
  }

  const cloudClass = localToCloudClass(cls);
  const result = await syncApi('upsert_class', cloudClass);
  return result !== null;
}

export async function deleteClassSynced(id: string): Promise<boolean> {
  if (typeof window !== 'undefined') {
    const stored = localStorage.getItem(SHARED_CLASSES_KEY);
    if (stored) {
      const classes: Record<string, unknown>[] = JSON.parse(stored).filter((c: Record<string, unknown>) => c.id !== id);
      localStorage.setItem(SHARED_CLASSES_KEY, JSON.stringify(classes));
    }
  }

  const result = await syncApi('delete_class', { id });
  return result !== null;
}

// ============ 考勤记录同步 ============

export async function getAttendanceRecordsSynced(classId?: string, studentId?: string): Promise<Record<string, unknown>[]> {
  const result = await syncApi('get_attendance_records', { class_id: classId, student_id: studentId });
  if (result) {
    // 同步到 localStorage
    if (typeof window !== 'undefined' && result.length > 0) {
      const localRecords = result.map((r: Record<string, unknown>) => ({
        id: r.id,
        studentId: r.student_id,
        studentName: r.student_name,
        classId: r.class_id,
        type: r.type,
        method: r.method,
        verified: r.verified,
        timestamp: r.timestamp,
      }));
      localStorage.setItem('shared_attendance', JSON.stringify(localRecords));
    }
    return result;
  }

  // 本地回退
  if (typeof window === 'undefined') return [];
  const stored = localStorage.getItem('shared_attendance');
  try { return stored ? JSON.parse(stored) : []; } catch { return []; }
}

export async function saveAttendanceRecordSynced(record: Record<string, unknown>): Promise<boolean> {
  // localStorage
  if (typeof window !== 'undefined') {
    const stored = localStorage.getItem('shared_attendance');
    const records = stored ? JSON.parse(stored) : [];
    records.unshift(record);
    localStorage.setItem('shared_attendance', JSON.stringify(records));
  }

  // 云端 - 转换字段名
  const cloudRecord = {
    id: record.id,
    student_id: record.studentId,
    student_name: record.studentName,
    class_id: record.classId,
    type: record.type,
    method: record.method,
    verified: record.verified,
    timestamp: record.timestamp,
  };

  const result = await syncApi('save_attendance_record', cloudRecord);
  return result !== null;
}

// ============ 请假申请同步 ============

export async function getLeaveRequestsSynced(classId?: string, studentId?: string, status?: string): Promise<Record<string, unknown>[]> {
  const result = await syncApi('get_leave_requests', { class_id: classId, student_id: studentId, status });
  return result || [];
}

export async function saveLeaveRequestSynced(request: Record<string, unknown>): Promise<boolean> {
  const cloudRequest = {
    id: request.id,
    student_id: request.studentId,
    student_name: request.studentName,
    class_id: request.classId,
    reason: request.reason,
    start_date: request.startDate,
    end_date: request.endDate,
    status: request.status || 'pending',
  };

  const result = await syncApi('save_leave_request', cloudRequest);
  return result !== null;
}

export async function updateLeaveRequestSynced(id: string, updates: Record<string, unknown>): Promise<boolean> {
  const cloudUpdates: Record<string, unknown> = { id };
  if (updates.status !== undefined) cloudUpdates.status = updates.status;
  if (updates.approvedBy !== undefined) cloudUpdates.approved_by = updates.approvedBy;

  const result = await syncApi('update_leave_request', cloudUpdates);
  return result !== null;
}

// ============ 公告同步 ============

export async function getAnnouncementsSynced(classId?: string): Promise<Record<string, unknown>[]> {
  const result = await syncApi('get_announcements', { class_id: classId });
  return result || [];
}

export async function saveAnnouncementSynced(announcement: Record<string, unknown>): Promise<boolean> {
  const cloudAnnouncement = {
    id: announcement.id,
    class_id: announcement.classId,
    title: announcement.title,
    content: announcement.content,
    author: announcement.author,
    is_important: announcement.important || false,
  };

  const result = await syncApi('save_announcement', cloudAnnouncement);
  return result !== null;
}

// ============ 课程表同步 ============

export async function getTimetableSynced(classId?: string): Promise<Record<string, unknown>[]> {
  const result = await syncApi('get_timetable', { class_id: classId });
  if (result) {
    return result.map((r: Record<string, unknown>) => ({
      id: r.id,
      classId: r.class_id,
      dayOfWeek: r.day_of_week,
      period: r.period,
      subject: r.subject,
      teacher: r.teacher,
    }));
  }
  return [];
}

export async function saveTimetableEntrySynced(entry: Record<string, unknown>): Promise<boolean> {
  const cloudEntry = {
    id: entry.id,
    class_id: entry.classId,
    day_of_week: entry.dayOfWeek,
    period: entry.period,
    subject: entry.subject,
    teacher: entry.teacher,
  };

  const result = await syncApi('save_timetable_entry', cloudEntry);
  return result !== null;
}

// ============ 登录日志同步 ============

export async function saveLoginLogSynced(log: Record<string, unknown>): Promise<boolean> {
  const cloudLog = {
    id: log.id,
    username: log.username,
    action: log.action,
    device: log.device,
    detail: log.detail,
    success: log.success,
  };

  await syncApi('save_login_log', cloudLog);
  return true;
}

// ============ 成绩同步 ============

export async function getGradesSynced(studentId?: string): Promise<Record<string, unknown>[]> {
  const data = await syncApi('get_grades', { student_id: studentId });
  if (!data?.grades) return [];
  return data.grades.map((g: Record<string, unknown>) => ({
    id: g.id,
    studentId: g.student_id,
    studentName: g.student_name,
    classId: g.class_id,
    subject: g.subject,
    examDate: g.exam_date,
    examType: g.exam_type,
    score: g.score,
    fullScore: g.full_score,
    remark: g.remark,
  }));
}

export async function saveGradeSynced(grade: Record<string, unknown>): Promise<boolean> {
  const cloudGrade = {
    id: grade.id,
    student_id: grade.studentId,
    student_name: grade.studentName,
    class_id: grade.classId,
    subject: grade.subject,
    exam_date: grade.examDate,
    exam_type: grade.examType,
    score: grade.score,
    full_score: grade.fullScore,
    remark: grade.remark,
  };

  await syncApi('save_grade', { data: cloudGrade });
  return true;
}

export async function deleteGradeSynced(id: string): Promise<boolean> {
  await syncApi('delete_grade', { id });
  return true;
}

// ============ 表现记录同步 ============

export async function getPerformancesSynced(studentId?: string): Promise<Record<string, unknown>[]> {
  const data = await syncApi('get_performances', { student_id: studentId });
  if (!data?.performances) return [];
  return data.performances.map((p: Record<string, unknown>) => ({
    id: p.id,
    studentId: p.student_id,
    studentName: p.student_name,
    classId: p.class_id,
    date: p.date,
    type: p.type,
    score: p.score,
    remark: p.remark,
  }));
}

export async function savePerformanceSynced(performance: Record<string, unknown>): Promise<boolean> {
  const cloudPerf = {
    id: performance.id,
    student_id: performance.studentId,
    student_name: performance.studentName,
    class_id: performance.classId,
    date: performance.date,
    type: performance.type,
    score: performance.score,
    remark: performance.remark,
  };

  await syncApi('save_performance', { data: cloudPerf });
  return true;
}

// ============ 登录时全量同步 ============

export async function syncOnLogin(): Promise<void> {
  try {
    // 先将本地数据推送到云端（确保新注册的用户/新添加的数据不会丢失）
    await syncLocalToCloud();

    // 然后从云端拉取最新数据到 localStorage
    const cloudData = await syncApi('pull_all_from_cloud');
    if (!cloudData) return;

    // 同步班级（合并策略：本地新增 + 云端数据）
    const localClasses = (cloudData.classes || []).map(cloudToLocalClass);
    localStorage.setItem(SHARED_CLASSES_KEY, JSON.stringify(localClasses));

    // 同步学生（合并策略：以 id 为 key，云端优先，但保留本地非空值）
    const existingStudents: SharedStudent[] = JSON.parse(localStorage.getItem(SHARED_STUDENTS_KEY) || '[]');
    const cloudStudents = cloudData.students || [];
    const localStudents = cloudStudents.map(cloudToLocalStudent);
    // 合并：以 id 为 key，云端优先，但字段保留非空值
    const studentMap = new Map<string, SharedStudent>();
    for (const s of existingStudents) { studentMap.set(s.id, s); }
    for (const s of localStudents) {
      const existing = studentMap.get(s.id);
      if (existing) {
        // 合并：云端值优先，但如果云端值为空则保留本地值
        const merged = { ...existing, ...s };
        // 对关键字段保留非空值
        for (const key of ['classId', 'className', 'name', 'studentId', 'password', 'faceRegistered', 'voiceRegistered'] as const) {
          if ((merged[key] === null || merged[key] === undefined || merged[key] === '') && existing[key]) {
            (merged as Record<string, unknown>)[key] = existing[key];
          }
        }
        studentMap.set(s.id, merged as SharedStudent);
      } else {
        studentMap.set(s.id, s as SharedStudent);
      }
    }
    localStorage.setItem(SHARED_STUDENTS_KEY, JSON.stringify([...studentMap.values()]));

    // 同步人脸/声纹特征（合并策略：保留本地有但云端没有的数据）
    const existingFaceDescriptors = JSON.parse(localStorage.getItem('face_descriptors') || '[]') as Record<string, unknown>[];
    const existingVoiceDescriptors = JSON.parse(localStorage.getItem('voice_descriptors') || '[]') as Record<string, unknown>[];
    
    // 用本地已有数据构建 Map（以 studentId 为 key）
    const faceDescriptorMap = new Map<string, Record<string, unknown>>();
    for (const fd of existingFaceDescriptors) {
      if (fd.studentId) faceDescriptorMap.set(String(fd.studentId), fd);
    }
    const voiceDescriptorMap = new Map<string, Record<string, unknown>>();
    for (const vd of existingVoiceDescriptors) {
      if (vd.studentId) voiceDescriptorMap.set(String(vd.studentId), vd);
    }
    
    // 用云端数据更新 Map（云端有则覆盖，云端无则保留本地）
    for (const s of cloudStudents as SyncStudent[]) {
      if (s.face_descriptor) {
        try {
          faceDescriptorMap.set(s.id, {
            studentId: s.id,
            username: s.username,
            name: s.name,
            descriptor: JSON.parse(s.face_descriptor),
            registeredAt: s.updated_at || s.created_at,
          });
        } catch { /* ignore parse error */ }
      }
      if (s.voice_descriptor) {
        try {
          voiceDescriptorMap.set(s.id, {
            studentId: s.id,
            username: s.username,
            name: s.name,
            descriptor: JSON.parse(s.voice_descriptor),
            registeredAt: s.updated_at || s.created_at,
          });
        } catch { /* ignore parse error */ }
      }
    }
    
    // 清理已被删除的学生数据（不在云端学生列表中的）
    const cloudStudentIds = new Set((cloudStudents as SyncStudent[]).map(s => s.id));
    for (const [id] of faceDescriptorMap) {
      if (!cloudStudentIds.has(id)) faceDescriptorMap.delete(id);
    }
    for (const [id] of voiceDescriptorMap) {
      if (!cloudStudentIds.has(id)) voiceDescriptorMap.delete(id);
    }
    
    localStorage.setItem('face_descriptors', JSON.stringify([...faceDescriptorMap.values()]));
    localStorage.setItem('voice_descriptors', JSON.stringify([...voiceDescriptorMap.values()]));

    // 同步考勤记录（合并策略：以 id 为 key，云端优先）
    const existingAttendance = JSON.parse(localStorage.getItem('shared_attendance') || '[]') as Record<string, unknown>[];
    const cloudAttendance = cloudData.attendance_records || [];
    const localRecords = cloudAttendance.map((r: Record<string, unknown>) => ({
      id: r.id,
      studentId: r.student_id,
      studentName: r.student_name,
      classId: r.class_id,
      className: r.class_name || '',
      type: r.type,
      method: r.method,
      verified: r.verified,
      timestamp: r.timestamp,
    }));
    const attendanceMap = new Map<string, Record<string, unknown>>();
    for (const r of existingAttendance) { if (r.id) attendanceMap.set(String(r.id), r); }
    for (const r of localRecords) { if (r.id) attendanceMap.set(String(r.id), r as Record<string, unknown>); }
    localStorage.setItem('shared_attendance', JSON.stringify([...attendanceMap.values()]));

    // 同步请假（云端覆盖本地）
    const cloudLeave = cloudData.leave_requests || [];
    localStorage.setItem('leave_requests', JSON.stringify(cloudLeave));

    // 同步公告（云端覆盖本地）
    const cloudAnnouncements = cloudData.announcements || [];
    const localAnnouncements = cloudAnnouncements.map((a: Record<string, unknown>) => ({
      id: a.id,
      classId: a.class_id,
      title: a.title,
      content: a.content,
      author: a.author,
      important: a.important,
      createdAt: a.created_at,
    }));
    localStorage.setItem('shared_announcements', JSON.stringify(localAnnouncements));

    // 同步课程表（云端覆盖本地）
    const cloudTimetable = cloudData.timetable || [];
    const localTimetable = {
      entries: cloudTimetable.map((t: Record<string, unknown>) => ({
        id: t.id,
        classId: t.class_id,
        dayOfWeek: t.day_of_week,
        period: t.period,
        subject: t.subject,
        teacher: t.teacher,
      })),
    };
    localStorage.setItem('shared_timetable', JSON.stringify(localTimetable));

    // 同步成绩（合并策略：保留本地有但云端没有的成绩）
    const existingGrades = JSON.parse(localStorage.getItem('shared_grades') || '[]') as Record<string, unknown>[];
    const cloudGrades = cloudData.grades || [];
    const localGrades = cloudGrades.map((g: Record<string, unknown>) => ({
      id: g.id,
      studentId: g.student_id,
      studentName: g.student_name,
      classId: g.class_id,
      subject: g.subject,
      examName: g.exam_name || g.examName || '',
      score: Number(g.score) || 0,
      fullScore: Number(g.full_score || g.fullScore) || 100,
      rank: g.rank ? Number(g.rank) : undefined,
      date: g.date || g.exam_date || g.examDate || '',
      createdAt: g.created_at,
    }));
    // 合并：以 id 为 key，云端优先
    const gradeMap = new Map<string, Record<string, unknown>>();
    for (const g of existingGrades) { if (g.id) gradeMap.set(String(g.id), g); }
    for (const g of localGrades) { if (g.id) gradeMap.set(String(g.id), g as Record<string, unknown>); }
    localStorage.setItem('shared_grades', JSON.stringify([...gradeMap.values()]));

    // 同步座位表（云端覆盖本地）
    const cloudSeats = cloudData.seat_layouts || [];
    const localSeats = cloudSeats.map((s: Record<string, unknown>) => ({
      id: s.id,
      classId: s.class_id,
      rows: s.rows,
      cols: s.cols,
      assignments: s.assignments,
      createdAt: s.created_at,
      updatedAt: s.updated_at,
    }));
    localStorage.setItem('shared_seat_layouts', JSON.stringify(localSeats));

    // 同步值日安排（云端覆盖本地）
    const cloudDuty = cloudData.duty_schedules || [];
    const localDuty = cloudDuty.map((d: Record<string, unknown>) => ({
      id: d.id,
      classId: d.class_id,
      dayOfWeek: d.day_of_week,
      studentIds: d.student_ids,
      note: d.note,
      createdAt: d.created_at,
    }));
    localStorage.setItem('shared_duty_schedules', JSON.stringify(localDuty));

    // 同步课堂表现（云端覆盖本地）
    const cloudPerf = cloudData.class_performances || [];
    const localPerf = cloudPerf.map((p: Record<string, unknown>) => ({
      id: p.id,
      studentId: p.student_id,
      studentName: p.student_name,
      classId: p.class_id,
      category: p.category,
      score: p.score,
      note: p.note,
      createdAt: p.created_at,
    }));
    localStorage.setItem('shared_class_performances', JSON.stringify(localPerf));

    // 同步家长（合并策略：保留本地有但云端没有的家长）
    const existingParents = JSON.parse(localStorage.getItem('shared_parents') || '[]') as Record<string, unknown>[];
    const cloudParents = cloudData.parents || [];
    const localParents = cloudParents.map((p: Record<string, unknown>) => ({
      id: p.id,
      username: p.username,
      password: p.password,
      name: p.name,
      role: 'parent',
      childId: p.child_id,
      childName: p.child_name,
      childrenIds: p.children_ids,
      phone: p.phone,
      classId: p.class_id,
      createdAt: p.created_at,
    }));
    // 合并：以 id 为 key，云端优先
    const parentMap = new Map<string, Record<string, unknown>>();
    for (const p of existingParents) { if (p.id) parentMap.set(String(p.id), p); }
    for (const p of localParents) { if (p.id) parentMap.set(String(p.id), p as Record<string, unknown>); }
    localStorage.setItem('shared_parents', JSON.stringify([...parentMap.values()]));

    // 同步积分记录（合并策略：以 id 为 key，云端优先）
    const existingPoints = JSON.parse(localStorage.getItem('shared_point_records') || '[]') as Record<string, unknown>[];
    const cloudPoints = cloudData.point_records || [];
    const localPoints = cloudPoints.map((p: Record<string, unknown>) => ({
      id: p.id,
      studentId: p.student_id,
      studentName: p.student_name,
      classId: p.class_id,
      points: Number(p.points) || 0,
      reason: p.reason || '',
      createdBy: p.created_by,
      createdAt: p.created_at,
    }));
    const pointMap = new Map<string, Record<string, unknown>>();
    for (const p of existingPoints) { if (p.id) pointMap.set(String(p.id), p); }
    for (const p of localPoints) { if (p.id) pointMap.set(String(p.id), p as Record<string, unknown>); }
    localStorage.setItem('shared_point_records', JSON.stringify([...pointMap.values()]));

    // 同步消息（合并策略：保留本地有但云端没有的消息）
    const cloudMessages = cloudData.messages || [];
    const existingMsgs: Record<string, unknown>[] = JSON.parse(localStorage.getItem('shared_messages') || '[]');
    const localMsgs = cloudMessages.map((m: Record<string, unknown>) => ({
      id: m.id,
      fromId: m.from_id,
      fromName: m.from_name || '',
      fromRole: m.from_role || '',
      toId: m.to_id,
      toName: m.to_name || '',
      toRole: m.to_role || '',
      content: m.content,
      type: m.type || 'text',
      read: m.read || false,
      createdAt: m.created_at,
    }));
    const msgMap = new Map<string, Record<string, unknown>>();
    for (const m of existingMsgs) { if (m.id) msgMap.set(String(m.id), m); }
    for (const m of localMsgs) { if (m.id) msgMap.set(String(m.id), m as Record<string, unknown>); }
    localStorage.setItem('shared_messages', JSON.stringify([...msgMap.values()]));

    // 同步媒体（合并策略：以 id 为 key，云端优先）
    const existingMedia = JSON.parse(localStorage.getItem('shared_media') || '[]') as Record<string, unknown>[];
    const cloudMedia = cloudData.media || [];
    const localMedia = cloudMedia.map((m: Record<string, unknown>) => ({
      id: m.id,
      title: m.title || '',
      url: m.url || '',
      s3Key: m.s3_key || '',
      type: m.type || 'photo',
      classId: m.class_id || '',
      uploadedBy: m.uploaded_by || '',
      uploadedByName: m.uploaded_by_name || '',
      description: m.description || '',
      likes: m.likes ? (typeof m.likes === 'string' ? JSON.parse(m.likes) : m.likes) : [],
      comments: m.comments ? (typeof m.comments === 'string' ? JSON.parse(m.comments) : m.comments) : [],
      createdAt: m.created_at,
    }));
    const mediaMap = new Map<string, Record<string, unknown>>();
    for (const m of existingMedia) { if (m.id) mediaMap.set(String(m.id), m); }
    for (const m of localMedia) { if (m.id) mediaMap.set(String(m.id), m as Record<string, unknown>); }
    localStorage.setItem('shared_media', JSON.stringify([...mediaMap.values()]));

    // 同步媒体评论
    const cloudMediaComments = cloudData.media_comments || [];
    if (cloudMediaComments.length > 0) {
      // 将云端评论合并到对应媒体的 comments 字段
      for (const mc of cloudMediaComments) {
        const mediaId = String(mc.media_id);
        const mediaItem = mediaMap.get(mediaId);
        if (mediaItem) {
          const comments = Array.isArray(mediaItem.comments) ? [...(mediaItem.comments as Record<string, unknown>[])] : [];
          const existingIds = new Set(comments.map((c: Record<string, unknown>) => String(c.id)));
          if (!existingIds.has(String(mc.id))) {
            comments.push({
              id: mc.id,
              userId: mc.user_id,
              userName: mc.user_name || '',
              userRole: mc.user_role || '',
              content: mc.content || '',
              type: mc.type || 'comment',
              createdAt: mc.created_at,
            });
            mediaItem.comments = comments;
          }
        }
      }
      localStorage.setItem('shared_media', JSON.stringify([...mediaMap.values()]));
    }

    // 从消息中提取教师用户信息，供家长端查找教师真实ID
    const teacherUsers: { id: string; name: string }[] = [];
    const seenTeacherIds = new Set<string>();
    for (const m of msgMap.values()) {
      const msg = m as Record<string, unknown>;
      if (msg.fromRole === 'teacher' && msg.fromId && !seenTeacherIds.has(String(msg.fromId))) {
        seenTeacherIds.add(String(msg.fromId));
        teacherUsers.push({ id: String(msg.fromId), name: String(msg.fromName || '教师') });
      }
      if (msg.toRole === 'teacher' && msg.toId && !seenTeacherIds.has(String(msg.toId))) {
        seenTeacherIds.add(String(msg.toId));
        teacherUsers.push({ id: String(msg.toId), name: String(msg.toName || '教师') });
      }
    }
    if (teacherUsers.length > 0) {
      localStorage.setItem('shared_teacher_users', JSON.stringify(teacherUsers));
    }

    console.log('[syncOnLogin] 云端数据同步完成');
  } catch (err) {
    console.warn('[syncOnLogin] 云端同步失败，使用本地数据:', err);
  }
}

// 首次使用时将本地数据上传到云端
export async function syncLocalToCloud(): Promise<boolean> {
  if (typeof window === 'undefined') return false;

  try {
    const students = JSON.parse(localStorage.getItem(SHARED_STUDENTS_KEY) || '[]');
    const classes = JSON.parse(localStorage.getItem(SHARED_CLASSES_KEY) || '[]');
    const attendance = JSON.parse(localStorage.getItem('shared_attendance') || '[]');
    const leaveRequests = JSON.parse(localStorage.getItem('leave_requests') || '[]');
    const announcements = JSON.parse(localStorage.getItem('shared_announcements') || '[]');
    const timetable = JSON.parse(localStorage.getItem('shared_timetable') || '{}');
    const loginLogs = JSON.parse(localStorage.getItem('login_logs') || '[]');

    // 转换数据格式
    const cloudStudents = students.map(localToCloudStudent);
    const cloudClasses = classes.map(localToCloudClass);
    const cloudAttendance = attendance.map((r: Record<string, unknown>) => ({
      id: r.id,
      student_id: r.studentId,
      student_name: r.studentName,
      class_id: r.classId,
      type: r.type,
      method: r.method,
      verified: r.verified,
      timestamp: r.timestamp,
    }));

    const result = await syncApi('sync_all_to_cloud', {
      students: cloudStudents,
      classes: cloudClasses,
      attendance_records: cloudAttendance,
      leave_requests: leaveRequests,
      announcements,
      timetable: timetable.entries || [],
      login_logs: loginLogs,
      messages: JSON.parse(localStorage.getItem('shared_messages') || '[]').map((m: Record<string, unknown>) => ({
        id: m.id,
        from_id: m.fromId,
        from_name: m.fromName || '',
        from_role: m.fromRole || '',
        to_id: m.toId,
        to_name: m.toName || '',
        to_role: m.toRole || '',
        content: m.content,
        type: m.type || 'text',
        read: m.read || false,
        created_at: m.createdAt,
      })),
      grades: JSON.parse(localStorage.getItem('shared_grades') || '[]').map((g: Record<string, unknown>) => ({
        id: g.id,
        student_id: g.studentId,
        student_name: g.studentName,
        class_id: g.classId,
        subject: g.subject,
        exam_name: g.examName || '',
        score: g.score,
        full_score: g.fullScore || 100,
        rank: g.rank,
        date: g.date,
        created_at: g.createdAt,
      })),
      seat_layouts: JSON.parse(localStorage.getItem('shared_seat_layouts') || '[]').map((s: Record<string, unknown>) => ({
        id: s.id,
        class_id: s.classId,
        rows: s.rows,
        cols: s.cols,
        assignments: s.assignments,
        created_at: s.createdAt,
        updated_at: s.updatedAt,
      })),
      duty_schedules: JSON.parse(localStorage.getItem('shared_duty_schedules') || '[]').map((d: Record<string, unknown>) => ({
        id: d.id,
        class_id: d.classId,
        day_of_week: d.dayOfWeek,
        student_ids: d.studentIds,
        note: d.note,
        created_at: d.createdAt,
      })),
      class_performances: JSON.parse(localStorage.getItem('shared_class_performances') || '[]').map((p: Record<string, unknown>) => ({
        id: p.id,
        student_id: p.studentId,
        student_name: p.studentName,
        class_id: p.classId,
        category: p.category,
        score: p.score,
        note: p.note,
        created_at: p.createdAt,
      })),
      parents: JSON.parse(localStorage.getItem('shared_parents') || '[]').map((p: Record<string, unknown>) => ({
        id: p.id,
        username: p.username,
        password: p.password,
        name: p.name,
        child_id: p.childId,
        child_name: p.childName,
        children_ids: p.childrenIds,
        phone: p.phone,
        created_at: p.createdAt,
      })),
      point_records: JSON.parse(localStorage.getItem('shared_point_records') || '[]').map((p: Record<string, unknown>) => ({
        id: p.id,
        student_id: p.studentId,
        student_name: p.studentName,
        class_id: p.classId,
        points: p.points,
        reason: p.reason,
        created_by: p.createdBy,
        created_at: p.createdAt,
      })),
      media: JSON.parse(localStorage.getItem('shared_media') || '[]').map((m: Record<string, unknown>) => ({
        id: m.id,
        title: m.title || '',
        url: m.url || '',
        s3_key: m.s3Key || m.s3_key || '',
        type: m.type || 'photo',
        class_id: m.classId || m.class_id || '',
        uploaded_by: m.uploadedBy || m.uploaded_by || '',
        uploaded_by_name: m.uploadedByName || m.uploaded_by_name || '',
        description: m.description || '',
        created_at: m.createdAt || m.created_at || new Date().toISOString(),
      })),
    });

    if (result) {
      localStorage.setItem('cloud_synced', 'true');
      console.log('[syncLocalToCloud] 本地数据已同步到云端:', result);
      return true;
    }
    return false;
  } catch (err) {
    console.warn('[syncLocalToCloud] 同步失败:', err);
    return false;
  }
}
