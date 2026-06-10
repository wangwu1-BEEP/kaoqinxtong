'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Send, MessageCircle, User, Search, CheckSquare, Square, Users } from 'lucide-react';
import {
  getMessages,
  sendMessage,
  markAllRead,
  getStudents,
  getTeacherUsers,
} from '@/lib/sharedData';
import type { Message } from '@/types/attendance';

interface MessageSystemProps {
  userId: string;
  userRole: 'teacher' | 'student' | 'parent';
  studentId?: string;
}

/** 判断是否是教师ID变体 (teacher / teacher-XXX / user-XXX) */
function isTeacherIdVariant(id: string): boolean {
  return id === 'teacher' || id.startsWith('teacher-') || id.startsWith('user-');
}

/** 规范化教师ID：所有教师ID变体统一为同一标识 */
function normalizeId(id: string): string {
  if (id === 'teacher' || id.startsWith('teacher-')) return '__teacher__';
  return id;
}

export default function MessageSystem({ userId, userRole, studentId }: MessageSystemProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [selectedContact, setSelectedContact] = useState<string | null>(null);
  const [newMessage, setNewMessage] = useState('');
  const [contacts, setContacts] = useState<{ id: string; name: string }[]>([]);
  const [batchMode, setBatchMode] = useState(false);
  const [selectedStudents, setSelectedStudents] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [batchSendResult, setBatchSendResult] = useState<string>('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // 获取当前用户的真实ID
  const myId = studentId || userId;

  // 判断是否是教师视角
  const isTeacherView = isTeacherIdVariant(myId);

  /** 获取教师联系人信息（从 shared_teacher_users 或消息历史中提取） */
  const getTeacherContact = useCallback((): { id: string; name: string } | null => {
    // 方法1: 从 shared_teacher_users 读取（syncOnLogin 会将教师信息保存到这里）
    const teacherUsers = getTeacherUsers();
    if (teacherUsers.length > 0) {
      // 返回第一个（通常只有一个教师）
      return { id: teacherUsers[0].id, name: teacherUsers[0].name || '教师' };
    }

    // 方法2: 从消息历史中提取教师信息
    const allMessages = getMessages();
    const teacherMsg = allMessages.find(m =>
      isTeacherIdVariant(m.fromId) && m.fromName && m.fromRole === 'teacher'
    );
    if (teacherMsg) {
      return { id: teacherMsg.fromId, name: teacherMsg.fromName };
    }

    // 方法3: 回退到默认
    return { id: 'teacher', name: '教师' };
  }, []);

  /** 判断两个ID是否指向同一个联系人（处理教师ID变体） */
  const isSameContact = useCallback((id1: string, id2: string): boolean => {
    if (id1 === id2) return true;
    // 两个都是教师ID变体 → 视为同一人
    if (isTeacherIdVariant(id1) && isTeacherIdVariant(id2)) return true;
    return false;
  }, []);

  /** 判断消息是否与我相关 */
  const isAddressedToMe = useCallback((m: Message): boolean => {
    if (m.fromId === myId || m.toId === myId) return true;
    // 如果我是教师，检查所有教师ID变体
    if (isTeacherView) {
      if (isTeacherIdVariant(m.fromId) || isTeacherIdVariant(m.toId)) return true;
    }
    return false;
  }, [myId, isTeacherView]);

  const refreshMessages = useCallback(() => {
    const allMessages = getMessages();
    const myMessages = allMessages.filter(isAddressedToMe);
    setMessages(myMessages);
  }, [isAddressedToMe]);

  useEffect(() => {
    refreshMessages();

    if (userRole === 'teacher') {
      // 教师视角：联系人是学生列表
      const students = getStudents();
      const contactList = students.map(s => ({ id: s.id, name: s.name }));
      setContacts(contactList);
    } else {
      // 学生/家长视角：联系人是教师（使用真实教师ID）
      const teacherContact = getTeacherContact();
      if (teacherContact) {
        setContacts([teacherContact]);
      } else {
        setContacts([{ id: 'teacher', name: '教师' }]);
      }
    }
  }, [userId, userRole, studentId, refreshMessages, getTeacherContact]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, selectedContact]);

  const handleSend = useCallback(() => {
    if (!newMessage.trim() || !selectedContact) return;

    // 教师的真实ID（而不是硬编码 'teacher'）
    const teacherId = isTeacherView ? myId : (contacts.find(c => isTeacherIdVariant(c.id))?.id || 'teacher');
    const fromId = isTeacherView ? teacherId : myId;
    const toId = isTeacherView ? selectedContact : teacherId;
    const myName = isTeacherView
      ? '教师'
      : (contacts.find(c => c.id === myId)?.name || myId);
    const contactName = contacts.find(c => isSameContact(c.id, selectedContact))?.name || selectedContact;

    sendMessage({
      fromId,
      fromName: myName,
      fromRole: userRole as 'teacher' | 'student' | 'parent',
      toId,
      toName: isTeacherView ? contactName : (contacts.find(c => isTeacherIdVariant(c.id))?.name || '教师'),
      toRole: isTeacherView ? 'student' : 'teacher',
      content: newMessage.trim(),
    });

    refreshMessages();
    setNewMessage('');
  }, [newMessage, selectedContact, userId, userRole, studentId, contacts, refreshMessages, isTeacherView, myId, isSameContact]);

  const handleBatchSend = useCallback(() => {
    if (!newMessage.trim()) return;
    if (selectedStudents.size === 0) {
      setBatchSendResult('请先选择学生');
      setTimeout(() => setBatchSendResult(''), 2000);
      return;
    }
    try {
      let successCount = 0;
      const teacherId = myId; // 教师的真实ID
      selectedStudents.forEach(sid => {
        const student = contacts.find(c => c.id === sid);
        if (student) {
          sendMessage({
            fromId: teacherId,
            fromName: '教师',
            fromRole: 'teacher',
            toId: sid,
            toName: student.name,
            toRole: 'student',
            content: newMessage.trim(),
          });
          successCount++;
        }
      });
      setNewMessage('');
      setSelectedStudents(new Set());
      setBatchMode(false);
      refreshMessages();
      setBatchSendResult(`已成功发送给 ${successCount} 名学生`);
      setTimeout(() => setBatchSendResult(''), 3000);
    } catch {
      setBatchSendResult('发送失败，请重试');
      setTimeout(() => setBatchSendResult(''), 3000);
    }
  }, [newMessage, selectedStudents, contacts, refreshMessages, myId]);

  const handleSelectContact = useCallback((contactId: string) => {
    setSelectedContact(contactId);
    // 标记该联系人的消息为已读（兼容教师ID变体）
    markAllRead(myId);
    refreshMessages();
  }, [myId, refreshMessages]);

  const chatMessages = selectedContact
    ? messages
        .filter((m: Message) => {
          if (isTeacherView) {
            // 教师视角：查找与 selectedContact 学生的所有消息
            // 消息的 fromId/toId 可能是教师的任何ID变体
            const fromMe = isTeacherIdVariant(m.fromId) || m.fromId === myId;
            const toMe = isTeacherIdVariant(m.toId) || m.toId === myId;
            const fromStudent = m.fromId === selectedContact;
            const toStudent = m.toId === selectedContact;
            return (fromMe && toStudent) || (fromStudent && toMe);
          } else {
            // 学生视角：查找与教师的所有消息（兼容教师ID变体）
            const fromMe = m.fromId === myId;
            const toMe = m.toId === myId;
            const fromTeacher = isTeacherIdVariant(m.fromId);
            const toTeacher = isTeacherIdVariant(m.toId);
            return (fromMe && toTeacher) || (fromTeacher && toMe);
          }
        })
        .sort((a: Message, b: Message) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
    : [];

  const getUnreadCount = useCallback((contactId: string) => {
    if (!isTeacherView) {
      // 学生视角：统计所有来自教师ID变体的未读消息
      return messages.filter(
        (m: Message) => isTeacherIdVariant(m.fromId) && m.toId === myId && !m.read
      ).length;
    }
    // 教师视角：统计来自该学生的未读消息（兼容教师ID变体）
    return messages.filter(
      (m: Message) => m.fromId === contactId && !m.read && (isTeacherIdVariant(m.toId) || m.toId === myId)
    ).length;
  }, [messages, myId, isTeacherView]);

  // 获取最后一条消息
  const getLastMessage = useCallback((contactId: string) => {
    let contactMessages: Message[];
    if (!isTeacherView) {
      // 学生视角：查找与教师的所有消息
      contactMessages = messages.filter(
        (m: Message) => (isTeacherIdVariant(m.fromId) && m.toId === myId) || (m.fromId === myId && isTeacherIdVariant(m.toId))
      );
    } else {
      contactMessages = messages.filter(
        (m: Message) => {
          const fromMe = isTeacherIdVariant(m.fromId) || m.fromId === myId;
          const toMe = isTeacherIdVariant(m.toId) || m.toId === myId;
          const fromStudent = m.fromId === contactId;
          const toStudent = m.toId === contactId;
          return (fromMe && toStudent) || (fromStudent && toMe);
        }
      );
    }
    if (contactMessages.length === 0) return null;
    return contactMessages.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];
  }, [messages, myId, isTeacherView]);

  const filteredContacts = contacts.filter(c =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const selectedContactName = selectedContact ? (contacts.find(c => isSameContact(c.id, selectedContact))?.name || '') : '';

  return (
    <Card className="h-[560px] flex flex-col shadow-xl border-0 overflow-hidden"
      style={{ backgroundColor: 'rgba(15, 15, 35, 0.8)', border: '1px solid rgba(255,255,255,0.08)' }}>
      <div className="h-2 bg-gradient-to-r from-cyan-500 via-blue-500 to-indigo-500" />
      <div className="flex-1 flex min-h-0">
        {/* Contact List - Left Panel */}
        <div className="w-72 flex flex-col" style={{ borderRight: '1px solid rgba(255,255,255,0.08)' }}>
          {/* Header */}
          <div className="p-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-lg flex items-center justify-center shadow-sm">
                <MessageCircle className="w-4 h-4 text-white" />
              </div>
              <h3 className="font-bold text-white flex-1">
                {isTeacherView ? '师生消息' : '与教师对话'}
              </h3>
              {isTeacherView && (
                <div className="flex items-center gap-2">
                  {batchMode && (
                    <button
                      onClick={() => {
                        if (selectedStudents.size === contacts.length) {
                          setSelectedStudents(new Set());
                        } else {
                          setSelectedStudents(new Set(contacts.map(c => c.id)));
                        }
                      }}
                      className="px-2.5 py-1 rounded-lg text-xs font-medium bg-white/10 text-white/70 hover:bg-white/20 transition-all"
                    >
                      {selectedStudents.size === contacts.length ? '取消全选' : '全选'}
                    </button>
                  )}
                  <button
                    onClick={() => { setBatchMode(!batchMode); setSelectedStudents(new Set()); setBatchSendResult(''); }}
                    className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                      batchMode
                        ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-md'
                        : 'bg-white/10 text-white/70 hover:bg-white/20'
                    }`}
                  >
                    {batchMode ? '取消群发' : '群发消息'}
                  </button>
                </div>
              )}
            </div>
            {batchMode && (
              <div className="mb-2 px-3 py-2 rounded-lg bg-cyan-500/10 border border-cyan-500/20">
                <p className="text-xs text-cyan-300">
                  已选择 {selectedStudents.size} / {contacts.length} 位学生
                </p>
              </div>
            )}
            {batchSendResult && (
              <div className="mb-2 px-3 py-2 rounded-lg bg-green-500/10 border border-green-500/20">
                <p className="text-xs text-green-300">{batchSendResult}</p>
              </div>
            )}
            {isTeacherView && (
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/30" />
                <Input
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="搜索学生..."
                  className="pl-8 h-8 text-sm rounded-lg bg-white/5 border-white/10 text-white placeholder:text-white/30 focus:border-cyan-400/50 focus:ring-cyan-400/20"
                />
              </div>
            )}
          </div>

          {/* Contact List */}
          <div className="flex-1 overflow-y-auto">
            {filteredContacts.map(contact => {
              const unread = getUnreadCount(contact.id);
              const lastMsg = getLastMessage(contact.id);
              const isSelected = selectedContact ? isSameContact(contact.id, selectedContact) : false;

              return (
                <div
                  key={contact.id}
                  onClick={() => handleSelectContact(contact.id)}
                  className={`p-3 cursor-pointer transition-all flex items-center gap-3 ${
                    isSelected
                      ? 'bg-cyan-500/15 border-l-2 border-cyan-400'
                      : 'hover:bg-white/5 border-l-2 border-transparent'
                  }`}
                >
                  {isTeacherView && batchMode && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        const newSet = new Set(selectedStudents);
                        if (newSet.has(contact.id)) newSet.delete(contact.id);
                        else newSet.add(contact.id);
                        setSelectedStudents(newSet);
                      }}
                      className="shrink-0"
                    >
                      {selectedStudents.has(contact.id)
                        ? <CheckSquare className="w-4 h-4 text-cyan-400" />
                        : <Square className="w-4 h-4 text-white/40" />
                      }
                    </button>
                  )}
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shrink-0">
                    <User className="w-4 h-4 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-white truncate">{contact.name}</span>
                      {unread > 0 && (
                        <span className="w-5 h-5 bg-red-500 rounded-full text-[10px] text-white flex items-center justify-center shrink-0">
                          {unread}
                        </span>
                      )}
                    </div>
                    {lastMsg && (
                      <p className="text-xs text-white/40 truncate mt-0.5">{lastMsg.content}</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Chat Area - Right Panel */}
        <div className="flex-1 flex flex-col min-w-0">
          {selectedContact ? (
            <>
              {/* Chat Header */}
              <div className="p-3 flex items-center gap-3" style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                  <User className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h4 className="text-sm font-medium text-white">{selectedContactName}</h4>
                  <p className="text-xs text-white/40">在线</p>
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {chatMessages.map((msg, idx) => {
                  const isFromMe = msg.fromId === myId || (isTeacherView && isTeacherIdVariant(msg.fromId));
                  return (
                    <div
                      key={msg.id || idx}
                      className={`flex ${isFromMe ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[70%] px-3 py-2 rounded-xl text-sm ${
                          isFromMe
                            ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded-br-none'
                            : 'bg-white/10 text-white/90 rounded-bl-none'
                        }`}
                      >
                        <p>{msg.content}</p>
                        <p className={`text-[10px] mt-1 ${isFromMe ? 'text-white/60' : 'text-white/30'}`}>
                          {new Date(msg.createdAt).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>

              {/* Input Area */}
              <div className="p-3" style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}>
                <div className="flex gap-2">
                  <Input
                    value={newMessage}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewMessage(e.target.value)}
                    onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        if (batchMode && isTeacherView) {
                          handleBatchSend();
                        } else {
                          handleSend();
                        }
                      }
                    }}
                    placeholder={batchMode && isTeacherView ? '输入群发消息内容...' : '输入消息...'}
                    className="flex-1 h-9 text-sm rounded-lg bg-white/5 border-white/10 text-white placeholder:text-white/30 focus:border-cyan-400/50 focus:ring-cyan-400/20"
                  />
                  <Button
                    onClick={() => {
                      if (batchMode && isTeacherView) {
                        handleBatchSend();
                      } else {
                        handleSend();
                      }
                    }}
                    disabled={!newMessage.trim() || (batchMode && isTeacherView && selectedStudents.size === 0)}
                    className="h-9 px-4 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white rounded-lg"
                  >
                    <Send className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <Users className="w-12 h-12 text-white/20 mx-auto mb-3" />
                <p className="text-white/40 text-sm">选择联系人开始对话</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}
