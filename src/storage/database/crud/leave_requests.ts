import { getSupabaseClient } from '../supabase-client';
const supabase = getSupabaseClient();

/* eslint-disable @typescript-eslint/no-explicit-any */
type LeaveRequest = any;
type LeaveRequestInsert = any;
type LeaveRequestUpdate = any;

export const leaveRequestsCrud = {
  // 获取所有请假申请
  async getAll() {
    const { data, error } = await supabase!
      .from('leave_requests')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data;
  },

  // 根据班级ID获取请假申请
  async getByClassId(classId: string) {
    const { data, error } = await supabase!
      .from('leave_requests')
      .select('*')
      .eq('class_id', classId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data;
  },

  // 根据学生ID获取请假申请
  async getByStudentId(studentId: string) {
    const { data, error } = await supabase!
      .from('leave_requests')
      .select('*')
      .eq('student_id', studentId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data;
  },

  // 根据ID获取请假申请
  async getById(id: string) {
    const { data, error } = await supabase!
      .from('leave_requests')
      .select('*')
      .eq('id', id)
      .single();
    if (error) return null;
    return data;
  },

  // 创建请假申请
  async create(request: LeaveRequestInsert) {
    const { data, error } = await supabase!
      .from('leave_requests')
      .insert(request)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  // 更新请假申请状态
  async updateStatus(id: string, status: 'pending' | 'approved' | 'rejected') {
    const { data, error } = await supabase!
      .from('leave_requests')
      .update({ status })
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  // 删除请假申请
  async delete(id: string) {
    const { error } = await supabase!.from('leave_requests').delete().eq('id', id);
    if (error) throw error;
  },

  // 获取待审批数量
  async getPendingCount(classId: string) {
    const { count, error } = await supabase!
      .from('leave_requests')
      .select('*', { count: 'exact', head: true })
      .eq('class_id', classId)
      .eq('status', 'pending');
    if (error) throw error;
    return count || 0;
  },
};
