/**
 * Memory-hard scrypt for password / PIN storage. Legacy bcrypt hashes still verify.
 */
import { randomBytes, scrypt, timingSafeEqual } from 'crypto';
import bcrypt from 'bcryptjs';

function scryptAsync(
  password: string | Buffer,
  salt: Buffer,
  keylen: number,
  opts: { N: number; r: number; p: number; maxmem: number }
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scrypt(password, salt, keylen, opts, (err, derived) => {
      if (err) reject(err);
      else resolve(derived as Buffer);
    });
  });
}

/** Same cost as before; maxmem must exceed 128×N×r (OpenSSL rejects an exact/tight cap). */
const SCRYPT_PARAMS = {
  N: 16384,
  r: 8,
  p: 1,
  maxmem: 32 * 1024 * 1024,
} as const;

const KEYLEN = 64;
const PREFIX = 'scrypt17';

export async function hashSecret(plaintext: string): Promise<string> {
  const salt = randomBytes(16);
  const derived = (await scryptAsync(plaintext, salt, KEYLEN, SCRYPT_PARAMS)) as Buffer;
  return `${PREFIX}$${salt.toString('base64')}$${derived.toString('base64')}`;
}

export async function verifySecret(plaintext: string, stored: string): Promise<boolean> {
  if (stored.startsWith(`${PREFIX}$`)) {
    const parts = stored.split('$');
    if (parts.length !== 3) return false;
    const [, saltB64, hashB64] = parts;
    const salt = Buffer.from(saltB64, 'base64');
    const expected = Buffer.from(hashB64, 'base64');
    const derived = (await scryptAsync(plaintext, salt, KEYLEN, SCRYPT_PARAMS)) as Buffer;
    if (derived.length !== expected.length) return false;
    return timingSafeEqual(derived, expected);
  }
  if (stored.startsWith('$2')) {
    return bcrypt.compare(plaintext, stored);
  }
  return false;
}
