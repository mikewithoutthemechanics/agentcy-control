// Shared crypto utilities for Agentcy Control Edge Functions
// Uses Web Crypto API (available in Deno) for AES-GCM encryption

const ENCODER = new TextEncoder();
const DECODER = new TextDecoder();

async function getKey(masterKey: string): Promise<CryptoKey> {
  const keyData = ENCODER.encode(masterKey.padEnd(32, '0').slice(0, 32));
  return await crypto.subtle.importKey('raw', keyData, { name: 'AES-GCM' }, false, [
    'encrypt',
    'decrypt',
  ]);
}

export async function encrypt(plainText: string, masterKey: string): Promise<string> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await getKey(masterKey);
  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    ENCODER.encode(plainText)
  );
  const combined = new Uint8Array(iv.length + encrypted.byteLength);
  combined.set(iv);
  combined.set(new Uint8Array(encrypted), iv.length);
  return btoa(String.fromCharCode(...combined));
}

export async function decrypt(cipherText: string, masterKey: string): Promise<string> {
  const combined = Uint8Array.from(atob(cipherText), (c) => c.charCodeAt(0));
  const iv = combined.slice(0, 12);
  const data = combined.slice(12);
  const key = await getKey(masterKey);
  const decrypted = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, data);
  return DECODER.decode(decrypted);
}
