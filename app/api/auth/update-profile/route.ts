import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { UserModel } from '@/lib/models';
import { getSession } from '@/lib/session';

export async function POST(req: NextRequest) {
  try {
    await connectDB();
    const session = await getSession();

    if (!session) {
      return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { name, phone, vaultName } = await req.json();

    const user = await UserModel.findById(session.userId);
    if (!user) {
      return NextResponse.json({ ok: false, error: 'User not found' }, { status: 404 });
    }

    if (name !== undefined) user.name = name;
    if (phone !== undefined) user.phone = phone;
    if (vaultName !== undefined) user.vaultName = vaultName;

    await user.save();

    return NextResponse.json({
      ok: true,
      user: {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        phone: user.phone,
        vaultName: user.vaultName,
        hasPinSet: !!user.pinHash,
      },
    });
  } catch (error) {
    console.error('Update profile error:', error);
    return NextResponse.json({ ok: false, error: 'Internal server error' }, { status: 500 });
  }
}
