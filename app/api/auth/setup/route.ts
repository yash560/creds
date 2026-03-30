import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { UserModel } from '@/lib/models';
import { hashSecret } from '@/lib/crypto-secret';
import { createSessionCookie, COOKIE_NAME, COOKIE_OPTS } from '@/lib/session';

// POST /api/auth/register
export async function POST(req: NextRequest) {
  await connectDB();
  const { email, password, vaultName } = await req.json();

  if (!email || !password) {
    return NextResponse.json({ ok: false, error: 'Email and password are required' }, { status: 400 });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ ok: false, error: 'Invalid email address' }, { status: 400 });
  }
  if (password.length < 8) {
    return NextResponse.json({ ok: false, error: 'Password must be at least 8 characters' }, { status: 400 });
  }

  const existing = await UserModel.findOne({ email: email.toLowerCase().trim() });
  if (existing) {
    return NextResponse.json({ ok: false, error: 'An account with this email already exists' }, { status: 409 });
  }

  const passwordHash = await hashSecret(password);
  const user = await UserModel.create({
    email: email.toLowerCase().trim(),
    passwordHash,
    vaultName: vaultName?.trim() || 'My Vault',
  });

  const sessionKey = Buffer.from(crypto.getRandomValues(new Uint8Array(32))).toString('base64');

  const token = createSessionCookie({
    userId: user._id.toString(),
    email: user.email,
    vaultName: user.vaultName,
    sessionKey,
  });

  const response = NextResponse.json({
    ok: true,
    sessionKey,
    user: { email: user.email, vaultName: user.vaultName, hasPinSet: false },
  }, { status: 201 });
  response.cookies.set(COOKIE_NAME, token, COOKIE_OPTS);
  return response;
}
