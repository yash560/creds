import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { InvitationModel } from '@/lib/models';
import { getSession } from '@/lib/session';
import crypto from 'crypto';

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });

  await connectDB();
  const invitations = await InvitationModel.find({ vaultOwnerId: session.userId }).sort({ createdAt: -1 });
  return NextResponse.json({ ok: true, data: invitations });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });

  try {
    await connectDB();
    const { name, role } = await req.json();
    
    if (!name) {
      return NextResponse.json({ ok: false, error: 'Name is required' }, { status: 400 });
    }

    const token = crypto.randomBytes(16).toString('hex');
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days expiry

    const invitation = await InvitationModel.create({
      token,
      vaultOwnerId: session.userId,
      name,
      role: role || 'viewer',
      status: 'pending',
      expiresAt,
    });

    return NextResponse.json({ ok: true, data: invitation });
  } catch (error) {
    console.error('Failed to create invitation:', error);
    return NextResponse.json({ ok: false, error: 'Failed to create invitation' }, { status: 500 });
  }
}
