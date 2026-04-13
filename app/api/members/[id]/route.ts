import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { FamilyMemberModel, UserModel } from '@/lib/models';
import { getSession } from '@/lib/session';

export async function PUT(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  const { id } = await props.params;
  await connectDB();
  const user = await UserModel.findById(session.userId).lean();
  const activeVaultOwner = user?.joinedVaultId || session.userId;

  if (user?.joinedVaultId) {
    const self = await FamilyMemberModel.findOne({ userId: activeVaultOwner, memberUserId: session.userId });
    if (!self || self.role !== 'admin') {
      return NextResponse.json({ ok: false, error: 'Permission denied' }, { status: 403 });
    }
  }

  const { name, emoji, role, permissions } = await req.json();
  const member = await FamilyMemberModel.findOneAndUpdate({ _id: id, userId: activeVaultOwner }, { name, emoji, role, permissions }, { new: true }).lean();
  if (!member) return NextResponse.json({ ok: false, error: 'Not found' }, { status: 404 });
  return NextResponse.json({ ok: true, data: { ...member, _id: member._id!.toString() } });
}

export async function DELETE(_: NextRequest, props: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  const { id } = await props.params;
  await connectDB();
  const user = await UserModel.findById(session.userId).lean();
  const activeVaultOwner = user?.joinedVaultId || session.userId;

  if (user?.joinedVaultId) {
    const self = await FamilyMemberModel.findOne({ userId: activeVaultOwner, memberUserId: session.userId });
    if (!self || self.role !== 'admin') {
      return NextResponse.json({ ok: false, error: 'Permission denied' }, { status: 403 });
    }
  }

  await FamilyMemberModel.findOneAndDelete({ _id: id, userId: activeVaultOwner });
  return NextResponse.json({ ok: true });
}
