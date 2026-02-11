import { createHash } from 'crypto';
import type { NextRequest } from 'next/server';
import type { DeviceType } from '@/types/qr';

/**
 * Shared analytics event helpers.
 *
 * Extracts anonymized context from incoming requests for analytics recording.
 * Used by both QR redirect handler and bio-link page/click tracking.
 */

export interface EventContext {
  ipHash: string | null;
  countryCode: string | null;
  region: string | null;
  deviceType: DeviceType;
  osFamily: string | null;
  browserFamily: string | null;
  referrerDomain: string | null;
}

/**
 * Extract anonymized analytics context from a request.
 * Returns null for ipHash if IP_HASH_SALT is not configured.
 */
export function extractEventContext(request: NextRequest): EventContext {
  const headers = request.headers;

  // Hash IP (one-way, for deduplication only)
  const ip =
    headers.get('x-forwarded-for')?.split(',')[0] ||
    headers.get('x-real-ip') ||
    'unknown';

  const ipSalt = process.env.IP_HASH_SALT;
  let ipHash: string | null = null;
  if (ipSalt) {
    ipHash = createHash('sha256')
      .update(ip + ipSalt)
      .digest('hex')
      .substring(0, 16);
  }

  // Parse user agent
  const userAgent = headers.get('user-agent') || '';
  const deviceInfo = parseUserAgent(userAgent);

  // Geo info from Vercel headers
  const countryCode = headers.get('x-vercel-ip-country') || null;
  const region = headers.get('x-vercel-ip-country-region') || null;

  // Referrer domain (not full URL, for privacy)
  const referrer = headers.get('referer');
  let referrerDomain: string | null = null;
  if (referrer) {
    try {
      referrerDomain = new URL(referrer).hostname;
    } catch {
      // Invalid referrer URL, ignore
    }
  }

  return {
    ipHash,
    countryCode,
    region,
    deviceType: deviceInfo.deviceType,
    osFamily: deviceInfo.osFamily,
    browserFamily: deviceInfo.browserFamily,
    referrerDomain,
  };
}

/**
 * Simple user agent parser.
 * For production, consider using a proper UA parser library.
 */
export function parseUserAgent(ua: string): {
  deviceType: DeviceType;
  osFamily: string | null;
  browserFamily: string | null;
} {
  // Detect device type
  let deviceType: DeviceType = 'unknown';
  if (/mobile|android.*mobile|iphone|ipod|blackberry|windows phone/i.test(ua)) {
    deviceType = 'mobile';
  } else if (/tablet|ipad|android(?!.*mobile)/i.test(ua)) {
    deviceType = 'tablet';
  } else if (/windows|macintosh|linux/i.test(ua)) {
    deviceType = 'desktop';
  }

  // Detect OS
  let osFamily: string | null = null;
  if (/iphone|ipad|ipod/i.test(ua)) {
    osFamily = 'iOS';
  } else if (/android/i.test(ua)) {
    osFamily = 'Android';
  } else if (/windows/i.test(ua)) {
    osFamily = 'Windows';
  } else if (/macintosh|mac os/i.test(ua)) {
    osFamily = 'macOS';
  } else if (/linux/i.test(ua)) {
    osFamily = 'Linux';
  }

  // Detect browser
  let browserFamily: string | null = null;
  if (/edg/i.test(ua)) {
    browserFamily = 'Edge';
  } else if (/chrome/i.test(ua) && !/chromium/i.test(ua)) {
    browserFamily = 'Chrome';
  } else if (/safari/i.test(ua) && !/chrome/i.test(ua)) {
    browserFamily = 'Safari';
  } else if (/firefox/i.test(ua)) {
    browserFamily = 'Firefox';
  } else if (/opera|opr/i.test(ua)) {
    browserFamily = 'Opera';
  }

  return { deviceType, osFamily, browserFamily };
}
