import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { ItemModel, FamilyMemberModel, UserModel } from '@/lib/models';
import { getSession } from '@/lib/session';

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const { restrictedTo } = await req.json();

  await connectDB();

  // Only vault owner or admins can manage access
  const user = await UserModel.findById(session.userId).lean();
  const activeVaultOwner = user?.joinedVaultId || session.userId;
  const isJoinedVault = !!user?.joinedVaultId;

  if (isJoinedVault) {
    const member = await FamilyMemberModel.findOne({ userId: activeVaultOwner, memberUserId: session.userId });
    if (!member || member.role !== 'admin') {
      return NextResponse.json({ ok: false, error: 'Only admins can manage access' }, { status: 403 });
    }
  } else {
    // If not joined, must be the owner of the item
    const item = await ItemModel.findOne({ _id: id, userId: session.userId });
    if (!item) return NextResponse.json({ ok: false, error: 'Item not found' }, { status: 404 });
  }

  // Update item access control
  const updatedItem = await ItemModel.findOneAndUpdate(
    { _id: id, userId: activeVaultOwner },
    { 
      $set: { 
        'accessControl.restrictedTo': restrictedTo || [] 
      } 
    },
    { new: true }
  );

  if (!updatedItem) {
    return NextResponse.json({ ok: false, error: 'Failed to update access' }, { status: 400 });
  }

  return NextResponse.json({ ok: true, data: updatedItem });
}
