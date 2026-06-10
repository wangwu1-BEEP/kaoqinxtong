/* eslint-disable @typescript-eslint/no-explicit-any */
import { getSupabaseClient } from '@/storage/database/supabase-client';

const supabaseAdmin = getSupabaseClient();

// 考勤记录类型
interface AttendanceRecord {
  id: string;
  student_id: string;
  student_name: string;
  class_id: string;
  type: string;
  method: string;
  verified: boolean;
  timestamp: string;
}

// 请假申请类型
interface LeaveRequestRecord {
  id: string;
  student_id: string;
  student_name: string;
  class_id: string;
  type: string;
  reason: string;
  start_date: string;
  end_date: string;
  status: string;
  teacher_comment: string | null;
  created_at: string;
}

/**
 * 从 localStorage 迁移数据到 Supabase 数据库
 */
export async function migrateLocalToDatabase(): Promise<{
  success: boolean;
  message: string;
  stats?: {
    users: number;
    classes: number;
    students: number;
    timetable: number;
    announcements: number;
    attendance: number;
    leaveRequests: number;
  };
}> {
  try {
    // 检查 Supabase 是否可用
    if (!supabaseAdmin) {
      return {
        success: false,
        message: '数据库未配置，请配置 Supabase 环境变量',
      };
    }

    // 获取 localStorage 数据
    const usersData = localStorage.getItem('shared_users');
    const classesData = localStorage.getItem('shared_classes');
    const studentsData = localStorage.getItem('shared_students');
    const timetableData = localStorage.getItem('shared_timetable');
    const announcementsData = localStorage.getItem('shared_announcements');
    const attendanceData = localStorage.getItem('shared_attendance');
    const leaveData = localStorage.getItem('shared_leave_requests');

    const stats = {
      users: 0,
      classes: 0,
      students: 0,
      timetable: 0,
      announcements: 0,
      attendance: 0,
      leaveRequests: 0,
    };

    // 迁移用户
    if (usersData) {
      const users = JSON.parse(usersData);
      for (const user of users) {
        const { error } = await supabaseAdmin!.from('users').upsert({
          id: user.id,
          username: user.username,
          password: user.password,
          name: user.name,
          role: user.role,
          class_id: user.classId,
          class_name: user.className,
          student_id: user.studentId,
          face_registered: user.faceRegistered || false,
          voice_registered: user.voiceRegistered || false,
          face_descriptor: user.faceDescriptor,
          voice_descriptor: user.voiceDescriptor,
        });
        if (!error) stats.users++;
      }
    }

    // 迁移班级
    if (classesData) {
      const classes = JSON.parse(classesData);
      for (const cls of classes) {
        const { error } = await supabaseAdmin!.from('classes').upsert({
          id: cls.id,
          name: cls.name,
          teacher_id: cls.teacherId,
        });
        if (!error) stats.classes++;
      }
    }

    // 迁移学生
    if (studentsData) {
      const students = JSON.parse(studentsData);
      for (const student of students) {
        const { error } = await supabaseAdmin!.from('students').upsert({
          id: student.id,
          username: student.username,
          name: student.name,
          class_id: student.classId,
          class_name: student.className,
          student_id: student.studentId,
          face_registered: student.faceRegistered || false,
          voice_registered: student.voiceRegistered || false,
          face_descriptor: student.faceDescriptor,
          voice_descriptor: student.voiceDescriptor,
        });
        if (!error) stats.students++;
      }
    }

    // 迁移课程表
    if (timetableData) {
      const timetable = JSON.parse(timetableData);
      for (const entry of timetable) {
        const { error } = await supabaseAdmin!.from('timetable').upsert({
          id: entry.id,
          class_id: entry.classId,
          day_of_week: entry.dayOfWeek,
          period: entry.period,
          subject: entry.subject,
          teacher: entry.teacher,
          start_time: entry.startTime,
          end_time: entry.endTime,
        });
        if (!error) stats.timetable++;
      }
    }

    // 迁移公告
    if (announcementsData) {
      const announcements = JSON.parse(announcementsData);
      for (const ann of announcements) {
        const { error } = await supabaseAdmin!.from('announcements').upsert({
          id: ann.id,
          class_id: ann.classId,
          title: ann.title,
          content: ann.content,
          author: ann.author,
          important: ann.important || false,
          created_at: ann.createdAt,
        });
        if (!error) stats.announcements++;
      }
    }

    // 迁移考勤记录
    if (attendanceData) {
      const attendance = JSON.parse(attendanceData);
      for (const record of attendance) {
        const { error } = await supabaseAdmin!.from('attendance_records').upsert({
          id: record.id,
          student_id: record.studentId,
          student_name: record.studentName,
          class_id: record.classId,
          type: record.type,
          method: record.method,
          verified: record.verified || true,
          timestamp: record.timestamp,
        });
        if (!error) stats.attendance++;
      }
    }

    // 迁移请假申请
    if (leaveData) {
      const leaveRequests = JSON.parse(leaveData);
      for (const req of leaveRequests) {
        const { error } = await supabaseAdmin!.from('leave_requests').upsert({
          id: req.id,
          student_id: req.studentId,
          student_name: req.studentName,
          class_id: req.classId,
          type: req.type,
          reason: req.reason,
          start_date: req.startDate,
          end_date: req.endDate,
          status: req.status,
          teacher_comment: req.teacherComment,
          created_at: req.createdAt,
        });
        if (!error) stats.leaveRequests++;
      }
    }

    // 标记迁移完成
    localStorage.setItem('data_migrated', 'true');

    return {
      success: true,
      message: '数据迁移成功',
      stats,
    };
  } catch (error: unknown) {
    console.error('数据迁移失败:', error);
    return {
      success: false,
      message: `数据迁移失败: ${(error as any).message || '未知错误'}`,
    };
  }
}

