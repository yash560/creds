import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { FolderModel } from '@/lib/models';
import { getSession } from '@/lib/session';

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  await connectDB();
  const folders = await FolderModel.find({ userId: session.userId }).sort({ name: 1 }).lean();
  return NextResponse.json({ ok: true, data: folders.map(f => ({ ...f, _id: f._id!.toString() })) });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  await connectDB();
  const { name, parentId, icon } = await req.json();
  let path: string[] = [];
  if (parentId) {
    const parent = await FolderModel.findOne({ _id: parentId, userId: session.userId }).lean();
    if (parent) path = [...((parent as { path?: string[] }).path || []), parentId];
  }
  const folder = await FolderModel.create({ userId: session.userId, name, parentId: parentId || null, path, icon });
  return NextResponse.json({ ok: true, data: { ...folder.toObject(), _id: folder._id!.toString() } }, { status: 201 });
}
