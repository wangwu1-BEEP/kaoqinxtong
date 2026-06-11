import { NextResponse } from 'next/server';

const FACE_API_BASE = 'http://localhost:5001';

export async function GET() {
  try {
    const res = await fetch(`${FACE_API_BASE}/api/face/health`);
    const data = await res.json();
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ status: 'offline', opencv_version: null, models_loaded: false }, { status: 503 });
  }
}
