import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { InvitationModel, UserModel } from '@/lib/models';

export async function GET(
  req: NextRequest,
  props: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await props.params;
    await connectDB();
    const invitation = await InvitationModel.findOne({ token });

    if (!invitation) {
      return NextResponse.json({ ok: false, error: 'Invitation not found' }, { status: 404 });
    }

    if (invitation.status !== 'pending') {
      return NextResponse.json({ ok: false, error: 'Invitation already used or expired' }, { status: 400 });
    }

    if (new Date() > invitation.expiresAt) {
      invitation.status = 'expired';
      await invitation.save();
      return NextResponse.json({ ok: false, error: 'Invitation expired' }, { status: 400 });
    }

    const owner = await UserModel.findById(invitation.vaultOwnerId).lean();
    
    return NextResponse.json({ 
      ok: true, 
      data: { 
        ...invitation.toObject(), 
        vaultName: owner?.vaultName || 'A Shared Vault',
        ownerName: owner?.name || 'A Vaultora User'
      } 
    });
  } catch {
    return NextResponse.json({ ok: false, error: 'Internal server error' }, { status: 500 });
  }
}
