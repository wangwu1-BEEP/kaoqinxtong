import { NextResponse } from 'next/server';
import { migrateLocalToDatabase, syncFromDatabase } from '@/lib/migrate';

export async function POST() {
  try {
    const result = await migrateLocalToDatabase();
    if (result) {
      return NextResponse.json({ success: true, message: '数据迁移成功' });
    }
    return NextResponse.json({ success: false, message: '数据迁移失败' }, { status: 500 });
  } catch (error) {
    console.error('Migration error:', error);
    return NextResponse.json({ success: false, message: '数据迁移失败', error: String(error) }, { status: 500 });
  }
}

export async function GET() {
  try {
    const result = await syncFromDatabase();
    if (result) {
      return NextResponse.json({ success: true, message: '数据同步成功' });
    }
    return NextResponse.json({ success: false, message: '数据同步失败' }, { status: 500 });
  } catch (error) {
    console.error('Sync error:', error);
    return NextResponse.json({ success: false, message: '数据同步失败', error: String(error) }, { status: 500 });
  }
}
