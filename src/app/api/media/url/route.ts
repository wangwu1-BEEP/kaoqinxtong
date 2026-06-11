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
    const { key, expireTime } = await request.json();
    if (!key) {
      return NextResponse.json({ error: 'No key provided' }, { status: 400 });
    }

    const url = await storage.generatePresignedUrl({
      key,
      expireTime: expireTime || 86400 * 7, // default 7 days
    });

    return NextResponse.json({ url });
  } catch (error) {
    console.error('Generate URL error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to generate URL' },
      { status: 500 }
    );
  }
}
