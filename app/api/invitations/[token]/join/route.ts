import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { InvitationModel, UserModel, FamilyMemberModel } from '@/lib/models';
import { getSession } from '@/lib/session';

export async function POST(
  req: NextRequest,
  props: { params: Promise<{ token: string }> }
) {
  const { token } = await props.params;
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ ok: false, error: 'You must be signed in to join a vault' }, { status: 401 });
  }

  try {
    await connectDB();
    const invitation = await InvitationModel.findOne({ token });

    if (!invitation || invitation.status !== 'pending' || new Date() > invitation.expiresAt) {
      return NextResponse.json({ ok: false, error: 'Invalid or expired invitation' }, { status: 400 });
    }

    // 1. Update User to link to the new vault
    await UserModel.findByIdAndUpdate(session.userId, {
      joinedVaultId: invitation.vaultOwnerId
    });

    // 2. Add as a FamilyMember in the owner's vault
    // Check if already a member first
    const existingMember = await FamilyMemberModel.findOne({
      userId: invitation.vaultOwnerId,
      memberUserId: session.userId
    });

    if (!existingMember) {
      await FamilyMemberModel.create({
        userId: invitation.vaultOwnerId,
        name: invitation.name,
        memberUserId: session.userId,
        role: invitation.role,
        permissions: [] // default
      });
    }

    // 3. Mark invitation as accepted
    invitation.status = 'accepted';
    await invitation.save();

    return NextResponse.json({ ok: true, message: 'Successfully joined the vault' });
  } catch (error) {
    console.error('Join vault error:', error);
    return NextResponse.json({ ok: false, error: 'Internal server error' }, { status: 500 });
  }
}
