import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { checkBioTrackLimit, getRateLimitHeaders } from '@/lib/security/rate-limiter';
import { trackClickSchema, trackBlockClickSchema } from '@/validations/bio';
import { extractEventContext } from '@/lib/analytics/event-helpers';

/**
 * POST /api/bio/track - Record a click event (link or block)
 *
 * Called anonymously from the public bio page via navigator.sendBeacon().
 * Uses admin client to bypass RLS.
 *
 * Accepts either:
 * - { item_id, page_id } for legacy link clicks
 * - { block_id, page_id } for grid block clicks
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
    const ctx = extractEventContext(request);
    const supabase = createAdminClient();

    // Try block click first (new grid system)
    const blockParsed = trackBlockClickSchema.safeParse(body);
    if (blockParsed.success) {
      const { block_id, page_id } = blockParsed.data;
      await supabase.from('bio_block_click_events').insert({
        block_id,
        page_id,
        country_code: ctx.countryCode,
        device_type: ctx.deviceType,
        ip_hash: ctx.ipHash,
      });
      return new NextResponse(null, { status: 204 });
    }

    // Fall back to legacy link click
    const linkParsed = trackClickSchema.safeParse(body);
    if (linkParsed.success) {
      const { item_id, page_id } = linkParsed.data;
      await supabase.from('bio_link_click_events').insert({
        item_id,
        page_id,
        country_code: ctx.countryCode,
        device_type: ctx.deviceType,
        ip_hash: ctx.ipHash,
      });
      return new NextResponse(null, { status: 204 });
    }

    return new NextResponse(null, { status: 400 });

  } catch {
    // Click tracking should never fail loudly
    return new NextResponse(null, { status: 204 });
  }
}
