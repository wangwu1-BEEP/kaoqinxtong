'use client';

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Upload, Image as ImageIcon, Video, Trash2, Download, X, Loader2, Play, Camera, Film } from 'lucide-react';
import { getMedia, deleteMedia } from '@/lib/sharedData';
import type { ClassMedia, MediaType } from '@/types/attendance';
import MediaInteraction from './MediaInteraction';
import { Heart, MessageCircle } from 'lucide-react';
import { getMediaComments, getMediaLikes } from '@/lib/sharedData';

interface MediaGalleryProps {
  userRole: 'teacher' | 'student' | 'parent';
  userId?: string;
  userName?: string;
}

export default function MediaGallery({ userRole, userId: propUserId, userName: propUserName }: MediaGalleryProps) {
  const [currentUserId, setCurrentUserId] = useState(propUserId || '');
  const [currentUserName, setCurrentUserName] = useState(propUserName || '');

  useEffect(() => {
    if (!propUserId && typeof window !== 'undefined') {
      try {
        const u = JSON.parse(localStorage.getItem('user') || localStorage.getItem('currentUser') || '{}');
        setCurrentUserId(u.id || u.username || '');
        setCurrentUserName(u.name || u.username || '');
      } catch { /* ignore */ }
    }
  }, [propUserId]);
  const [mediaList, setMediaList] = useState<ClassMedia[]>([]);
  const [uploading, setUploading] = useState(false);
  const [title, setTitle] = useState('');
  const [previewMedia, setPreviewMedia] = useState<ClassMedia | null>(null);
  const [filter, setFilter] = useState<'all' | 'photo' | 'video'>('all');
  const [loadingUrls, setLoadingUrls] = useState<Set<string>>(new Set());
  const [urlCache, setUrlCache] = useState<Record<string, string>>({});
  const [mounted, setMounted] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setMounted(true);
    refreshMedia();
  }, []);

  useEffect(() => {
    if (!mounted) return;
    const refreshUrls = async () => {
      const keysToRefresh: string[] = [];
      for (const m of mediaList) {
        if (m.s3Key && !urlCache[m.id]) {
          keysToRefresh.push(m.id);
        }
      }
      if (keysToRefresh.length === 0) return;

      const newCache: Record<string, string> = {};
      for (const mediaId of keysToRefresh) {
        const media = mediaList.find(m => m.id === mediaId);
        if (!media?.s3Key) continue;
        try {
          const res = await fetch('/api/media/url', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ key: media.s3Key, expireTime: 86400 * 7 }),
          });
          const data = await res.json();
          if (data.url) {
            newCache[mediaId] = data.url;
          }
        } catch {
          // Fallback to stored URL
        }
      }
      if (Object.keys(newCache).length > 0) {
        setUrlCache(prev => ({ ...prev, ...newCache }));
      }
    };
    refreshUrls();
  }, [mediaList, mounted]);

  const refreshMedia = useCallback(() => {
    setMediaList(getMedia());
  }, []);

  const handleUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const mediaType: MediaType = file.type.startsWith('video/') ? 'video' : 'photo';

        // Validate file size before uploading
        const maxVideoSize = 50 * 1024 * 1024; // 50MB
        const maxPhotoSize = 10 * 1024 * 1024; // 10MB
        const maxSize = mediaType === 'video' ? maxVideoSize : maxPhotoSize;
        if (file.size > maxSize) {
          const limit = mediaType === 'video' ? '50MB' : '10MB';
          throw new Error(`${mediaType === 'video' ? '视频' : '图片'}文件大小超过限制(${limit})，当前${(file.size / 1024 / 1024).toFixed(1)}MB`);
        }

        // 将文件转为 base64，直接存储到 localStorage
        const reader = new FileReader();
        const base64Data = await new Promise<string>((resolve, reject) => {
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          if (mediaType === 'video') {
            reader.readAsDataURL(file);
          } else {
            reader.readAsDataURL(file);
          }
        });

        const mediaRecord: ClassMedia = {
          id: `media-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          classId: 'class-001',
          title: title || file.name.replace(/\.[^/.]+$/, ''),
          type: mediaType,
          url: base64Data, // 存储 base64 数据
          s3Key: '',
          uploadedBy: currentUserId || 'teacher',
          uploadedByName: currentUserName || '教师',
          createdAt: new Date().toISOString(),
        };

        const existingMedia = getMedia();
        existingMedia.push(mediaRecord);
        localStorage.setItem('shared_media', JSON.stringify(existingMedia));

        setUrlCache(prev => ({ ...prev, [mediaRecord.id]: mediaRecord.url }));
      }

      refreshMedia();
      setTitle('');
    } catch (err) {
      console.error('Upload error:', err);
      alert(`上传失败: ${err instanceof Error ? err.message : '未知错误'}`);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }, [title, currentUserId, currentUserName, refreshMedia]);

  const handleDelete = useCallback(async (mediaId: string) => {
    const media = mediaList.find(m => m.id === mediaId);
    if (!media) return;

    // base64 数据不需要调用 S3 删除，直接删除本地记录
    deleteMedia(mediaId);
    setUrlCache(prev => {
      const next = { ...prev };
      delete next[mediaId];
      return next;
    });
    refreshMedia();
  }, [mediaList, refreshMedia]);

  const handleDownload = useCallback(async (media: ClassMedia) => {
    const downloadUrl = urlCache[media.id] || media.url;
    try {
      const response = await fetch(downloadUrl);
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = `${media.title}.${media.type === 'video' ? 'mp4' : 'jpg'}`;
      link.click();
      window.URL.revokeObjectURL(blobUrl);
    } catch {
      window.open(downloadUrl, '_blank');
    }
  }, [urlCache]);

  const getMediaUrl = useCallback((media: ClassMedia) => {
    return urlCache[media.id] || media.url;
  }, [urlCache]);

  const filteredMedia = filter === 'all'
    ? mediaList
    : mediaList.filter(m => m.type === filter);

  const photoCount = mediaList.filter(m => m.type === 'photo').length;
  const videoCount = mediaList.filter(m => m.type === 'video').length;

  if (!mounted) {
    return (
      <Card className="shadow-xl border-0 overflow-hidden">
        <div className="h-2 bg-gradient-to-r from-violet-500 via-purple-500 to-fuchsia-500" />
        <CardContent className="py-12 text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-3 text-violet-500" />
          <p className="text-gray-500">加载相册中...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Card */}
      <Card className="shadow-xl border-0 overflow-hidden">
        <div className="h-2 bg-gradient-to-r from-violet-500 via-purple-500 to-fuchsia-500" />
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-gradient-to-br from-violet-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg">
                <Camera className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-800">班级相册</h2>
                <p className="text-sm text-gray-500">
                  {photoCount} 张照片 · {videoCount} 个视频
                </p>
              </div>
            </div>

            {userRole === 'teacher' && (
              <div className="flex items-center gap-3 w-full sm:w-auto">
                <Input
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  placeholder="输入标题（可选）"
                  className="flex-1 sm:w-48 rounded-xl border-gray-200 focus:border-violet-400 focus:ring-violet-400"
                />
                <label className="cursor-pointer">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*,video/*"
                    multiple
                    onChange={handleUpload}
                    className="hidden"
                    disabled={uploading}
                  />
                  <Button
                    disabled={uploading}
                    className="bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700 text-white shadow-lg hover:shadow-xl transition-all duration-300 rounded-xl"
                    asChild
                  >
                    <span>
                      {uploading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Upload className="h-4 w-4 mr-2" />}
                      {uploading ? '上传中...' : '上传'}
                    </span>
                  </Button>
                </label>
              </div>
            )}
          </div>

          {/* Filter Tabs */}
          <div className="flex gap-2 mt-5">
            {([
              { key: 'all' as const, label: '全部', icon: <Camera className="w-3.5 h-3.5" /> },
              { key: 'photo' as const, label: `照片 (${photoCount})`, icon: <ImageIcon className="w-3.5 h-3.5" /> },
              { key: 'video' as const, label: `视频 (${videoCount})`, icon: <Film className="w-3.5 h-3.5" /> },
            ]).map(f => (
              <Button
                key={f.key}
                variant={filter === f.key ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilter(f.key)}
                className={`rounded-xl transition-all duration-300 ${
                  filter === f.key
                    ? 'bg-gradient-to-r from-violet-500 to-purple-600 text-white shadow-md border-0'
                    : 'border-gray-200 hover:border-violet-300 hover:text-violet-600'
                }`}
              >
                {f.icon}
                <span className="ml-1.5">{f.label}</span>
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Media Grid */}
      {filteredMedia.length === 0 ? (
        <Card className="shadow-lg border-0">
          <CardContent className="py-16">
            <div className="text-center">
              <div className="w-20 h-20 bg-gradient-to-br from-violet-100 to-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Camera className="w-10 h-10 text-violet-300" />
              </div>
              <p className="text-gray-500 text-lg font-medium">暂无班级照片或视频</p>
              <p className="text-gray-400 text-sm mt-1">
                {userRole === 'teacher' ? '点击上方上传按钮添加班级精彩瞬间' : '老师还没有上传班级照片'}
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {filteredMedia.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).map(media => {
            const mediaUrl = getMediaUrl(media);
            return (
              <div
                key={media.id}
                className="group relative rounded-2xl overflow-hidden bg-gray-100 shadow-md hover:shadow-xl transition-all duration-300 hover:-translate-y-1 cursor-pointer"
                onClick={() => setPreviewMedia(media)}
              >
                {media.type === 'photo' ? (
                  <div className="aspect-[4/3] relative">
                    {mediaUrl ? (
                      <img
                        src={mediaUrl}
                        alt={media.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-violet-50 to-purple-50">
                        <Loader2 className="h-8 w-8 animate-spin text-violet-300" />
                      </div>
                    )}
                    {/* Hover overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  </div>
                ) : (
                  <div className="aspect-[4/3] relative bg-gradient-to-br from-gray-800 to-gray-900">
                    {mediaUrl ? (
                      <video
                        src={mediaUrl}
                        className="w-full h-full object-cover"
                        preload="metadata"
                      />
                    ) : null}
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-14 h-14 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                        <Play className="h-7 w-7 text-white ml-1" />
                      </div>
                    </div>
                    {/* Video badge */}
                    <div className="absolute top-2 left-2 bg-black/60 backdrop-blur-sm text-white text-xs px-2 py-0.5 rounded-md flex items-center gap-1">
                      <Video className="w-3 h-3" />
                      视频
                    </div>
                  </div>
                )}

                {/* Info overlay at bottom */}
                <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/70 to-transparent">
                  <p className="text-white text-sm font-medium truncate">{media.title}</p>
                  <div className="flex items-center justify-between">
                    <p className="text-white/70 text-xs">
                      {new Date(media.createdAt).toLocaleDateString('zh-CN')}
                    </p>
                    <div className="flex items-center gap-2">
                      <span className="flex items-center gap-0.5 text-white/80 text-xs">
                        <Heart className={`w-3 h-3 ${getMediaLikes(media.id).count > 0 ? 'fill-red-400 text-red-400' : ''}`} />
                        {getMediaLikes(media.id).count}
                      </span>
                      <span className="flex items-center gap-0.5 text-white/80 text-xs">
                        <MessageCircle className="w-3 h-3" />
                        {getMediaComments(media.id).filter(c => c.type !== 'like').length}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Action buttons for teacher */}
                {userRole === 'teacher' && (
                  <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex gap-1.5">
                    <Button
                      size="sm"
                      className="w-8 h-8 p-0 bg-white/80 backdrop-blur-sm hover:bg-white text-gray-700 rounded-lg shadow-md border-0"
                      onClick={(e) => { e.stopPropagation(); handleDownload(media); }}
                    >
                      <Download className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      size="sm"
                      className="w-8 h-8 p-0 bg-red-500/80 backdrop-blur-sm hover:bg-red-600 text-white rounded-lg shadow-md border-0"
                      onClick={(e) => { e.stopPropagation(); handleDelete(media.id); }}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Preview Modal */}
      {previewMedia && (
        <div
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setPreviewMedia(null)}
        >
          <div className="relative max-w-5xl max-h-[90vh] w-full flex flex-col overflow-y-auto" onClick={e => e.stopPropagation()}>
            {/* Close button */}
            <Button
              variant="ghost"
              size="sm"
              className="absolute -top-12 right-0 z-10 text-white hover:bg-white/20 rounded-xl"
              onClick={() => setPreviewMedia(null)}
            >
              <X className="h-6 w-6" />
            </Button>

            {previewMedia.type === 'photo' ? (
              <img
                src={getMediaUrl(previewMedia)}
                alt={previewMedia.title}
                className="max-w-full max-h-[50vh] mx-auto object-contain rounded-lg shadow-2xl flex-shrink-0"
              />
            ) : (
              <video
                src={getMediaUrl(previewMedia)}
                controls
                autoPlay
                className="max-w-full max-h-[50vh] mx-auto rounded-lg shadow-2xl flex-shrink-0"
              />
            )}

            {/* Info bar + Likes & Comments - scrollable area */}
            <div className="flex-1 min-h-0 overflow-y-auto">
              <div className="flex items-center justify-between mt-4 px-2">
                <div>
                  <p className="text-white text-lg font-medium">{previewMedia.title}</p>
                <p className="text-white/60 text-sm">
                  {new Date(previewMedia.createdAt).toLocaleDateString('zh-CN', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                  {previewMedia.uploadedByName && ` · ${previewMedia.uploadedByName}上传`}
                </p>
              </div>
              <Button
                variant="outline"
                className="border-white/30 text-white hover:bg-white/20 rounded-xl"
                onClick={() => handleDownload(previewMedia)}
              >
                <Download className="h-4 w-4 mr-2" />
                下载
              </Button>
            </div>
              {/* Likes & Comments */}
              <MediaInteraction mediaId={previewMedia.id} userId={currentUserId} userName={currentUserName} userRole={userRole} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