/**
 * 从 localStorage 迁移数据到 Supabase 数据库
 */
export async function syncFromLocalStorage(): Promise<{
  success: boolean;
  message: string;
  stats?: {
    users: number;
    classes: number;
    students: number;
    timetable: number;
    announcements: number;
    attendance: number;
    leaveRequests: number;
  };
}> {
  try {
    // 获取 localStorage 数据
    const usersData = localStorage.getItem('shared_users');
    const classesData = localStorage.getItem('shared_classes');
    const timetableData = localStorage.getItem('shared_timetable');
    const announcementsData = localStorage.getItem('shared_announcements');
    const attendanceData = localStorage.getItem('shared_attendance');
    const leaveData = localStorage.getItem('shared_leave_requests');

    const stats = {
      users: 0,
      classes: 0,
      students: 0,
      timetable: 0,
      announcements: 0,
      attendance: 0,
      leaveRequests: 0,
    };

    // 1. 迁移班级
    if (classesData) {
      const classes = JSON.parse(classesData);
      for (const cls of classes) {
        const { error } = await supabaseAdmin!
          .from('classes')
          .upsert({
            id: cls.id,
            name: cls.name,
            description: cls.description || null,
            student_count: cls.studentCount || 0,
          }, { onConflict: 'id' });
        if (!error) stats.classes++;
      }
    }

    // 2. 迁移用户
    if (usersData) {
      const users = JSON.parse(usersData);
      for (const user of users) {
        const { error } = await supabaseAdmin!
          .from('users')
          .upsert({
            id: user.id,
            username: user.username,
            password: user.password,
            name: user.name,
            role: user.role || 'student',
            class_id: user.classId || null,
            class_name: user.className || null,
            student_id: user.studentId || null,
            face_registered: user.faceRegistered || false,
            voice_registered: user.voiceRegistered || false,
            face_descriptor: user.faceDescriptor || null,
            voice_feature: user.voiceFeature || null,
          }, { onConflict: 'id' });
        if (!error) {
          stats.users++;
          if ((user.role || 'student') === 'student') {
            stats.students++;
          }
        }
      }
    }

    // 3. 迁移课程表
    if (timetableData) {
      const timetable = JSON.parse(timetableData);
      for (const entry of timetable) {
        const { error } = await supabaseAdmin!
          .from('timetable')
          .upsert({
            id: entry.id,
            class_id: entry.classId,
            subject: entry.subject,
            teacher: entry.teacher || null,
            day_of_week: entry.dayOfWeek,
            period: entry.period,
            start_time: entry.startTime || null,
            end_time: entry.endTime || null,
          }, { onConflict: 'id' });
        if (!error) stats.timetable++;
      }
    }

    // 4. 迁移公告
    if (announcementsData) {
      const announcements = JSON.parse(announcementsData);
      for (const ann of announcements) {
        const { error } = await supabaseAdmin!
          .from('announcements')
          .upsert({
            id: ann.id,
            class_id: ann.classId,
            title: ann.title,
            content: ann.content,
            author: ann.author,
            author_id: ann.authorId || null,
            important: ann.important || false,
          }, { onConflict: 'id' });
        if (!error) stats.announcements++;
      }
    }

    // 5. 迁移考勤记录
    if (attendanceData) {
      const attendance = JSON.parse(attendanceData);
      for (const record of attendance) {
        const { error } = await supabaseAdmin!
          .from('attendance_records')
          .upsert({
            id: record.id,
            student_id: record.studentId,
            student_name: record.studentName,
            class_id: record.classId,
            type: record.type,
            method: record.method,
            verified: record.verified || true,
            timestamp: record.timestamp,
          }, { onConflict: 'id' });
        if (!error) stats.attendance++;
      }
    }

    // 6. 迁移请假申请
    if (leaveData) {
      const leaveRequests = JSON.parse(leaveData);
      for (const request of leaveRequests) {
        const { error } = await supabaseAdmin!
          .from('leave_requests')
          .upsert({
            id: request.id,
            student_id: request.studentId,
            student_name: request.studentName,
            class_id: request.classId,
            type: request.type,
            reason: request.reason || null,
            start_date: request.startDate || null,
            end_date: request.endDate || null,
            status: request.status || 'pending',
            teacher_comment: request.teacherComment || null,
          }, { onConflict: 'id' });
        if (!error) stats.leaveRequests++;
      }
    }

    return {
      success: true,
      message: '数据同步成功',
      stats,
    };
  } catch (error: unknown) {
    console.error('数据同步失败:', error);
    return {
      success: false,
      message: `数据同步失败: ${(error as any).message || '未知错误'}`,
    };
  }
}

