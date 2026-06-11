import { NextRequest, NextResponse } from 'next/server';
import { S3Storage } from 'coze-coding-dev-sdk';

const storage = new S3Storage({
  endpointUrl: process.env.COZE_BUCKET_ENDPOINT_URL,
  accessKey: '',
  secretKey: '',
  bucketName: process.env.COZE_BUCKET_NAME,
  region: 'cn-beijing',
});

export const maxDuration = 60; // Allow up to 60s for large video uploads

export async function POST(request: NextRequest) {
  try {
    // Check content length before processing (100MB max)
    const contentLength = request.headers.get('content-length');
    if (contentLength && parseInt(contentLength) > 100 * 1024 * 1024) {
      return NextResponse.json({ error: '文件大小超过100MB限制' }, { status: 413 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const title = (formData.get('title') as string) || '';
    const mediaType = (formData.get('type') as string) || 'photo';
    const classId = (formData.get('classId') as string) || 'class-001';
    const uploadedBy = (formData.get('uploadedBy') as string) || 'teacher';
    const uploadedByName = (formData.get('uploadedByName') as string) || '教师';

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Check file size (50MB max for video, 10MB for photo)
    const maxSize = mediaType === 'video' ? 50 * 1024 * 1024 : 10 * 1024 * 1024;
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: `文件大小超过限制(视频最大50MB, 图片最大10MB), 当前文件${(file.size / 1024 / 1024).toFixed(1)}MB` },
        { status: 413 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Determine content type
    const contentType = file.type || (mediaType === 'video' ? 'video/mp4' : 'image/jpeg');
    const ext = file.name.split('.').pop() || (mediaType === 'video' ? 'mp4' : 'jpg');
    const fileName = `media/${classId}/${Date.now()}_${Math.random().toString(36).slice(2, 7)}.${ext}`;

    // Upload to S3
    let fileKey: string;
    try {
      fileKey = await storage.uploadFile({
        fileContent: buffer,
        fileName,
        contentType,
      });
    } catch (uploadErr) {
      console.error('S3 upload error:', uploadErr);
      return NextResponse.json(
        { error: `文件存储失败: ${uploadErr instanceof Error ? uploadErr.message : '存储服务异常'}` },
        { status: 502 }
      );
    }

    // Generate a presigned URL for immediate access
    let url: string;
    try {
      url = await storage.generatePresignedUrl({
        key: fileKey,
        expireTime: 86400 * 7, // 7 days
      });
    } catch (urlErr) {
      console.error('S3 URL generation error:', urlErr);
      // URL generation failed, still return success with s3Key
      url = '';
    }

    // Return media metadata + S3 key (not base64)
    const mediaRecord = {
      id: `media-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      classId,
      title: title || file.name.replace(/\.[^/.]+$/, ''),
      type: mediaType,
      url,
      s3Key: fileKey,
      uploadedBy,
      uploadedByName,
      createdAt: new Date().toISOString(),
    };

    return NextResponse.json({ success: true, media: mediaRecord });
  } catch (error) {
    console.error('Media upload error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Upload failed' },
      { status: 500 }
    );
  }
}
