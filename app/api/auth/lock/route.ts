import { NextResponse } from 'next/server';

// POST /api/auth/lock — clear session cookie
export async function POST() {
  const response = NextResponse.json({ ok: true });
  response.cookies.set('vault_session', '', { maxAge: 0, path: '/' });
  return response;
}
