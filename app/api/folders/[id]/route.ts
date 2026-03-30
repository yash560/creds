import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { FolderModel } from '@/lib/models';
import { getSession } from '@/lib/session';

export async function PUT(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  const { id } = await props.params;
  await connectDB();
  const { name, icon } = await req.json();
  const folder = await FolderModel.findOneAndUpdate({ _id: id, userId: session.userId }, { name, icon }, { new: true }).lean();
  if (!folder) return NextResponse.json({ ok: false, error: 'Not found' }, { status: 404 });
  return NextResponse.json({ ok: true, data: { ...folder, _id: folder._id!.toString() } });
}

export async function DELETE(_: NextRequest, props: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  const { id } = await props.params;
  await connectDB();
  await FolderModel.findOneAndDelete({ _id: id, userId: session.userId });
  return NextResponse.json({ ok: true });
}
