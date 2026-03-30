/**
 * Server-only JWT + session helpers.
 * Never import this in Client Components.
 */
import jwt from 'jsonwebtoken';
import { cookies } from 'next/headers';

const _jwt = process.env.JWT_SECRET;
if (!_jwt) {
  throw new Error('Please define JWT_SECRET in .env.local');
}
const JWT_SECRET: string = _jwt;
const COOKIE_NAME = 'vault_token';
const COOKIE_OPTS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  path: '/',
  maxAge: 60 * 60 * 24 * 30, // 30 days
};

export interface SessionPayload {
  userId: string;
  email: string;
  vaultName: string;
  /** Encryption key for this session (Base64) */
  sessionKey: string;
}

/** Sign and set the session cookie on a NextResponse */
export function createSessionCookie(payload: SessionPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '30d' });
}

/** Read and verify the session from the current request cookies */
export async function getSession(): Promise<SessionPayload | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(COOKIE_NAME)?.value;
    if (!token) return null;
    return jwt.verify(token, JWT_SECRET) as SessionPayload;
  } catch {
    return null;
  }
}

export { COOKIE_NAME, COOKIE_OPTS };
