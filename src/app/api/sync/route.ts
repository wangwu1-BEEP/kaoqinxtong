import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient, loadEnv } from '@/storage/database/supabase-client';

let _supabase: ReturnType<typeof getSupabaseClient> | null = null;
function getDb() {
  if (!_supabase) {
    _supabase = getSupabaseClient();
  }
  return _supabase;
}

// 同步学生数据到云端
export async function POST(request: NextRequest) {
  try {
    // Check if Supabase is properly configured
    loadEnv();
    if (!process.env.COZE_SUPABASE_URL || !process.env.COZE_SUPABASE_ANON_KEY) {
      return NextResponse.json({ success: false, error: 'Supabase not configured' }, { status: 503 });
    }
    
    const supabase = getDb();
    const body = await request.json();
    const { action, data } = body;

    switch (action) {
      // ===== 学生操作 =====
      case 'get_students': {
        const { data: students, error } = await supabase
          .from('students')
          .select('id, username, password, name, role, class_id, class_name, student_id, face_registered, face_descriptor, created_at, updated_at')
          .order('created_at', { ascending: true });
        if (error) throw new Error(`查询学生失败: ${error.message}`);
        return NextResponse.json({ success: true, data: students });
      }

      case 'get_student_by_username': {
        const { username } = data;
        const { data: student, error } = await supabase
          .from('students')
          .select('*')
          .eq('username', username)
          .maybeSingle();
        if (error) throw new Error(`查询学生失败: ${error.message}`);
        return NextResponse.json({ success: true, data: student });
      }

      case 'upsert_student': {
        // 先确保班级存在（解决外键约束问题）
        if (data.class_id) {
          await supabase
            .from('classes')
            .upsert({
              id: data.class_id,
              name: data.class_name || '未分配班级',
              teacher_name: data.teacher_name || '',
            }, { onConflict: 'id' });
        }
        const { error } = await supabase
          .from('students')
          .upsert(data, { onConflict: 'username' });
        if (error) throw new Error(`同步学生失败: ${error.message}`);
        return NextResponse.json({ success: true });
      }

      case 'update_student': {
        const { username, ...updates } = data;
        const { error } = await supabase
          .from('students')
          .update({ ...updates, updated_at: new Date().toISOString() })
          .eq('username', username);
        if (error) throw new Error(`更新学生失败: ${error.message}`);
        return NextResponse.json({ success: true });
      }

      case 'update_student_by_id': {
        const { id, ...updates } = data;
        const { error } = await supabase
          .from('students')
          .update({ ...updates, updated_at: new Date().toISOString() })
          .eq('id', id);
        if (error) throw new Error(`更新学生失败: ${error.message}`);
        return NextResponse.json({ success: true });
      }

      case 'delete_student': {
        const { id } = data;
        const { error } = await supabase
          .from('students')
          .delete()
          .eq('id', id);
        if (error) throw new Error(`删除学生失败: ${error.message}`);
        return NextResponse.json({ success: true });
      }

      case 'check_face_uniqueness': {
        const { descriptor, exclude_username } = data;
        const { data: students, error } = await supabase
          .from('students')
          .select('username, name, face_descriptor')
          .not('face_descriptor', 'is', null);
        if (error) throw new Error(`查询人脸特征失败: ${error.message}`);

        let matchedStudent = null;
        for (const s of students) {
          if (s.username === exclude_username) continue;
          try {
            const storedDescriptor = JSON.parse(s.face_descriptor!);
            const distance = euclideanDistance(descriptor, storedDescriptor);
            if (distance < 0.6) {
              matchedStudent = { username: s.username, name: s.name, distance };
              break;
            }
          } catch {
            // 忽略解析错误
          }
        }
        return NextResponse.json({ success: true, data: { isUnique: !matchedStudent, matchedStudent } });
      }

      // ===== 班级操作 =====
      case 'get_classes': {
        const { data: classes, error } = await supabase
          .from('classes')
          .select('*')
          .order('created_at', { ascending: true });
        if (error) throw new Error(`查询班级失败: ${error.message}`);
        return NextResponse.json({ success: true, data: classes });
      }

      case 'upsert_class': {
        const { error } = await supabase
          .from('classes')
          .upsert(data, { onConflict: 'id' });
        if (error) throw new Error(`同步班级失败: ${error.message}`);
        return NextResponse.json({ success: true });
      }

      case 'delete_class': {
        const { id } = data;
        const { error } = await supabase
          .from('classes')
          .delete()
          .eq('id', id);
        if (error) throw new Error(`删除班级失败: ${error.message}`);
        return NextResponse.json({ success: true });
      }

      // ===== 考勤记录操作 =====
      case 'get_attendance_records': {
        const { class_id, student_id, date_from } = data || {};
        let query = supabase
          .from('attendance_records')
          .select('*')
          .order('timestamp', { ascending: false })
          .limit(500);

        if (class_id) query = query.eq('class_id', class_id);
        if (student_id) query = query.eq('student_id', student_id);
        if (date_from) query = query.gte('timestamp', date_from);

        const { data: records, error } = await query;
        if (error) throw new Error(`查询考勤记录失败: ${error.message}`);
        return NextResponse.json({ success: true, data: records });
      }

      case 'save_attendance_record': {
        const record = {
          method: 'face',
          verified: true,
          ...data,
        };
        const { error } = await supabase
          .from('attendance_records')
          .insert(record);
        if (error) throw new Error(`保存考勤记录失败: ${error.message}`);
        return NextResponse.json({ success: true });
      }

      // ===== 请假申请操作 =====
      case 'get_leave_requests': {
        const { class_id, student_id, status } = data || {};
        let query = supabase
          .from('leave_requests')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(200);

        if (class_id) query = query.eq('class_id', class_id);
        if (student_id) query = query.eq('student_id', student_id);
        if (status) query = query.eq('status', status);

        const { data: requests, error } = await query;
        if (error) throw new Error(`查询请假申请失败: ${error.message}`);
        return NextResponse.json({ success: true, data: requests });
      }

      case 'save_leave_request': {
        const { error } = await supabase
          .from('leave_requests')
          .insert(data);
        if (error) throw new Error(`保存请假申请失败: ${error.message}`);
        return NextResponse.json({ success: true });
      }

      case 'update_leave_request': {
        const { id, ...updates } = data;
        const { error } = await supabase
          .from('leave_requests')
          .update({ ...updates, updated_at: new Date().toISOString() })
          .eq('id', id);
        if (error) throw new Error(`更新请假申请失败: ${error.message}`);
        return NextResponse.json({ success: true });
      }

      // ===== 公告操作 =====
      case 'get_announcements': {
        const { class_id } = data || {};
        let query = supabase
          .from('announcements')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(100);

        if (class_id) query = query.eq('class_id', class_id);

        const { data: announcements, error } = await query;
        if (error) throw new Error(`查询公告失败: ${error.message}`);
        return NextResponse.json({ success: true, data: announcements });
      }

      case 'save_announcement': {
        const { error } = await supabase
          .from('announcements')
          .upsert(data, { onConflict: 'id' });
        if (error) throw new Error(`保存公告失败: ${error.message}`);
        return NextResponse.json({ success: true });
      }

      case 'delete_announcement': {
        const { id } = data;
        const { error } = await supabase
          .from('announcements')
          .delete()
          .eq('id', id);
        if (error) throw new Error(`删除公告失败: ${error.message}`);
        return NextResponse.json({ success: true });
      }

      // ===== 课程表操作 =====
      case 'get_timetable': {
        const { class_id } = data || {};
        let query = supabase.from('timetable').select('*');

        if (class_id) query = query.eq('class_id', class_id);

        const { data: entries, error } = await query;
        if (error) throw new Error(`查询课程表失败: ${error.message}`);
        return NextResponse.json({ success: true, data: entries });
      }

      case 'save_timetable_entry': {
        const { error } = await supabase
          .from('timetable')
          .upsert(data, { onConflict: 'id' });
        if (error) throw new Error(`保存课程表失败: ${error.message}`);
        return NextResponse.json({ success: true });
      }

      case 'delete_timetable_entry': {
        const { id } = data;
        const { error } = await supabase
          .from('timetable')
          .delete()
          .eq('id', id);
        if (error) throw new Error(`删除课程表失败: ${error.message}`);
        return NextResponse.json({ success: true });
      }

      // ===== 成绩操作 =====
      case 'get_grades': {
        const { student_id, class_id, subject, start_date, end_date } = data || {};
        let query = supabase
          .from('grades')
          .select('*')
          .order('exam_date', { ascending: false })
          .limit(200);

        if (student_id) query = query.eq('student_id', student_id);
        if (class_id) query = query.eq('class_id', class_id);
        if (subject) query = query.eq('subject', subject);

        const { data: grades, error } = await query;
        if (error) throw new Error(`查询成绩失败: ${error.message}`);
        return NextResponse.json({ success: true, data: grades || [] });
      }

      case 'save_grade': {
        const { error } = await supabase
          .from('grades')
          .upsert(data, { onConflict: 'id' });
        if (error) throw new Error(`保存成绩失败: ${error.message}`);
        return NextResponse.json({ success: true });
      }

      case 'delete_grade': {
        const { id } = data;
        const { error } = await supabase
          .from('grades')
          .delete()
          .eq('id', id);
        if (error) throw new Error(`删除成绩失败: ${error.message}`);
        return NextResponse.json({ success: true });
      }

      // ===== 表现操作 =====
      case 'get_performances': {
        const { student_id, class_id, type, start_date, end_date } = data || {};
        let query = supabase
          .from('class_performances')
          .select('*')
          .order('date', { ascending: false })
          .limit(200);

        if (student_id) query = query.eq('student_id', student_id);
        if (class_id) query = query.eq('class_id', class_id);
        if (type) query = query.eq('type', type);

        const { data: performances, error } = await query;
        if (error) throw new Error(`查询表现记录失败: ${error.message}`);
        return NextResponse.json({ success: true, data: performances || [] });
      }

      case 'save_performance': {
        const { error } = await supabase
          .from('class_performances')
          .upsert(data, { onConflict: 'id' });
        if (error) throw new Error(`保存表现记录失败: ${error.message}`);
        return NextResponse.json({ success: true });
      }

      case 'delete_performance': {
        const { id } = data;
        const { error } = await supabase
          .from('class_performances')
          .delete()
          .eq('id', id);
        if (error) throw new Error(`删除表现记录失败: ${error.message}`);
        return NextResponse.json({ success: true });
      }

      // ===== 登录日志操作 =====
      case 'save_login_log': {
        const { error } = await supabase
          .from('login_logs')
          .insert(data);
        if (error) throw new Error(`保存登录日志失败: ${error.message}`);
        return NextResponse.json({ success: true });
      }

      case 'get_login_logs': {
        const { username, limit: logLimit } = data || {};
        let query = supabase
          .from('login_logs')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(logLimit || 50);

        if (username) query = query.eq('username', username);

        const { data: logs, error } = await query;
        if (error) throw new Error(`查询登录日志失败: ${error.message}`);
        return NextResponse.json({ success: true, data: logs });
      }

      // ===== 消息操作 =====
      case 'get_messages': {
        const { to_id, from_id, user_id } = data || {};
        let query = supabase.from('messages').select('*').order('created_at', { ascending: true }).limit(500);
        if (user_id) {
          // 处理教师ID变体：如果 user_id 是教师ID，也查询 teacher / teacher-XXX 变体
          const isTeacherVariant = user_id === 'teacher' || user_id.startsWith('teacher-') || user_id.startsWith('user-');
          if (isTeacherVariant) {
            // 查询所有可能的教师ID变体匹配的消息
            const conditions = [
              `from_id.eq.${user_id}`,
              `to_id.eq.${user_id}`,
              `from_id.eq.teacher`,
              `to_id.eq.teacher`,
              `from_role.eq.teacher`,
              `to_role.eq.teacher`,
            ];
            query = query.or(conditions.join(','));
          } else {
            query = query.or(`from_id.eq.${user_id},to_id.eq.${user_id}`);
          }
        } else {
          if (to_id) query = query.eq('to_id', to_id);
          if (from_id) query = query.eq('from_id', from_id);
        }
        const { data: messages, error } = await query;
        if (error) throw new Error(`查询消息失败: ${error.message}`);
        return NextResponse.json({ success: true, data: messages });
      }

      case 'upsert_message': {
        const { error } = await supabase.from('messages').upsert(data, { onConflict: 'id' });
        if (error) throw new Error(`同步消息失败: ${error.message}`);
        return NextResponse.json({ success: true });
      }

      // ===== 成绩操作 =====
      case 'get_grades': {
        const { class_id, student_id } = data || {};
        let query = supabase.from('grades').select('*').order('created_at', { ascending: false }).limit(500);
        if (class_id) query = query.eq('class_id', class_id);
        if (student_id) query = query.eq('student_id', student_id);
        const { data: grades, error } = await query;
        if (error) throw new Error(`查询成绩失败: ${error.message}`);
        return NextResponse.json({ success: true, data: grades });
      }

      case 'upsert_grade': {
        const { error } = await supabase.from('grades').upsert(data, { onConflict: 'id' });
        if (error) throw new Error(`同步成绩失败: ${error.message}`);
        return NextResponse.json({ success: true });
      }

      // ===== 座位表操作 =====
      case 'get_seat_layout': {
        const { class_id } = data || {};
        let query = supabase.from('seat_layouts').select('*');
        if (class_id) query = query.eq('class_id', class_id);
        const { data: seats, error } = await query;
        if (error) throw new Error(`查询座位表失败: ${error.message}`);
        return NextResponse.json({ success: true, data: seats });
      }

      case 'upsert_seat_layout': {
        const { error } = await supabase.from('seat_layouts').upsert(data, { onConflict: 'id' });
        if (error) throw new Error(`同步座位表失败: ${error.message}`);
        return NextResponse.json({ success: true });
      }

      // ===== 值日安排操作 =====
      case 'get_duty_schedules': {
        const { class_id } = data || {};
        let query = supabase.from('duty_schedules').select('*').order('created_at', { ascending: true });
        if (class_id) query = query.eq('class_id', class_id);
        const { data: schedules, error } = await query;
        if (error) throw new Error(`查询值日安排失败: ${error.message}`);
        return NextResponse.json({ success: true, data: schedules });
      }

      case 'upsert_duty_schedule': {
        const { error } = await supabase.from('duty_schedules').upsert(data, { onConflict: 'id' });
        if (error) throw new Error(`同步值日安排失败: ${error.message}`);
        return NextResponse.json({ success: true });
      }

      // ===== 课堂表现操作 =====
      case 'get_class_performances': {
        const { class_id, student_id } = data || {};
        let query = supabase.from('class_performances').select('*').order('created_at', { ascending: false }).limit(500);
        if (class_id) query = query.eq('class_id', class_id);
        if (student_id) query = query.eq('student_id', student_id);
        const { data: performances, error } = await query;
        if (error) throw new Error(`查询课堂表现失败: ${error.message}`);
        return NextResponse.json({ success: true, data: performances });
      }

      case 'upsert_class_performance': {
        const { error } = await supabase.from('class_performances').upsert(data, { onConflict: 'id' });
        if (error) throw new Error(`同步课堂表现失败: ${error.message}`);
        return NextResponse.json({ success: true });
      }

      // ===== 家长操作 =====
      case 'get_parents': {
        const { data: parents, error } = await supabase.from('parents').select('*').order('created_at', { ascending: true });
        if (error) throw new Error(`查询家长失败: ${error.message}`);
        return NextResponse.json({ success: true, data: parents });
      }

      case 'upsert_parent': {
        const { error } = await supabase.from('parents').upsert(data, { onConflict: 'id' });
        if (error) throw new Error(`同步家长失败: ${error.message}`);
        return NextResponse.json({ success: true });
      }

      case 'get_point_records': {
        const { data: points, error } = await supabase.from('point_records').select('*').order('created_at', { ascending: true });
        if (error) throw new Error(`获取积分记录失败: ${error.message}`);
        return NextResponse.json({ success: true, data: points });
      }

      case 'upsert_point_record': {
        const { error } = await supabase.from('point_records').upsert(data, { onConflict: 'id' });
        if (error) throw new Error(`同步积分记录失败: ${error.message}`);
        return NextResponse.json({ success: true });
      }

      // ===== 全量同步（初始化：本地 → 云端） =====
      case 'sync_all_to_cloud': {
        const {
          students, classes: classesData, attendance_records, leave_requests,
          announcements: announcementsData, timetable: timetableData, login_logs: loginLogsData,
          messages: messagesData, grades: gradesData, seat_layouts: seatLayoutsData,
          duty_schedules: dutySchedulesData, class_performances: classPerformancesData,
          parents: parentsData,
          point_records: pointRecordsData,
          media: mediaData,
        } = data;

        const results: Record<string, string> = {};

        if (classesData && classesData.length > 0) {
          const { error } = await supabase.from('classes').upsert(classesData, { onConflict: 'id' });
          results.classes = error ? `失败: ${error.message}` : '成功';
        }

        if (students && students.length > 0) {
          const { error } = await supabase.from('students').upsert(students, { onConflict: 'username' });
          results.students = error ? `失败: ${error.message}` : '成功';
        }

        if (attendance_records && attendance_records.length > 0) {
          const { error } = await supabase.from('attendance_records').insert(attendance_records);
          results.attendance_records = error ? `失败: ${error.message}` : '成功';
        }

        if (leave_requests && leave_requests.length > 0) {
          const { error } = await supabase.from('leave_requests').upsert(leave_requests, { onConflict: 'id' });
          results.leave_requests = error ? `失败: ${error.message}` : '成功';
        }

        if (announcementsData && announcementsData.length > 0) {
          const { error } = await supabase.from('announcements').upsert(announcementsData, { onConflict: 'id' });
          results.announcements = error ? `失败: ${error.message}` : '成功';
        }

        if (timetableData && timetableData.length > 0) {
          const { error } = await supabase.from('timetable').upsert(timetableData, { onConflict: 'id' });
          results.timetable = error ? `失败: ${error.message}` : '成功';
        }

        if (loginLogsData && loginLogsData.length > 0) {
          const { error } = await supabase.from('login_logs').insert(loginLogsData);
          results.login_logs = error ? `失败: ${error.message}` : '成功';
        }

        if (messagesData && messagesData.length > 0) {
          const { error } = await supabase.from('messages').upsert(messagesData, { onConflict: 'id' });
          results.messages = error ? `失败: ${error.message}` : '成功';
        }

        if (gradesData && gradesData.length > 0) {
          const { error } = await supabase.from('grades').upsert(gradesData, { onConflict: 'id' });
          results.grades = error ? `失败: ${error.message}` : '成功';
        }

        if (seatLayoutsData && seatLayoutsData.length > 0) {
          const { error } = await supabase.from('seat_layouts').upsert(seatLayoutsData, { onConflict: 'id' });
          results.seat_layouts = error ? `失败: ${error.message}` : '成功';
        }

        if (dutySchedulesData && dutySchedulesData.length > 0) {
          const { error } = await supabase.from('duty_schedules').upsert(dutySchedulesData, { onConflict: 'id' });
          results.duty_schedules = error ? `失败: ${error.message}` : '成功';
        }

        if (classPerformancesData && classPerformancesData.length > 0) {
          const { error } = await supabase.from('class_performances').upsert(classPerformancesData, { onConflict: 'id' });
          results.class_performances = error ? `失败: ${error.message}` : '成功';
        }

        if (parentsData && parentsData.length > 0) {
          const { error } = await supabase.from('parents').upsert(parentsData, { onConflict: 'id' });
          results.parents = error ? `失败: ${error.message}` : '成功';
        }

        if (pointRecordsData && pointRecordsData.length > 0) {
          const { error } = await supabase.from('point_records').upsert(pointRecordsData, { onConflict: 'id' });
          results.point_records = error ? `失败: ${error.message}` : '成功';
        }

        if (mediaData && mediaData.length > 0) {
          const { error } = await supabase.from('media').upsert(mediaData, { onConflict: 'id' });
          results.media = error ? `失败: ${error.message}` : '成功';
        }

        return NextResponse.json({ success: true, data: results });
      }

      // ===== 全量拉取（云端 → 本地） =====
      case 'pull_all_from_cloud': {
        const [studentsRes, classesRes, attendanceRes, leaveRes, announcementsRes, timetableRes, messagesRes, gradesRes, seatLayoutsRes, dutySchedulesRes, performancesRes, parentsRes, pointRecordsRes, mediaRes, mediaCommentsRes] = await Promise.all([
          supabase.from('students').select('*').order('created_at', { ascending: true }),
          supabase.from('classes').select('*').order('created_at', { ascending: true }),
          supabase.from('attendance_records').select('*').order('timestamp', { ascending: false }).limit(1000),
          supabase.from('leave_requests').select('*').order('created_at', { ascending: false }).limit(200),
          supabase.from('announcements').select('*').order('created_at', { ascending: false }).limit(100),
          supabase.from('timetable').select('*'),
          supabase.from('messages').select('*').order('created_at', { ascending: true }).limit(1000),
          supabase.from('grades').select('*').order('created_at', { ascending: false }).limit(1000),
          supabase.from('seat_layouts').select('*'),
          supabase.from('duty_schedules').select('*').order('created_at', { ascending: true }),
          supabase.from('class_performances').select('*').order('created_at', { ascending: false }).limit(500),
          supabase.from('parents').select('*').order('created_at', { ascending: true }),
          supabase.from('point_records').select('*').order('created_at', { ascending: false }).limit(500),
          supabase.from('media').select('*').order('created_at', { ascending: false }).limit(500),
          supabase.from('media_comments').select('*').order('created_at', { ascending: true }).limit(2000),
        ]);

        return NextResponse.json({
          success: true,
          data: {
            students: studentsRes.data || [],
            classes: classesRes.data || [],
            attendance_records: attendanceRes.data || [],
            leave_requests: leaveRes.data || [],
            announcements: announcementsRes.data || [],
            timetable: timetableRes.data || [],
            messages: messagesRes.data || [],
            grades: gradesRes.data || [],
            seat_layouts: seatLayoutsRes.data || [],
            duty_schedules: dutySchedulesRes.data || [],
            class_performances: performancesRes.data || [],
            parents: parentsRes.data || [],
            point_records: pointRecordsRes.data || [],
            media: mediaRes.data || [],
            media_comments: mediaCommentsRes.data || [],
          },
        });
      }

      // ===== 媒体文件同步 =====
      case 'upsert_media': {
        const mediaData = body.media;
        if (!mediaData || !Array.isArray(mediaData)) {
          return NextResponse.json({ error: '缺少 media 数据' }, { status: 400 });
        }
        const rows = mediaData.map((m: Record<string, unknown>) => ({
          id: m.id,
          title: m.title || null,
          url: m.url || null,
          s3_key: m.s3Key || m.s3_key || null,
          type: m.type || 'photo',
          class_id: m.classId || m.class_id || null,
          uploaded_by: m.uploadedBy || m.uploaded_by || null,
          uploaded_by_name: m.uploadedByName || m.uploaded_by_name || null,
          description: m.description || null,
          created_at: m.createdAt || m.created_at || new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }));
        if (rows.length > 0) {
          const { error } = await supabase.from('media').upsert(rows, { onConflict: 'id' });
          if (error) return NextResponse.json({ error: error.message }, { status: 500 });
        }
        return NextResponse.json({ success: true });
      }

      // ===== 媒体评论同步 =====
      case 'upsert_media_comment': {
        const commentData = body.comment;
        if (!commentData) {
          return NextResponse.json({ error: '缺少 comment 数据' }, { status: 400 });
        }
        const commentRow = {
          id: commentData.id,
          media_id: commentData.mediaId || commentData.media_id,
          user_id: commentData.userId || commentData.user_id,
          user_name: commentData.userName || commentData.user_name || null,
          user_role: commentData.userRole || commentData.user_role || null,
          content: commentData.content || null,
          type: commentData.type || 'comment',
          created_at: commentData.createdAt || commentData.created_at || new Date().toISOString(),
        };
        const { error } = await supabase.from('media_comments').upsert(commentRow, { onConflict: 'id' });
        if (error) return NextResponse.json({ error: error.message }, { status: 500 });
        return NextResponse.json({ success: true });
      }

      default:
        return NextResponse.json({ error: `未知操作: ${action}` }, { status: 400 });
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : '未知错误';
    console.error('[sync API] Error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// 欧氏距离（人脸特征比较）
function euclideanDistance(a: number[], b: number[]): number {
  let sum = 0;
  const len = Math.min(a.length, b.length);
  for (let i = 0; i < len; i++) {
    const diff = a[i] - b[i];
    sum += diff * diff;
  }
  return Math.sqrt(sum);
}

// 余弦相似度（声纹特征比较）
function cosineSimilarity(a: number[], b: number[]): number {
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  const len = Math.min(a.length, b.length);
  for (let i = 0; i < len; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}
