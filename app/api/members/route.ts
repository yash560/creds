import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { FamilyMemberModel, UserModel } from '@/lib/models';
import { getSession } from '@/lib/session';

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  await connectDB();
  const user = await UserModel.findById(session.userId).lean();
  const activeVaultOwner = user?.joinedVaultId || session.userId;
  const members = await FamilyMemberModel.find({ userId: activeVaultOwner }).lean();
  return NextResponse.json({ ok: true, data: members.map(m => ({ ...m, _id: m._id!.toString() })) });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  await connectDB();
  const user = await UserModel.findById(session.userId).lean();
  const activeVaultOwnerId = user?.joinedVaultId || session.userId;
  
  if (user?.joinedVaultId) {
    // Check if current user is admin in this vault
    const self = await FamilyMemberModel.findOne({ userId: activeVaultOwnerId, memberUserId: session.userId });
    if (!self || self.role !== 'admin') {
      return NextResponse.json({ ok: false, error: 'Permission denied' }, { status: 403 });
    }
  }

  const { name, emoji, role, permissions } = await req.json();
  const member = await FamilyMemberModel.create({ userId: activeVaultOwnerId, name, emoji: emoji || '👤', role: role || 'viewer', permissions: permissions || [] });
  return NextResponse.json({ ok: true, data: { ...member.toObject(), _id: member._id!.toString() } }, { status: 201 });
}
