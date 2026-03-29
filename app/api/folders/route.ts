import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { FolderModel } from '@/lib/models';
import { cookies } from 'next/headers';

function isUnlocked() {
  const cookieStore = cookies();
  return (cookieStore as unknown as { get: (name: string) => { value: string } | undefined }).get('vault_session')?.value === 'unlocked';
}

export async function GET() {
  if (!isUnlocked()) return NextResponse.json({ ok: false, error: 'Locked' }, { status: 401 });
  await connectDB();
  const folders = await FolderModel.find().sort({ name: 1 }).lean();
  return NextResponse.json({ ok: true, data: folders.map(f => ({ ...f, _id: f._id!.toString() })) });
}

export async function POST(req: NextRequest) {
  if (!isUnlocked()) return NextResponse.json({ ok: false, error: 'Locked' }, { status: 401 });
  await connectDB();
  const { name, parentId, icon } = await req.json();

  let path: string[] = [];
  if (parentId) {
    const parent = await FolderModel.findById(parentId).lean();
    if (parent) path = [...((parent as { path?: string[] }).path || []), parentId];
  }

  const folder = await FolderModel.create({ name, parentId: parentId || null, path, icon });
  return NextResponse.json({ ok: true, data: { ...folder.toObject(), _id: folder._id!.toString() } }, { status: 201 });
}
