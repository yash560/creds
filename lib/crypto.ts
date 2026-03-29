/**
 * AES-GCM field-level encryption helpers.
 * These run on the SERVER only (Route Handlers).
 * The ENCRYPTION_SECRET env var is never exposed to the client.
 */

const ALGORITHM = 'AES-GCM';

function getKeyMaterial(secret: string): Uint8Array {
  const encoder = new TextEncoder();
  const raw = encoder.encode(secret.padEnd(32, '0').slice(0, 32));
  return raw;
}

async function deriveKey(secret: string): Promise<CryptoKey> {
  const keyData = getKeyMaterial(secret);
  return crypto.subtle.importKey('raw', keyData, { name: ALGORITHM }, false, [
    'encrypt',
    'decrypt',
  ]);
}

export async function encryptField(value: string): Promise<string> {
  const secret = process.env.ENCRYPTION_SECRET!;
  const key = await deriveKey(secret);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encoded = new TextEncoder().encode(value);
  const cipherBuffer = await crypto.subtle.encrypt({ name: ALGORITHM, iv }, key, encoded);
  // Pack iv + ciphertext into a single base64 string
  const combined = new Uint8Array(iv.byteLength + cipherBuffer.byteLength);
  combined.set(iv, 0);
  combined.set(new Uint8Array(cipherBuffer), iv.byteLength);
  return Buffer.from(combined).toString('base64');
}

export async function decryptField(cipher: string): Promise<string> {
  const secret = process.env.ENCRYPTION_SECRET!;
  const key = await deriveKey(secret);
  const combined = Buffer.from(cipher, 'base64');
  const iv = combined.slice(0, 12);
  const data = combined.slice(12);
  const plainBuffer = await crypto.subtle.decrypt({ name: ALGORITHM, iv }, key, data);
  return new TextDecoder().decode(plainBuffer);
}

/** Encrypt all string values in a fields record */
export async function encryptFields(
  fields: Record<string, string>
): Promise<Record<string, string>> {
  const result: Record<string, string> = {};
  for (const [k, v] of Object.entries(fields)) {
    result[k] = v ? await encryptField(v) : '';
  }
  return result;
}

/** Decrypt all string values in a fields record */
export async function decryptFields(
  fields: Record<string, string>
): Promise<Record<string, string>> {
  const result: Record<string, string> = {};
  for (const [k, v] of Object.entries(fields)) {
    result[k] = v ? await decryptField(v) : '';
  }
  return result;
}
