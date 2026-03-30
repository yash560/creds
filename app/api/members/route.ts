import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { FamilyMemberModel } from '@/lib/models';
import { getSession } from '@/lib/session';

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  await connectDB();
  const members = await FamilyMemberModel.find({ userId: session.userId }).lean();
  return NextResponse.json({ ok: true, data: members.map(m => ({ ...m, _id: m._id!.toString() })) });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  await connectDB();
  const { name, emoji, role, permissions } = await req.json();
  const member = await FamilyMemberModel.create({ userId: session.userId, name, emoji: emoji || '👤', role: role || 'viewer', permissions: permissions || [] });
  return NextResponse.json({ ok: true, data: { ...member.toObject(), _id: member._id!.toString() } }, { status: 201 });
}
