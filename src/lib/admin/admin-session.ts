import { cookies } from 'next/headers';

export const ADMIN_SESSION_COOKIE = 'lynx_admin_session';
export const ADMIN_SESSION_IDLE_MS = 30 * 60 * 1000;

function getSecret(): string {
  const s = process.env.ADMIN_SESSION_SECRET;
  if (!s || s.length < 32) {
    throw new Error(
      'ADMIN_SESSION_SECRET env var is required and must be at least 32 characters'
    );
  }
  return s;
}

function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  const b64 =
    typeof btoa !== 'undefined'
      ? btoa(binary)
      : Buffer.from(binary, 'binary').toString('base64');
  return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/** HMAC-SHA256 of `payload` using the ADMIN_SESSION_SECRET, base64url encoded. */
export async function signPayload(payload: string): Promise<string> {
  const secret = getSecret();
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(payload));
  return bytesToBase64Url(new Uint8Array(sig));
}

/** Constant-time string compare. */
function safeEquals(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

export interface VerifyResult {
  valid: boolean;
  userId?: string;
}

export async function verifyAdminSessionCookie(
  value: string | undefined
): Promise<VerifyResult> {
  if (!value) return { valid: false };
  const parts = value.split('.');
  if (parts.length !== 3) return { valid: false };
  const [userId, issuedAtStr, providedSig] = parts;
  if (!userId || !issuedAtStr || !providedSig) return { valid: false };

  const issuedAt = Number.parseInt(issuedAtStr, 10);
  if (!Number.isFinite(issuedAt)) return { valid: false };
  if (Date.now() - issuedAt > ADMIN_SESSION_IDLE_MS) return { valid: false };

  const payload = `${userId}.${issuedAt}`;
  const expected = await signPayload(payload);
  if (!safeEquals(providedSig, expected)) return { valid: false };
  return { valid: true, userId };
}

export async function setAdminSession(userId: string): Promise<void> {
  const issuedAt = Date.now();
  const payload = `${userId}.${issuedAt}`;
  const sig = await signPayload(payload);
  const cookieValue = `${payload}.${sig}`;

  const cookieStore = await cookies();
  cookieStore.set(ADMIN_SESSION_COOKIE, cookieValue, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: Math.floor(ADMIN_SESSION_IDLE_MS / 1000),
    path: '/',
  });
}

export async function clearAdminSession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(ADMIN_SESSION_COOKIE);
}
