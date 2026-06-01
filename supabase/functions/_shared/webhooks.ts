// Shared webhook signature verification utilities

/**
 * Verify HMAC-SHA256 signature for webhook payloads.
 * Returns true if signature matches, false otherwise.
 */
export async function verifyHmac(
  payload: string,
  signature: string,
  secret: string
): Promise<boolean> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', key, encoder.encode(payload));
  const expected = btoa(String.fromCharCode(...new Uint8Array(sig)));
  // Support both base64 and hex signature formats
  const normalized = signature.replace(/^sha256=/, '').trim();
  if (normalized.length === 64) {
    // hex format
    const hexSig = Array.from(new Uint8Array(sig))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
    return timingSafeEqual(hexSig, normalized);
  }
  return timingSafeEqual(expected, normalized);
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

/**
 * Extract and verify Vercel webhook signature from headers.
 */
export function getVercelSignature(req: Request): string | null {
  return req.headers.get('x-vercel-signature') || req.headers.get('x-signature') || null;
}

/**
 * Extract and verify Sentry webhook signature from headers.
 */
export function getSentrySignature(req: Request): string | null {
  return req.headers.get('x-sentry-signature') || req.headers.get('x-hub-signature-256') || null;
}
