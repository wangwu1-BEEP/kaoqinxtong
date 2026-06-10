import { getSupabaseClient } from '../supabase-client';
const supabase = getSupabaseClient();

/* eslint-disable @typescript-eslint/no-explicit-any */
type Class = any;
type ClassInsert = any;
type ClassUpdate = any;

export const classesCrud = {
  // 获取所有班级
  async getAll() {
    const { data, error } = await supabase!.from('classes').select('*');
    if (error) throw error;
    return data;
  },

  // 根据ID获取班级
  async getById(id: string) {
    const { data, error } = await supabase!
      .from('classes')
      .select('*')
      .eq('id', id)
      .single();
    if (error) return null;
    return data;
  },

  // 根据教师ID获取班级
  async getByTeacherId(teacherId: string) {
    const { data, error } = await supabase!
      .from('classes')
      .select('*')
      .eq('teacher_id', teacherId);
    if (error) throw error;
    return data;
  },

  // 创建班级
  async create(classData: ClassInsert) {
    const { data, error } = await supabase!
      .from('classes')
      .insert(classData)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  // 更新班级
  async update(id: string, updates: ClassUpdate) {
    const { data, error } = await supabase!
      .from('classes')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  // 删除班级
  async delete(id: string) {
    const { error } = await supabase!.from('classes').delete().eq('id', id);
    if (error) throw error;
  },

  // 获取班级学生数量
  async getStudentCount(classId: string) {
    const { count, error } = await supabase!
      .from('users')
      .select('*', { count: 'exact', head: true })
      .eq('class_id', classId)
      .eq('role', 'student');
    if (error) throw error;
    return count || 0;
  },
};
