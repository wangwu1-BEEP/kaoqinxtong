import { getSupabaseClient } from '../supabase-client';
const supabase = getSupabaseClient();

/* eslint-disable @typescript-eslint/no-explicit-any */
type User = any;
type UserInsert = any;
type UserUpdate = any;

export const usersCrud = {
  // 获取所有用户
  async getAll() {
    const { data, error } = await supabase!.from('users').select('*');
    if (error) throw error;
    return data;
  },

  // 根据用户名获取用户
  async getByUsername(username: string) {
    const { data, error } = await supabase!
      .from('users')
      .select('*')
      .eq('username', username)
      .single();
    if (error) return null;
    return data;
  },

  // 根据ID获取用户
  async getById(id: string) {
    const { data, error } = await supabase!
      .from('users')
      .select('*')
      .eq('id', id)
      .single();
    if (error) return null;
    return data;
  },

  // 创建用户
  async create(user: UserInsert) {
    const { data, error } = await supabase!
      .from('users')
      .insert(user)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  // 更新用户
  async update(id: string, updates: UserUpdate) {
    const { data, error } = await supabase!
      .from('users')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  // 删除用户
  async delete(id: string) {
    const { error } = await supabase!.from('users').delete().eq('id', id);
    if (error) throw error;
  },

  // 更新用户注册状态
  async updateRegistration(id: string, type: 'face' | 'voice', registered: boolean, descriptor?: string) {
    const updates: UserUpdate = {};
    if (type === 'face') {
      updates.face_registered = registered;
      if (descriptor) updates.face_descriptor = descriptor;
    } else {
      updates.voice_registered = registered;
      if (descriptor) updates.voice_descriptor = descriptor;
    }
    return this.update(id, updates);
  },

  // 更新用户密码
  async updatePassword(id: string, newPassword: string) {
    return this.update(id, { password: newPassword });
  },

  // 获取班级学生
  async getClassStudents(classId: string) {
    const { data, error } = await supabase!
      .from('users')
      .select('*')
      .eq('class_id', classId)
      .eq('role', 'student');
    if (error) throw error;
    return data;
  },
};
