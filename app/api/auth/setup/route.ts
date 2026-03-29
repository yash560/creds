import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { connectDB } from '@/lib/mongodb';
import { VaultConfigModel } from '@/lib/models';

// POST /api/auth/setup — First-launch PIN creation
export async function POST(req: NextRequest) {
  await connectDB();
  const { pin, vaultName } = await req.json();

  if (!pin || pin.length < 4) {
    return NextResponse.json({ ok: false, error: 'PIN must be at least 4 digits' }, { status: 400 });
  }

  const existing = await VaultConfigModel.findOne();
  if (existing) {
    return NextResponse.json({ ok: false, error: 'Vault already set up' }, { status: 409 });
  }

  const hash = await bcrypt.hash(pin, 12);
  await VaultConfigModel.create({ masterPinHash: hash, vaultName: vaultName || 'My Vault' });

  const response = NextResponse.json({ ok: true });
  response.cookies.set('vault_session', 'unlocked', {
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7, // 7 days
    path: '/',
  });
  return response;
}
