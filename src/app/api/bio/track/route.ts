import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { checkBioTrackLimit, getRateLimitHeaders } from '@/lib/security/rate-limiter';
import { trackClickSchema } from '@/validations/bio';
import { extractEventContext } from '@/lib/analytics/event-helpers';

/**
 * POST /api/bio/track - Record a link click event
 *
 * Called anonymously from the public bio page via navigator.sendBeacon().
 * Uses admin client to bypass RLS.
 */
export async function POST(request: NextRequest) {
  // Rate limit by IP
  const ip =
    request.headers.get('x-forwarded-for')?.split(',')[0] ||
    request.headers.get('x-real-ip') ||
    'unknown';

  const rateLimit = checkBioTrackLimit(ip);
  if (!rateLimit.success) {
    return new NextResponse('Too Many Requests', {
      status: 429,
      headers: getRateLimitHeaders(rateLimit),
    });
  }

  try {
    const body = await request.json();

    const parsed = trackClickSchema.safeParse(body);
    if (!parsed.success) {
      return new NextResponse(null, { status: 400 });
    }

    const { item_id, page_id } = parsed.data;

    const ctx = extractEventContext(request);
    const supabase = createAdminClient();

    // Fire-and-forget: insert click event
    await supabase.from('bio_link_click_events').insert({
      item_id,
      page_id,
      country_code: ctx.countryCode,
      device_type: ctx.deviceType,
      ip_hash: ctx.ipHash,
    });

    return new NextResponse(null, { status: 204 });

  } catch {
    // Click tracking should never fail loudly
    return new NextResponse(null, { status: 204 });
  }
}
