import { getSupabaseClient } from '../supabase-client';
const supabase = getSupabaseClient();

/* eslint-disable @typescript-eslint/no-explicit-any */
type Timetable = any;
type TimetableInsert = any;
type TimetableUpdate = any;

export const timetableCrud = {
  // 获取所有课程表
  async getAll() {
    const { data, error } = await supabase!.from('timetable').select('*');
    if (error) throw error;
    return data;
  },

  // 根据班级ID获取课程表
  async getByClassId(classId: string) {
    const { data, error } = await supabase!
      .from('timetable')
      .select('*')
      .eq('class_id', classId)
      .order('day_of_week')
      .order('period');
    if (error) throw error;
    return data;
  },

  // 根据ID获取课程
  async getById(id: string) {
    const { data, error } = await supabase!
      .from('timetable')
      .select('*')
      .eq('id', id)
      .single();
    if (error) return null;
    return data;
  },

  // 创建课程
  async create(entry: TimetableInsert) {
    const { data, error } = await supabase!
      .from('timetable')
      .insert(entry)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  // 批量创建课程
  async createMany(entries: TimetableInsert[]) {
    const { data, error } = await supabase!.from('timetable').insert(entries).select();
    if (error) throw error;
    return data;
  },

  // 更新课程
  async update(id: string, updates: TimetableUpdate) {
    const { data, error } = await supabase!
      .from('timetable')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  // 删除课程
  async delete(id: string) {
    const { error } = await supabase!.from('timetable').delete().eq('id', id);
    if (error) throw error;
  },

  // 清空班级课程表
  async clearByClassId(classId: string) {
    const { error } = await supabase!.from('timetable').delete().eq('class_id', classId);
    if (error) throw error;
  },
};
