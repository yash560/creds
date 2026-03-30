import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { UserModel } from '@/lib/models';
import { verifySecret } from '@/lib/crypto-secret';
import { createSessionCookie, getSession, COOKIE_NAME, COOKIE_OPTS } from '@/lib/session';

// GET /api/auth/verify — check session status
export async function GET() {
  await connectDB();
  const session = await getSession();

  if (!session) {
    // Check if any users exist (to show register vs login)
    const hasUsers = (await UserModel.countDocuments()) > 0;
    return NextResponse.json({ ok: true, isLoggedIn: false, hasUsers });
  }

  const user = await UserModel.findById(session.userId).lean();
  if (!user) {
    const hasUsers = (await UserModel.countDocuments()) > 0;
    const res = NextResponse.json({ ok: true, isLoggedIn: false, hasUsers });
    res.cookies.set(COOKIE_NAME, '', { maxAge: 0, path: '/' });
    return res;
  }

  return NextResponse.json({
    ok: true,
    isLoggedIn: true,
    hasPinSet: !!user.pinHash,
    sessionKey: session.sessionKey,
    user: {
      email: user.email,
      vaultName: user.vaultName,
      hasPinSet: !!user.pinHash,
    },
  });
}

// POST /api/auth/verify — email+password sign-in
export async function POST(req: NextRequest) {
  await connectDB();
  const { email, password } = await req.json();

  if (!email || !password) {
    return NextResponse.json({ ok: false, error: 'Email and password are required' }, { status: 400 });
  }

  const user = await UserModel.findOne({ email: email.toLowerCase().trim() });
  if (!user) {
    // Generic message to prevent email enumeration
    return NextResponse.json({ ok: false, error: 'Invalid email or password' }, { status: 401 });
  }

  const valid = await verifySecret(password, user.passwordHash);
  if (!valid) {
    return NextResponse.json({ ok: false, error: 'Invalid email or password' }, { status: 401 });
  }

  const sessionKey = Buffer.from(crypto.getRandomValues(new Uint8Array(32))).toString('base64');

  const token = createSessionCookie({
    userId: user._id.toString(),
    email: user.email,
    vaultName: user.vaultName,
    sessionKey,
  });

  const response = NextResponse.json({
    ok: true,
    sessionKey, // Send to frontend for encryption
    user: {
      email: user.email,
      vaultName: user.vaultName,
      hasPinSet: !!user.pinHash,
    },
  });
  response.cookies.set(COOKIE_NAME, token, COOKIE_OPTS);
  return response;
}
