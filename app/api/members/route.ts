import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { FamilyMemberModel } from '@/lib/models';
import { cookies } from 'next/headers';

function isUnlocked() {
  const cookieStore = cookies();
  return (cookieStore as unknown as { get: (name: string) => { value: string } | undefined }).get('vault_session')?.value === 'unlocked';
}

export async function GET() {
  if (!isUnlocked()) return NextResponse.json({ ok: false, error: 'Locked' }, { status: 401 });
  await connectDB();
  const members = await FamilyMemberModel.find().lean();
  return NextResponse.json({ ok: true, data: members.map(m => ({ ...m, _id: m._id!.toString() })) });
}

export async function POST(req: NextRequest) {
  if (!isUnlocked()) return NextResponse.json({ ok: false, error: 'Locked' }, { status: 401 });
  await connectDB();
  const { name, emoji, role, permissions } = await req.json();
  const member = await FamilyMemberModel.create({ name, emoji: emoji || '👤', role: role || 'viewer', permissions: permissions || [] });
  return NextResponse.json({ ok: true, data: { ...member.toObject(), _id: member._id!.toString() } }, { status: 201 });
}
