import { getSupabaseClient } from '../supabase-client';
const supabase = getSupabaseClient();

/* eslint-disable @typescript-eslint/no-explicit-any */
type Announcement = any;
type AnnouncementInsert = any;
type AnnouncementUpdate = any;

export const announcementsCrud = {
  // 获取所有公告
  async getAll() {
    const { data, error } = await supabase!
      .from('announcements')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data;
  },

  // 根据班级ID获取公告
  async getByClassId(classId: string) {
    const { data, error } = await supabase!
      .from('announcements')
      .select('*')
      .eq('class_id', classId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data;
  },

  // 根据ID获取公告
  async getById(id: string) {
    const { data, error } = await supabase!
      .from('announcements')
      .select('*')
      .eq('id', id)
      .single();
    if (error) return null;
    return data;
  },

  // 创建公告
  async create(announcement: AnnouncementInsert) {
    const { data, error } = await supabase!
      .from('announcements')
      .insert(announcement)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  // 更新公告
  async update(id: string, updates: AnnouncementUpdate) {
    const { data, error } = await supabase!
      .from('announcements')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  // 删除公告
  async delete(id: string) {
    const { error } = await supabase!.from('announcements').delete().eq('id', id);
    if (error) throw error;
  },
};
