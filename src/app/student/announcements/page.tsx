'use client';

import { useState, useEffect } from 'react';
import { ArrowLeft, Megaphone } from 'lucide-react';
import { getCurrentUser } from '@/lib/userUtils';
import { getClassAnnouncements, SharedAnnouncement } from '@/lib/sharedData';
import { syncOnLogin } from '@/lib/syncUtils';

import { Student } from '@/types/attendance';
import { StoredUser } from '@/lib/userUtils';

export default function StudentAnnouncementsPage() {
  const [user, setUser] = useState<StoredUser | null>(null);
  const [announcements, setAnnouncements] = useState<SharedAnnouncement[]>([]);
  const [selectedAnn, setSelectedAnn] = useState<SharedAnnouncement | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const currentUser = getCurrentUser();
    if (!currentUser) {
      window.location.href = '/login';
      return;
    }
    setUser(currentUser);
    // 先同步云端数据再加载本地数据
    syncOnLogin().then(() => {
      if (currentUser.classId) {
        setAnnouncements(getClassAnnouncements(currentUser.classId));
      }
    }).finally(() => {
      setIsLoading(false);
    });
  }, []);

  useEffect(() => {
    if (!user?.classId) return;
    setAnnouncements(getClassAnnouncements(user.classId));
  }, [user?.classId]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#1a1a2e', color: '#fff' }}>
        <div>加载中...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-4" style={{ backgroundColor: '#1a1a2e', color: '#fff' }}>
      {/* 顶部 */}
      <div className="p-4 flex items-center gap-4">
        <button
          onClick={() => window.location.href = '/student'}
          className="flex items-center gap-2 px-4 py-2 rounded-xl"
          style={{ backgroundColor: '#2d2d44' }}
        >
          <ArrowLeft className="w-5 h-5" />
          返回
        </button>
        <h1 className="text-xl font-bold">班级公告</h1>
      </div>

      {/* 公告列表 */}
      <div className="px-4 space-y-3">
        {announcements.length === 0 ? (
          <div className="text-center py-12">
            <Megaphone className="w-16 h-16 mx-auto mb-4 opacity-40" />
            <p className="opacity-60">暂无公告</p>
          </div>
        ) : (
          announcements.map((ann) => (
            <div
              key={ann.id}
              className="p-4 rounded-xl cursor-pointer hover:scale-[1.01] transition-all"
              style={{ backgroundColor: '#2d2d44' }}
              onClick={() => setSelectedAnn(ann)}
            >
              <div className="flex items-start gap-3">
                {ann.important && (
                  <span className="px-2 py-0.5 text-xs rounded bg-red-500/20 text-red-400">重要</span>
                )}
                <div className="flex-1">
                  <div className="font-medium">{ann.title}</div>
                  <div className="text-sm opacity-60 mt-1 line-clamp-2">{ann.content}</div>
                  <div className="text-xs opacity-40 mt-2">
                    {ann.author} · {new Date(ann.createdAt).toLocaleDateString('zh-CN')}
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* 公告详情弹窗 */}
      {selectedAnn && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.8)' }}>
          <div className="w-full max-w-md rounded-2xl p-6" style={{ backgroundColor: '#2d2d44' }}>
            <h2 className="text-xl font-bold mb-4">{selectedAnn.title}</h2>
            <div className="text-sm opacity-80 mb-4 whitespace-pre-wrap">{selectedAnn.content}</div>
            <div className="text-xs opacity-40 mb-4">
              发布人：{selectedAnn.author} · {new Date(selectedAnn.createdAt).toLocaleString('zh-CN')}
            </div>
            <button
              onClick={() => setSelectedAnn(null)}
              className="w-full py-3 rounded-xl font-medium"
              style={{ backgroundColor: '#3b82f6' }}
            >
              关闭
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
