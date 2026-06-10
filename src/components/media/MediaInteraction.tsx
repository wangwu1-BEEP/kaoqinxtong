'use client';

import { useState, useEffect, useCallback } from 'react';
import { Heart, MessageCircle, Send } from 'lucide-react';
import { getMediaComments, addMediaComment, toggleMediaLike, getMediaLikes } from '@/lib/sharedData';
import type { MediaComment } from '@/types/attendance';

interface MediaInteractionProps {
  mediaId: string;
  userId: string;
  userName: string;
  userRole: string;
}

export default function MediaInteraction({ mediaId, userId, userName, userRole }: MediaInteractionProps) {
  const [comments, setComments] = useState<MediaComment[]>([]);
  const [likesCount, setLikesCount] = useState(0);
  const [isLiked, setIsLiked] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [commentText, setCommentText] = useState('');

  const refresh = useCallback(() => {
    if (typeof window === 'undefined') return;
    const allComments = getMediaComments(mediaId);
    // 只显示真正的评论，过滤掉点赞记录
    const realComments = allComments.filter(c => c.type !== 'like');
    setComments(realComments);
    const likeData = getMediaLikes(mediaId);
    setLikesCount(likeData.count);
    setIsLiked(likeData.isLiked);
  }, [mediaId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const handleLike = () => {
    if (!userId) return;
    toggleMediaLike(mediaId, userId);
    refresh();
  };

  const handleComment = () => {
    if (!commentText.trim() || !userId) return;
    const userRoleTyped = (userRole || 'student') as 'student' | 'teacher' | 'parent';
    addMediaComment({
      mediaId,
      userId,
      userName: userName || '匿名用户',
      userRole: userRoleTyped,
      type: 'comment',
      content: commentText.trim()
    });
    setCommentText('');
    refresh();
  };

  const commentsCount = comments.length;

  return (
    <div className="space-y-3">
      {/* 点赞和评论按钮 */}
      <div className="flex items-center gap-4">
        <button
          onClick={handleLike}
          className={`flex items-center gap-1.5 transition-all duration-200 ${isLiked ? 'text-red-400' : 'text-white/50 hover:text-red-400'}`}
        >
          <Heart className={`w-4 h-4 ${isLiked ? 'fill-current' : ''}`} />
          <span className="text-xs">{likesCount > 0 ? likesCount : '点赞'}</span>
        </button>
        <button
          onClick={() => setShowComments(!showComments)}
          className={`flex items-center gap-1.5 transition-all duration-200 ${showComments ? 'text-blue-400' : 'text-white/50 hover:text-blue-400'}`}
        >
          <MessageCircle className="w-4 h-4" />
          <span className="text-xs">{commentsCount > 0 ? commentsCount : '评论'}</span>
        </button>
      </div>

      {/* 评论区 */}
      {showComments && (
        <div className="space-y-2 border-t border-white/10 pt-3">
          {/* 评论列表 */}
          <div className="space-y-2.5 max-h-40 overflow-y-auto">
            {comments.length === 0 && (
              <p className="text-white/30 text-xs text-center py-2">暂无评论，来说点什么吧</p>
            )}
            {comments.map(c => (
              <div key={c.id} className="flex gap-2">
                <div className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-[10px] text-white flex-shrink-0 mt-0.5">
                  {c.userName?.[0] || '?'}
                </div>
                <div className="flex-1 min-w-0">
                  <span className="text-xs text-blue-300 font-medium">{c.userName}</span>
                  <span className="text-[10px] text-white/30 ml-2">{c.userRole === 'teacher' ? '老师' : c.userRole === 'parent' ? '家长' : '同学'}</span>
                  <p className="text-xs text-white/70 break-all leading-relaxed">{c.content}</p>
                </div>
              </div>
            ))}
          </div>

          {/* 评论输入框 */}
          <div className="flex gap-2 pt-2">
            <input
              value={commentText}
              onChange={e => setCommentText(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleComment(); } }}
              placeholder="写评论..."
              className="flex-1 bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-sm text-white placeholder-white/30 focus:outline-none focus:border-blue-400 focus:bg-white/15 transition-colors"
            />
            <button
              onClick={handleComment}
              disabled={!commentText.trim()}
              className={`px-3 py-2 rounded-lg transition-all duration-200 ${commentText.trim() ? 'bg-blue-500/80 hover:bg-blue-500 text-white' : 'bg-white/5 text-white/20 cursor-not-allowed'}`}
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
