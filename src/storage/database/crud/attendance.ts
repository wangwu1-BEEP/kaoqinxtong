import { getSupabaseClient } from '../supabase-client';
const supabase = getSupabaseClient();

/* eslint-disable @typescript-eslint/no-explicit-any */
type Attendance = any;
type AttendanceInsert = any;

export const attendanceCrud = {
  // 获取所有考勤记录
  async getAll() {
    const { data, error } = await supabase!
      .from('attendance')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data;
  },

  // 根据班级ID获取考勤记录
  async getByClassId(classId: string) {
    const { data, error } = await supabase!
      .from('attendance')
      .select('*')
      .eq('class_id', classId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data;
  },

  // 根据学生ID获取考勤记录
  async getByStudentId(studentId: string) {
    const { data, error } = await supabase!
      .from('attendance')
      .select('*')
      .eq('student_id', studentId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data;
  },

  // 根据ID获取单条记录
  async getById(id: string) {
    const { data, error } = await supabase!
      .from('attendance')
      .select('*')
      .eq('id', id)
      .single();
    if (error) return null;
    return data;
  },

  // 创建考勤记录
  async create(record: AttendanceInsert) {
    const { data, error } = await supabase!
      .from('attendance')
      .insert(record)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  // 获取班级考勤统计
  async getStatsByClassId(classId: string) {
    const { data, error } = await supabase!
      .from('attendance')
      .select('*')
      .eq('class_id', classId);
    if (error) throw error;
    return data;
  },

  // 获取学生考勤统计
  async getStatsByStudentId(studentId: string) {
    const { data, error } = await supabase!
      .from('attendance')
      .select('*')
      .eq('student_id', studentId);
    if (error) throw error;
    return data;
  },

  // 获取今日考勤
  async getTodayByClassId(classId: string) {
    const today = new Date().toISOString().split('T')[0];
    const { data, error } = await supabase!
      .from('attendance')
      .select('*')
      .eq('class_id', classId)
      .gte('created_at', `${today}T00:00:00`)
      .lt('created_at', `${today}T23:59:59`);
    if (error) throw error;
    return data;
  },

  // 获取某天的考勤
  async getByDate(classId: string, date: string) {
    const { data, error } = await supabase!
      .from('attendance')
      .select('*')
      .eq('class_id', classId)
      .gte('created_at', `${date}T00:00:00`)
      .lt('created_at', `${date}T23:59:59`);
    if (error) throw error;
    return data;
  },

  // 删除考勤记录
  async delete(id: string) {
    const { error } = await supabase!.from('attendance').delete().eq('id', id);
    if (error) throw error;
  },
};
