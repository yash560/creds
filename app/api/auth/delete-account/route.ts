import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { UserModel, ItemModel, FolderModel, FamilyMemberModel } from '@/lib/models';
import { verifySecret } from '@/lib/crypto-secret';
import { getSession, COOKIE_NAME, COOKIE_OPTS } from '@/lib/session';

// POST /api/auth/delete-account
export async function POST(req: NextRequest) {
    await connectDB();
    const session = await getSession();
    if (!session) return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });

    const { password } = await req.json();

    if (!password) {
        return NextResponse.json({ ok: false, error: 'Password is required' }, { status: 400 });
    }

    const user = await UserModel.findById(session.userId);
    if (!user) {
        return NextResponse.json({ ok: false, error: 'User not found' }, { status: 404 });
    }

    // Verify password for security
    const valid = await verifySecret(password, user.passwordHash);
    if (!valid) {
        return NextResponse.json({ ok: false, error: 'Incorrect password' }, { status: 401 });
    }

    // Delete all user data
    await Promise.all([
        ItemModel.deleteMany({ userId: session.userId }),
        FolderModel.deleteMany({ userId: session.userId }),
        FamilyMemberModel.deleteMany({ userId: session.userId }),
        UserModel.deleteOne({ _id: session.userId }),
    ]);

    // Clear session cookie
    const response = NextResponse.json({ ok: true, message: 'Account deleted' });
    response.cookies.set(COOKIE_NAME, '', { maxAge: 0, path: '/' });

    return response;
}
