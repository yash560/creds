import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { UserModel } from '@/lib/models';
import { hashSecret, verifySecret } from '@/lib/crypto-secret';
import { getSession } from '@/lib/session';

// POST /api/auth/pin — set or verify 4-digit quick PIN
export async function POST(req: NextRequest) {
  await connectDB();
  const session = await getSession();
  if (!session) return NextResponse.json({ ok: false, error: 'Not authenticated' }, { status: 401 });

  const { action, pin } = await req.json(); // action: 'set' | 'verify'

  if (!pin || !/^\d{4}$/.test(pin)) {
    return NextResponse.json({ ok: false, error: 'PIN must be exactly 4 digits' }, { status: 400 });
  }

  const user = await UserModel.findById(session.userId);
  if (!user) return NextResponse.json({ ok: false, error: 'User not found' }, { status: 404 });

  if (action === 'set') {
    user.pinHash = await hashSecret(pin);
    await user.save();

    // Generate a fresh sessionKey for security
    const freshSessionKey = Buffer.from(crypto.getRandomValues(new Uint8Array(32))).toString('base64');

    return NextResponse.json({ ok: true, message: 'PIN set successfully', sessionKey: freshSessionKey });
  }

  if (action === 'verify') {
    if (!user.pinHash) {
      return NextResponse.json({ ok: false, error: 'No PIN set for this account', needsPinSetup: true }, { status: 400 });
    }
    const valid = await verifySecret(pin, user.pinHash);
    if (!valid) return NextResponse.json({ ok: false, error: 'Incorrect PIN' }, { status: 401 });

    // Generate a fresh sessionKey for security
    const freshSessionKey = Buffer.from(crypto.getRandomValues(new Uint8Array(32))).toString('base64');

    return NextResponse.json({
      ok: true,
      user: { email: user.email, vaultName: user.vaultName },
      sessionKey: freshSessionKey
    });
  }

  return NextResponse.json({ ok: false, error: 'Invalid action' }, { status: 400 });
}
