import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { validateRedirectUrl } from '@/lib/security/url-validator';
import { createHash } from 'crypto';

/**
 * QR Code Redirect Handler
 *
 * This endpoint handles redirects for managed QR codes.
 * It looks up the slug, validates the destination, records analytics (if enabled),
 * and redirects the user to the destination URL.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

  // Use admin client to bypass RLS (needed for public access)
  const supabase = createAdminClient();

  // Look up the QR code by slug
  const { data: qr, error } = await supabase
    .from('qr_codes')
    .select('id, destination_url, is_active, analytics_enabled')
    .eq('slug', slug)
    .eq('mode', 'managed')
    .single();

  // QR not found
  if (error || !qr) {
    return NextResponse.redirect(new URL('/?error=qr-not-found', request.url));
  }

  // QR is inactive
  if (!qr.is_active) {
    return NextResponse.redirect(new URL('/?error=qr-inactive', request.url));
  }

  // Validate destination URL (defense in depth)
  if (!validateRedirectUrl(qr.destination_url)) {
    console.error(`Invalid redirect URL for slug ${slug}: ${qr.destination_url}`);
    return NextResponse.redirect(new URL('/?error=invalid-destination', request.url));
  }

  // Record analytics (async, don't block redirect)
  if (qr.analytics_enabled) {
    recordScanEvent(supabase, qr.id, request).catch((err) => {
      console.error('Failed to record scan event:', err);
    });
  }

  // Perform redirect
  // Using 307 (Temporary Redirect) to preserve request method
  // This also prevents browsers from caching the redirect
  return NextResponse.redirect(qr.destination_url, {
    status: 307,
  });
}

/**
 * Record a scan event for analytics
 */
async function recordScanEvent(
  supabase: ReturnType<typeof createAdminClient>,
  qrId: string,
  request: NextRequest
) {
  const headers = request.headers;

  // Get IP for hashing (not stored raw)
  const ip =
    headers.get('x-forwarded-for')?.split(',')[0] ||
    headers.get('x-real-ip') ||
    'unknown';

  // Hash the IP (one-way, for deduplication only)
  const ipSalt = process.env.IP_HASH_SALT || 'default-salt';
  const ipHash = createHash('sha256')
    .update(ip + ipSalt)
    .digest('hex')
    .substring(0, 16);

  // Parse user agent for device info
  const userAgent = headers.get('user-agent') || '';
  const deviceInfo = parseUserAgent(userAgent);

  // Get geo info from Vercel headers (if available)
  const countryCode = headers.get('x-vercel-ip-country') || null;
  const region = headers.get('x-vercel-ip-country-region') || null;

  // Get referrer domain (not full URL, for privacy)
  const referrer = headers.get('referer');
  let referrerDomain: string | null = null;
  if (referrer) {
    try {
      referrerDomain = new URL(referrer).hostname;
    } catch {
      // Invalid referrer URL, ignore
    }
  }

  // Insert scan event
  await supabase.from('qr_scan_events').insert({
    qr_id: qrId,
    ip_hash: ipHash,
    country_code: countryCode,
    region: region,
    device_type: deviceInfo.deviceType,
    os_family: deviceInfo.osFamily,
    browser_family: deviceInfo.browserFamily,
    referrer_domain: referrerDomain,
  });
}

/**
 * Simple user agent parser
 * For production, consider using a proper UA parser library
 */
function parseUserAgent(ua: string): {
  deviceType: 'mobile' | 'tablet' | 'desktop' | 'unknown';
  osFamily: string | null;
  browserFamily: string | null;
} {
  const lowerUa = ua.toLowerCase();

  // Detect device type
  let deviceType: 'mobile' | 'tablet' | 'desktop' | 'unknown' = 'unknown';
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
