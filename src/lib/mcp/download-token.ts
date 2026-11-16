import { createHmac, timingSafeEqual } from 'crypto';

/**
 * Short-lived signed download links for QR files produced through the MCP
 * connector. The link carries the QR id, format and size; it does NOT carry
 * the API key, so it is safe to paste into a chat.
 */

export const DOWNLOAD_FORMATS = ['png', 'svg', 'pdf'] as const;
export type DownloadFormat = (typeof DOWNLOAD_FORMATS)[number];

export interface DownloadPayload {
  qrId: string;
  userId: string;
  orgId: string;
  format: DownloadFormat;
  /** PNG width in px, or PDF preset key */
  size?: number;
  preset?: 'sticker-50mm' | 'sticker-75mm' | 'sticker-100mm' | 'a4';
  /** Unix seconds */
  exp: number;
}

export const DOWNLOAD_TTL_SECONDS = 60 * 60 * 24; // 24h

function getSecret(): string {
  const secret = process.env.MCP_DOWNLOAD_SECRET || process.env.ADMIN_SESSION_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error('MCP_DOWNLOAD_SECRET (or ADMIN_SESSION_SECRET) must be set to at least 32 chars');
  }
  return secret;
}

function sign(body: string): string {
  return createHmac('sha256', getSecret()).update(body).digest('base64url');
}

export function createDownloadToken(
  payload: Omit<DownloadPayload, 'exp'>,
  ttlSeconds = DOWNLOAD_TTL_SECONDS
): string {
  const full: DownloadPayload = { ...payload, exp: Math.floor(Date.now() / 1000) + ttlSeconds };
  const body = Buffer.from(JSON.stringify(full)).toString('base64url');
  return `${body}.${sign(body)}`;
}

export function verifyDownloadToken(token: string): DownloadPayload | null {
  const parts = token.split('.');
  if (parts.length !== 2) return null;
  const [body, sig] = parts;

  let expected: string;
  try {
    expected = sign(body);
  } catch {
    return null;
  }
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;

  try {
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8')) as DownloadPayload;
    if (typeof payload.exp !== 'number' || payload.exp < Math.floor(Date.now() / 1000)) return null;
    if (!DOWNLOAD_FORMATS.includes(payload.format)) return null;
    return payload;
  } catch {
    return null;
  }
}
