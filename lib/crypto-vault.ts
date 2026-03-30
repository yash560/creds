/**
 * Client-side encryption utilities for CredsHub.
 * Uses Web Crypto API (AES-GCM) for high-performance encryption.
 */

const ENCRYPTION_ALGO = 'AES-GCM';

/** Convert a raw hex string or base64 to a CryptoKey */
export async function importKey(rawKey: string): Promise<CryptoKey> {
  const buf = Uint8Array.from(atob(rawKey), c => c.charCodeAt(0));
  return window.crypto.subtle.importKey(
    'raw',
    buf,
    ENCRYPTION_ALGO,
    false,
    ['encrypt', 'decrypt']
  );
}

/** Convert Uint8Array to base64 in chunks to avoid stack overflow */
function uint8ArrayToBase64(arr: Uint8Array): string {
  const chunkSize = 8192;
  let binary = '';
  for (let i = 0; i < arr.length; i += chunkSize) {
    const chunk = arr.slice(i, i + chunkSize);
    binary += String.fromCharCode.apply(null, Array.from(chunk) as any);
  }
  return btoa(binary);
}

/** Convert base64 back to Uint8Array reliably */
function base64ToUint8Array(b64: string): Uint8Array {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

/** Encrypt a string and return a base64 string combining IV and Ciphertext */
export async function encryptData(text: string, key: CryptoKey): Promise<string> {
  const iv = window.crypto.getRandomValues(new Uint8Array(12));
  const encoded = new TextEncoder().encode(text);

  const encrypted = await window.crypto.subtle.encrypt(
    { name: ENCRYPTION_ALGO, iv },
    key,
    encoded
  );

  const combined = new Uint8Array(iv.length + encrypted.byteLength);
  combined.set(iv);
  combined.set(new Uint8Array(encrypted), iv.length);

  return uint8ArrayToBase64(combined);
}

/** Decrypt a combined base64 logic back to string */
export async function decryptData(combinedB64: string, key: CryptoKey): Promise<string> {
  const combined = base64ToUint8Array(combinedB64);
  const iv = combined.slice(0, 12);
  const data = combined.slice(12);

  const decrypted = await window.crypto.subtle.decrypt(
    { name: ENCRYPTION_ALGO, iv },
    key,
    data
  );

  return new TextDecoder().decode(decrypted);
}

/** Store encrypted data in localStorage */
export async function setEncryptedCache(key: string, data: unknown, cryptoKey: CryptoKey) {
  const json = JSON.stringify(data);
  const encrypted = await encryptData(json, cryptoKey);
  localStorage.setItem(`creds_cache_${key}`, encrypted);
}

/** Retrieve and decrypt data from localStorage */
export async function getEncryptedCache<T>(key: string, cryptoKey: CryptoKey): Promise<T | null> {
  const encrypted = localStorage.getItem(`creds_cache_${key}`);
  if (!encrypted) return null;
  try {
    const json = await decryptData(encrypted, cryptoKey);
    return JSON.parse(json) as T;
  } catch (e) {
    // If decryption fails, clear this cache entry (corrupted from old format)
    console.warn(`Failed to decrypt cache for "${key}", clearing it:`, e);
    localStorage.removeItem(`creds_cache_${key}`);
    return null;
  }
}

/** Clear all encrypted caches */
export function clearEncryptedCache() {
  Object.keys(localStorage).forEach(k => {
    if (k.startsWith('creds_cache_')) localStorage.removeItem(k);
  });
}
