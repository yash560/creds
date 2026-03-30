import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { UserModel } from '@/lib/models';
import { hashSecret, verifySecret } from '@/lib/crypto-secret';
import { getSession } from '@/lib/session';

// POST /api/auth/change-password
export async function POST(req: NextRequest) {
    await connectDB();
    const session = await getSession();
    if (!session) return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });

    const { currentPassword, newPassword } = await req.json();

    if (!currentPassword || !newPassword) {
        return NextResponse.json({ ok: false, error: 'Current and new password are required' }, { status: 400 });
    }

    if (newPassword.length < 8) {
        return NextResponse.json({ ok: false, error: 'New password must be at least 8 characters' }, { status: 400 });
    }

    const user = await UserModel.findById(session.userId);
    if (!user) {
        return NextResponse.json({ ok: false, error: 'User not found' }, { status: 404 });
    }

    // Verify current password
    const valid = await verifySecret(currentPassword, user.passwordHash);
    if (!valid) {
        return NextResponse.json({ ok: false, error: 'Current password is incorrect' }, { status: 401 });
    }

    // Hash and save new password
    user.passwordHash = await hashSecret(newPassword);
    await user.save();

    return NextResponse.json({ ok: true, message: 'Password changed successfully' });
}