/**
 * 从数据库同步数据到 localStorage（反向同步）
 */
export async function syncFromDatabase(): Promise<{
  success: boolean;
  message: string;
}> {
  if (!supabaseAdmin) {
    return {
      success: false,
      message: '数据库未配置',
    };
  }

  try {
    // 同步用户
    const { data: users, error: usersError } = await supabaseAdmin!
      .from('users')
      .select('*');
    if (!usersError && users) {
      localStorage.setItem('shared_users', JSON.stringify(users));
    }

    // 同步班级
    const { data: classes, error: classesError } = await supabaseAdmin!
      .from('classes')
      .select('*');
    if (!classesError && classes) {
      localStorage.setItem('shared_classes', JSON.stringify(classes));
    }

    // 同步学生
    const { data: students, error: studentsError } = await supabaseAdmin!
      .from('students')
      .select('*');
    if (!studentsError && students) {
      localStorage.setItem('shared_students', JSON.stringify(students));
    }

    // 同步课程表
    const { data: timetable, error: timetableError } = await supabaseAdmin!
      .from('timetable')
      .select('*');
    if (!timetableError && timetable) {
      localStorage.setItem('shared_timetable', JSON.stringify(timetable));
    }

    // 同步公告
    const { data: announcements, error: announcementsError } = await supabaseAdmin!
      .from('announcements')
      .select('*');
    if (!announcementsError && announcements) {
      localStorage.setItem('shared_announcements', JSON.stringify(announcements));
    }

    // 同步考勤记录
    const { data: attendance, error: attendanceError } = await supabaseAdmin!
      .from('attendance_records')
      .select('*');
    if (!attendanceError && attendance) {
      localStorage.setItem('shared_attendance', JSON.stringify(attendance));
    }

    // 同步请假申请
    const { data: leaveRequests, error: leaveError } = await supabaseAdmin!
      .from('leave_requests')
      .select('*');
    if (!leaveError && leaveRequests) {
      localStorage.setItem('shared_leave_requests', JSON.stringify(leaveRequests));
    }

    return {
      success: true,
      message: '数据同步成功',
    };
  } catch (error: unknown) {
    return {
      success: false,
      message: `同步失败: ${(error as any).message}`,
    };
  }
}

