import { getSupabaseClient } from '../supabase-client';
const supabase = getSupabaseClient();

/* eslint-disable @typescript-eslint/no-explicit-any */
type LoginLog = any;
type LoginLogInsert = any;

export const loginLogsCrud = {
  // 获取所有登录日志
  async getAll() {
    const { data, error } = await supabase!
      .from('login_logs')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data;
  },

  // 根据用户ID获取登录日志
  async getByUserId(userId: string) {
    const { data, error } = await supabase!
      .from('login_logs')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data;
  },

  // 创建登录日志
  async create(log: LoginLogInsert) {
    const { data, error } = await supabase!
      .from('login_logs')
      .insert(log)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  // 删除登录日志
  async delete(id: string) {
    const { error } = await supabase!.from('login_logs').delete().eq('id', id);
    if (error) throw error;
  },

  // 清空用户登录日志
  async clearByUserId(userId: string) {
    const { error } = await supabase!.from('login_logs').delete().eq('user_id', userId);
    if (error) throw error;
  },
};
