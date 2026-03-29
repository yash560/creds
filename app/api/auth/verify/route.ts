import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { connectDB } from '@/lib/mongodb';
import { VaultConfigModel } from '@/lib/models';

// POST /api/auth/verify — PIN login
export async function POST(req: NextRequest) {
  await connectDB();
  const { pin } = await req.json();

  const config = await VaultConfigModel.findOne();
  if (!config) {
    return NextResponse.json({ ok: false, error: 'Vault not set up', needsSetup: true }, { status: 404 });
  }

  const valid = await bcrypt.compare(pin, config.masterPinHash);
  if (!valid) {
    return NextResponse.json({ ok: false, error: 'Incorrect PIN' }, { status: 401 });
  }

  const response = NextResponse.json({ ok: true, vaultName: config.vaultName });
  response.cookies.set('vault_session', 'unlocked', {
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7,
    path: '/',
  });
  return response;
}

// GET /api/auth/verify — check vault setup status
export async function GET() {
  await connectDB();
  const config = await VaultConfigModel.findOne().lean();
  return NextResponse.json({ ok: true, isSetup: !!config, vaultName: (config as { vaultName?: string })?.vaultName });
}
