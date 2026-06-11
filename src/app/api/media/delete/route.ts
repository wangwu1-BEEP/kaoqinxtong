import { NextRequest, NextResponse } from 'next/server';
import { S3Storage } from 'coze-coding-dev-sdk';

const storage = new S3Storage({
  endpointUrl: process.env.COZE_BUCKET_ENDPOINT_URL,
  accessKey: '',
  secretKey: '',
  bucketName: process.env.COZE_BUCKET_NAME,
  region: 'cn-beijing',
});

export async function POST(request: NextRequest) {
  try {
    const { s3Key } = await request.json();
    if (!s3Key) {
      return NextResponse.json({ error: 'No s3Key provided' }, { status: 400 });
    }

    const ok = await storage.deleteFile({ fileKey: s3Key });
    return NextResponse.json({ success: ok });
  } catch (error) {
    console.error('Media delete error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Delete failed' },
      { status: 500 }
    );
  }
}
