'use client';

import { useState, useEffect } from 'react';
import { Megaphone, ChevronRight, X } from 'lucide-react';
import { getAnnouncements } from '@/lib/sharedData';
import type { SharedAnnouncement } from '@/lib/sharedData';

interface ScrollingAnnouncementProps {
  classId?: string;
}

export default function ScrollingAnnouncement({ classId }: ScrollingAnnouncementProps) {
  const [announcements, setAnnouncements] = useState<SharedAnnouncement[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [dismissed, setDismissed] = useState(false);
  const [showDetail, setShowDetail] = useState(false);

  useEffect(() => {
    const all = getAnnouncements();
    const filtered = classId ? all.filter(a => a.classId === classId || !a.classId) : all;
    // Only show recent announcements (within 7 days)
    const recent = filtered.filter(a => {
      const date = new Date(a.createdAt);
      return Date.now() - date.getTime() < 7 * 24 * 60 * 60 * 1000;
    });
    setAnnouncements(recent);
  }, [classId]);

  useEffect(() => {
    if (announcements.length <= 1) return;
    const timer = setInterval(() => {
      setCurrentIndex(prev => (prev + 1) % announcements.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [announcements.length]);

  if (announcements.length === 0 || dismissed) return null;

  const current = announcements[currentIndex];

  return (
    <>
      {/* Scrolling banner */}
      <div className="bg-gradient-to-r from-blue-500/10 via-purple-500/10 to-pink-500/10 border border-blue-500/20 rounded-xl p-3 flex items-center gap-3 overflow-hidden">
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center">
          <Megaphone className="w-4 h-4 text-white" />
        </div>
        <div className="flex-1 min-w-0 overflow-hidden">
          <div className="flex items-center gap-2">
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300 flex-shrink-0">
              {currentIndex + 1}/{announcements.length}
            </span>
            <p className="text-sm text-white/90 truncate">{current.title}</p>
          </div>
        </div>
        <button onClick={() => setShowDetail(true)} className="flex-shrink-0 text-blue-400 hover:text-blue-300">
          <ChevronRight className="w-4 h-4" />
        </button>
        <button onClick={() => setDismissed(true)} className="flex-shrink-0 text-white/30 hover:text-white/60">
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Detail modal */}
      {showDetail && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowDetail(false)}>
          <div className="bg-[#1a1a2e] border border-white/10 rounded-2xl p-6 max-w-md w-full space-y-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center">
                <Megaphone className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">{current.title}</h3>
                <p className="text-xs text-white/40">{new Date(current.createdAt).toLocaleString()}</p>
              </div>
            </div>
            <p className="text-sm text-white/70 leading-relaxed whitespace-pre-wrap">{current.content}</p>
            <button onClick={() => setShowDetail(false)}
              className="w-full py-2 rounded-lg bg-white/5 hover:bg-white/10 text-white/70 text-sm transition-all">
              关闭
            </button>
          </div>
        </div>
      )}
    </>
  );
}
