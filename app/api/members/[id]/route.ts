import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { FamilyMemberModel } from '@/lib/models';
import { cookies } from 'next/headers';

function isUnlocked() {
  const cookieStore = cookies();
  return (cookieStore as unknown as { get: (name: string) => { value: string } | undefined }).get('vault_session')?.value === 'unlocked';
}

export async function PUT(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  if (!isUnlocked()) return NextResponse.json({ ok: false, error: 'Locked' }, { status: 401 });
  const { id } = await props.params;
  await connectDB();
  const { name, emoji, role, permissions } = await req.json();
  const member = await FamilyMemberModel.findByIdAndUpdate(id, { name, emoji, role, permissions }, { new: true }).lean();
  if (!member) return NextResponse.json({ ok: false, error: 'Not found' }, { status: 404 });
  return NextResponse.json({ ok: true, data: { ...member, _id: member._id!.toString() } });
}

export async function DELETE(_: NextRequest, props: { params: Promise<{ id: string }> }) {
  if (!isUnlocked()) return NextResponse.json({ ok: false, error: 'Locked' }, { status: 401 });
  const { id } = await props.params;
  await connectDB();
  await FamilyMemberModel.findByIdAndDelete(id);
  return NextResponse.json({ ok: true });
}