/**
 * 从数据库同步数据到 localStorage
 */
export async function syncToLocalStorage(): Promise<{
  success: boolean;
  message: string;
}> {
  try {
    // 同步班级
    const { data: classes } = await supabaseAdmin!.from('classes').select('*');
    if (classes) {
      localStorage.setItem('shared_classes', JSON.stringify(classes.map((c: any) => ({
        id: c.id,
        name: c.name,
        description: c.description,
        studentCount: c.student_count,
      }))));
    }

    // 同步用户
    const { data: users } = await supabaseAdmin!.from('users').select('*');
    if (users) {
      localStorage.setItem('shared_users', JSON.stringify(users.map((u: any) => ({
        id: u.id,
        username: u.username,
        password: u.password,
        name: u.name,
        role: u.role,
        classId: u.class_id,
        className: u.class_name,
        studentId: u.student_id,
        faceRegistered: u.face_registered,
        voiceRegistered: u.voice_registered,
        faceDescriptor: u.face_descriptor,
        voiceFeature: u.voice_feature,
      }))));
    }

    // 同步课程表
    const { data: timetable } = await supabaseAdmin!.from('timetable').select('*');
    if (timetable) {
      localStorage.setItem('shared_timetable', JSON.stringify(timetable.map((t: any) => ({
        id: t.id,
        classId: t.class_id,
        subject: t.subject,
        teacher: t.teacher,
        dayOfWeek: t.day_of_week,
        period: t.period,
        startTime: t.start_time,
        endTime: t.end_time,
      }))));
    }

    // 同步公告
    const { data: announcements } = await supabaseAdmin!.from('announcements').select('*');
    if (announcements) {
      localStorage.setItem('shared_announcements', JSON.stringify(announcements.map((a: any) => ({
        id: a.id,
        classId: a.class_id,
        title: a.title,
        content: a.content,
        author: a.author,
        authorId: a.author_id,
        important: a.important,
        createdAt: a.created_at,
      }))));
    }

    // 同步考勤记录
    const { data: attendance } = await supabaseAdmin!.from('attendance_records').select('*');
    if (attendance) {
      localStorage.setItem('shared_attendance', JSON.stringify(attendance.map((r: any) => ({
        id: r.id,
        studentId: r.student_id,
        studentName: r.student_name,
        classId: r.class_id,
        type: r.type,
        method: r.method,
        verified: r.verified,
        timestamp: r.timestamp,
      }))));
    }

    // 同步请假申请
    const { data: leaveRequests } = await supabaseAdmin!.from('leave_requests').select('*');
    if (leaveRequests) {
      localStorage.setItem('shared_leave_requests', JSON.stringify(leaveRequests.map((l: any) => ({
        id: l.id,
        studentId: l.student_id,
        studentName: l.student_name,
        classId: l.class_id,
        type: l.type,
        reason: l.reason,
        startDate: l.start_date,
        endDate: l.end_date,
        status: l.status,
        teacherComment: l.teacher_comment,
        createdAt: l.created_at,
      }))));
    }

    return {
      success: true,
      message: '数据同步成功',
    };
  } catch (error: unknown) {
    console.error('数据同步失败:', error);
    return {
      success: false,
      message: `数据同步失败: ${(error as any).message || '未知错误'}`,
    };
  }
}
