import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { FamilyMemberModel } from '@/lib/models';
import { getSession } from '@/lib/session';

export async function PUT(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  const { id } = await props.params;
  await connectDB();
  const { name, emoji, role, permissions } = await req.json();
  const member = await FamilyMemberModel.findOneAndUpdate({ _id: id, userId: session.userId }, { name, emoji, role, permissions }, { new: true }).lean();
  if (!member) return NextResponse.json({ ok: false, error: 'Not found' }, { status: 404 });
  return NextResponse.json({ ok: true, data: { ...member, _id: member._id!.toString() } });
}

export async function DELETE(_: NextRequest, props: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  const { id } = await props.params;
  await connectDB();
  await FamilyMemberModel.findOneAndDelete({ _id: id, userId: session.userId });
  return NextResponse.json({ ok: true });
}
