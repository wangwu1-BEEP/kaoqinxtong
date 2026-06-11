import { NextRequest, NextResponse } from 'next/server';

const FACE_API_BASE = 'http://localhost:5001';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const res = await fetch(`${FACE_API_BASE}/api/face/check-registration`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (error) {
    console.error('[Face check-registration proxy] Error:', error);
    return NextResponse.json({ success: false, error: '人脸服务不可用' }, { status: 503 });
  }
}
