'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { getMessages, sendMessage, markAllRead, getParents, getStudents, saveParents } from '@/lib/sharedData';
import type { Message, ParentInfo } from '@/types/attendance';
import { syncOnLogin } from '@/lib/syncUtils';

interface ParentTeacherMessageProps {
  userId: string;
  userName: string;
  userRole: 'parent' | 'teacher';
  classId?: string;
}

export default function ParentTeacherMessage({ userId, userName, userRole }: ParentTeacherMessageProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [selectedContact, setSelectedContact] = useState<string | null>(null);
  const [newMessage, setNewMessage] = useState('');
  const [contacts, setContacts] = useState<{ id: string; name: string; role: string; unread: number; childName?: string }[]>([]);
  const [linkingParentId, setLinkingParentId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // 根据家长ID查找孩子姓名（优先 childName，其次通过 childId 查学生列表）
  const getChildName = useCallback((parentId: string): string | undefined => {
    const parents = getParents();
    const parentInfo = parents.find(p => p.id === parentId);
    if (!parentInfo) return undefined;
    if (parentInfo.childName) return parentInfo.childName;
    // 回退：通过 childId / childrenIds 查找学生姓名
    const students = getStudents();
    const childIds = parentInfo.childrenIds || (parentInfo.childId ? [parentInfo.childId] : []);
    const childNames = childIds
      .map(cid => students.find(s => s.id === cid)?.name)
      .filter((n): n is string => !!n);
    return childNames.length > 0 ? childNames.join('、') : undefined;
  }, []);

  const loadMessages = useCallback(() => {
    const allMessages = getMessages();
    // 家校沟通：只看 parent ↔ teacher 的消息
    const ptMessages = allMessages.filter(
      (m: Message) => (m.fromRole === 'parent' || m.fromRole === 'teacher') &&
        (m.toRole === 'parent' || m.toRole === 'teacher')
    );

    // ===== 教师ID归一化 =====
    // 收集所有教师ID变体（teacher / teacher-XXX / user-XXXX）
    const allTeacherIds = new Set<string>();
    if (userRole === 'teacher') {
      allTeacherIds.add(userId);
      allTeacherIds.add('teacher');
    }
    ptMessages.forEach((m: Message) => {
      if (m.fromRole === 'teacher') allTeacherIds.add(m.fromId);
      if (m.toRole === 'teacher') allTeacherIds.add(m.toId);
    });
    try {
      const teacherUsers = JSON.parse(localStorage.getItem('shared_teacher_users') || '[]') as {id: string; name: string}[];
      teacherUsers.forEach(t => allTeacherIds.add(t.id));
    } catch {}

    // 确定教师的规范ID（优先使用当前登录ID，否则取第一个变体）
    const canonicalTeacherId = userRole === 'teacher' ? userId : (allTeacherIds.values().next().value || 'teacher');

    // 获取教师姓名
    let teacherName = '教师';
    if (userRole === 'teacher') {
      teacherName = userName || '教师';
    } else {
      try {
        const tu = JSON.parse(localStorage.getItem('shared_teacher_users') || '[]') as {id: string; name: string}[];
        if (tu.length > 0) teacherName = tu[0].name;
      } catch {}
      for (const m of ptMessages) {
        if (m.fromRole === 'teacher') { teacherName = m.fromName; break; }
        if (m.toRole === 'teacher') { teacherName = m.toName; break; }
      }
    }

    // 归一化：将任何教师ID变体映射为规范教师ID
    const normalizeId = (id: string, role: string): string => {
      if (role === 'teacher' && allTeacherIds.has(id)) return canonicalTeacherId;
      return id;
    };

    // 判断是否是"我"的消息
    const isSentByMe = (m: Message): boolean => {
      const from = normalizeId(m.fromId, m.fromRole);
      return from === userId || (userRole === 'teacher' && from === canonicalTeacherId);
    };
    const isAddressedToMe = (m: Message): boolean => {
      const to = normalizeId(m.toId, m.toRole);
      return to === userId || (userRole === 'teacher' && to === canonicalTeacherId);
    };
    const isMyMessage = (m: Message): boolean => isSentByMe(m) || isAddressedToMe(m);

    const myMessages = ptMessages.filter(isMyMessage);
    setMessages(myMessages);

    // 构建联系人列表（使用归一化ID去重）
    const contactMap = new Map<string, { name: string; role: string; unread: number; childName?: string }>();
    myMessages.forEach((m: Message) => {
      const sentByMe = isSentByMe(m);
      const otherNormId = sentByMe ? normalizeId(m.toId, m.toRole) : normalizeId(m.fromId, m.fromRole);
      const otherName = sentByMe ? m.toName : m.fromName;
      const otherRole = sentByMe ? m.toRole : m.fromRole;
      if (!contactMap.has(otherNormId)) {
        const childName = otherRole === 'parent' ? getChildName(otherNormId) : undefined;
        contactMap.set(otherNormId, { name: otherName, role: otherRole, unread: 0, childName });
      }
      if (!m.read && isAddressedToMe(m)) {
        contactMap.get(otherNormId)!.unread++;
      }
    });

    // 教师端：补充所有已注册家长（即使没发过消息）
    if (userRole === 'teacher') {
      const allParents = getParents();
      allParents.forEach((p: ParentInfo) => {
        if (!contactMap.has(p.id)) {
          const childName = getChildName(p.id);
          contactMap.set(p.id, { name: p.name, role: 'parent', unread: 0, childName });
        }
      });
    }

    // 家长端：确保教师联系人存在（只显示一个归一化条目）
    if (userRole === 'parent') {
      if (!contactMap.has(canonicalTeacherId)) {
        contactMap.set(canonicalTeacherId, { name: teacherName, role: 'teacher', unread: 0 });
      }
    }

    setContacts(Array.from(contactMap.entries()).map(([id, data]) => ({ id, ...data })));
  }, [userId, userRole, getChildName]);

  useEffect(() => {
    loadMessages();
    const interval = setInterval(loadMessages, 3000);
    // 双端：打开沟通面板时从云端同步最新数据（家长+消息）
    syncOnLogin().then(() => loadMessages()).catch(() => {});
    // 每30秒自动同步一次云端消息
    const syncInterval = setInterval(() => {
      syncOnLogin().then(() => loadMessages()).catch(() => {});
    }, 30000);
    return () => { clearInterval(interval); clearInterval(syncInterval); };
  }, [loadMessages, userRole]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, selectedContact]);

  // 关联家长与学生
  const handleLinkStudent = useCallback(async (parentId: string, studentId: string) => {
    const parents = getParents();
    const students = getStudents();
    const student = students.find(s => s.id === studentId);
    const idx = parents.findIndex(p => p.id === parentId);
    if (idx === -1 || !student) return;

    parents[idx] = {
      ...parents[idx],
      childId: student.id,
      childName: student.name,
      classId: student.classId,
      className: student.className || '',
      childrenIds: [...(parents[idx].childrenIds || []), student.id].filter((v, i, a) => a.indexOf(v) === i),
    };
    saveParents(parents);
    setLinkingParentId(null);
    loadMessages(); // 刷新联系人列表
    // 同步到云端
    try {
      await fetch('/api/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'upsert_parent',
          data: {
            id: parents[idx].id,
            username: parents[idx].username,
            password: parents[idx].password,
            name: parents[idx].name,
            child_id: parents[idx].childId,
            child_name: parents[idx].childName,
            children_ids: parents[idx].childrenIds,
            class_id: parents[idx].classId,
            phone: parents[idx].phone,
          },
        }),
      });
    } catch (e) {
      console.warn('同步家长信息到云端失败:', e);
    }
  }, [loadMessages]);

  const handleSend = () => {
    if (!newMessage.trim() || !selectedContact) return;

    const contact = contacts.find(c => c.id === selectedContact);
    if (!contact) return;

    // 回复时也将收到的消息标记为已读
    markAllRead(userId);

    sendMessage({
      fromId: userId,
      fromName: userName,
      fromRole: userRole,
      toId: selectedContact,
      toName: contact.name,
      toRole: contact.role as 'parent' | 'teacher',
      content: newMessage.trim(),
    });

    setNewMessage('');
    loadMessages();
  };

  // 判断ID是否属于当前用户
  const isMe = (id: string, role?: string): boolean => {
    if (id === userId) return true;
    if (userRole === 'teacher' && role === 'teacher') {
      // 教师ID变体：teacher / teacher-XXX / user-XXX
      if (id === 'teacher' || id.startsWith('teacher-') || id.startsWith('user-')) return true;
    }
    return false;
  };

  // 判断两个ID是否指向同一个联系人（处理教师ID变体）
  const isSameContact = (idA: string, idB: string, roleA?: string, roleB?: string): boolean => {
    if (idA === idB) return true;
    // 如果其中一个是教师，检查是否为教师ID变体
    const allTeacherIdVariants = new Set<string>();
    allTeacherIdVariants.add('teacher');
    try {
      const tu = JSON.parse(localStorage.getItem('shared_teacher_users') || '[]') as {id: string; name: string}[];
      tu.forEach(t => allTeacherIdVariants.add(t.id));
    } catch {}
    messages.forEach((m: Message) => {
      if (m.fromRole === 'teacher') allTeacherIdVariants.add(m.fromId);
      if (m.toRole === 'teacher') allTeacherIdVariants.add(m.toId);
    });
    if (userRole === 'teacher') allTeacherIdVariants.add(userId);

    const aIsTeacher = roleA === 'teacher' || allTeacherIdVariants.has(idA);
    const bIsTeacher = roleB === 'teacher' || allTeacherIdVariants.has(idB);
    if (aIsTeacher && bIsTeacher) return true;
    return false;
  };

  const filteredMessages = selectedContact ? messages.filter(
    (m: Message) =>
      (isMe(m.fromId, m.fromRole) && isSameContact(m.toId, selectedContact, m.toRole)) ||
      (isSameContact(m.fromId, selectedContact, m.fromRole) && isMe(m.toId, m.toRole))
  ) : [];

  const selectedContactInfo = contacts.find(c => c.id === selectedContact);

  // 所有学生列表（用于关联家长）
  const allStudents = getStudents();

  return (
    <div className="flex h-[500px] rounded-2xl overflow-hidden" style={{ backgroundColor: 'rgba(15, 15, 35, 0.8)', border: '1px solid rgba(255,255,255,0.08)' }}>
      {/* Contact List */}
      <div className="w-1/3 flex flex-col" style={{ borderRight: '1px solid rgba(255,255,255,0.08)' }}>
        <div className="p-3" style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
          <h3 className="text-sm font-semibold text-white/90">
            {userRole === 'parent' ? '教师列表' : '家长列表'}
          </h3>
        </div>
        <div className="flex-1 overflow-y-auto">
          {contacts.length === 0 ? (
            <div className="p-4 text-center text-white/40 text-xs">暂无联系人</div>
          ) : (
            contacts.map(contact => (
              <div key={contact.id}>
                <button
                  onClick={() => { setSelectedContact(contact.id); markAllRead(userId); loadMessages(); setLinkingParentId(null); }}
                  className="w-full p-3 text-left transition-all hover:bg-white/5"
                  style={{
                    backgroundColor: selectedContact === contact.id ? 'rgba(99,102,241,0.2)' : 'transparent',
                    borderLeft: selectedContact === contact.id ? '3px solid #818cf8' : '3px solid transparent',
                  }}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold"
                        style={{
                          background: contact.role === 'teacher'
                            ? 'linear-gradient(135deg, #667eea, #764ba2)'
                            : 'linear-gradient(135deg, #0ea5e9, #06b6d4)',
                        }}
                      >
                        {contact.name.charAt(0)}
                      </div>
                      <div>
                        <div className="text-xs font-medium text-white/90">
                          {contact.name}
                          {contact.role === 'parent' && contact.childName && (
                            <span className="text-[10px] text-cyan-300/70 ml-1">({contact.childName}的家长)</span>
                          )}
                        </div>
                        <div className="text-[10px] text-white/40">
                          {contact.role === 'teacher' ? '教师' : '家长'}
                          {contact.role === 'parent' && !contact.childName && (
                            <span className="text-amber-400/60 ml-1">未关联学生</span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      {contact.unread > 0 && (
                        <span className="w-5 h-5 rounded-full bg-red-500 text-white text-[10px] flex items-center justify-center">
                          {contact.unread}
                        </span>
                      )}
                      {/* 教师端：未关联学生的家长显示关联按钮 */}
                      {userRole === 'teacher' && contact.role === 'parent' && !contact.childName && (
                        <button
                          onClick={(e) => { e.stopPropagation(); setLinkingParentId(linkingParentId === contact.id ? null : contact.id); }}
                          className="px-1.5 py-0.5 rounded text-[9px] font-medium bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 transition-all"
                          title="关联学生"
                        >
                          关联
                        </button>
                      )}
                    </div>
                  </div>
                </button>
                {/* 关联学生选择面板 */}
                {linkingParentId === contact.id && (
                  <div className="px-3 pb-2">
                    <div className="p-2 rounded-lg" style={{ backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
                      <p className="text-[10px] text-white/40 mb-1.5">选择该家长的孩子：</p>
                      <div className="max-h-32 overflow-y-auto space-y-0.5">
                        {allStudents.map(s => (
                          <button
                            key={s.id}
                            onClick={() => handleLinkStudent(contact.id, s.id)}
                            className="w-full text-left px-2 py-1.5 rounded text-[11px] text-white/70 hover:bg-white/5 transition-all flex items-center gap-2"
                          >
                            <span className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold bg-white/10">{s.name.charAt(0)}</span>
                            <span>{s.name}</span>
                            <span className="text-[9px] text-white/30">{s.className || ''}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col">
        {selectedContact ? (
          <>
            {/* Chat Header */}
            <div className="p-3 flex items-center gap-2" style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
              <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold"
                style={{
                  background: selectedContactInfo?.role === 'teacher'
                    ? 'linear-gradient(135deg, #667eea, #764ba2)'
                    : 'linear-gradient(135deg, #0ea5e9, #06b6d4)',
                }}
              >
                {selectedContactInfo?.name.charAt(0)}
              </div>
              <div>
                <div className="text-sm font-medium text-white/90">
                  {selectedContactInfo?.name}
                  {selectedContactInfo?.role === 'parent' && selectedContactInfo?.childName && (
                    <span className="text-xs text-cyan-300/70 ml-1">({selectedContactInfo.childName}的家长)</span>
                  )}
                </div>
                <div className="text-[10px] text-white/40">
                  {selectedContactInfo?.role === 'teacher' ? '教师' : '家长'}
                </div>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-3 space-y-3">
              {filteredMessages.length === 0 && (
                <div className="text-center text-white/30 text-xs mt-8">暂无消息，开始对话吧</div>
              )}
              {filteredMessages.map(msg => {
                const msgIsMe = isMe(msg.fromId, msg.fromRole);
                return (
                  <div key={msg.id} className={`flex ${msgIsMe ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[70%] px-3 py-2 rounded-2xl text-xs ${
                      msgIsMe
                        ? 'rounded-br-sm text-white'
                        : 'rounded-bl-sm text-white/90'
                    }`}
                      style={{
                        background: msgIsMe
                          ? 'linear-gradient(135deg, #667eea, #764ba2)'
                          : 'rgba(255,255,255,0.08)',
                      }}
                    >
                      <div>{msg.content}</div>
                      <div className={`text-[10px] mt-1 ${msgIsMe ? 'text-white/50' : 'text-white/30'}`}>
                        {new Date(msg.createdAt).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="p-3 flex gap-2" style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}>
              <input
                type="text"
                value={newMessage}
                onChange={e => setNewMessage(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSend()}
                placeholder="输入消息..."
                className="flex-1 px-3 py-2 rounded-xl text-xs text-white placeholder:text-white/30 outline-none"
                style={{ backgroundColor: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}
              />
              <button
                onClick={handleSend}
                disabled={!newMessage.trim()}
                className="px-4 py-2 rounded-xl text-xs font-medium text-white transition-all"
                style={{
                  background: newMessage.trim()
                    ? 'linear-gradient(135deg, #667eea, #764ba2)'
                    : 'rgba(255,255,255,0.06)',
                  opacity: newMessage.trim() ? 1 : 0.5,
                }}
              >
                发送
              </button>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-white/30 text-sm">
            选择一位联系人开始对话
          </div>
        )}
      </div>
    </div>
  );
}
