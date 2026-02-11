import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { checkApiLimit, getRateLimitHeaders } from '@/lib/security/rate-limiter';
import { validateUrl } from '@/lib/security/url-validator';

/**
 * GET /api/bio/favicon?url=https://example.com
 *
 * Returns the favicon URL for a given website.
 * Uses Google's public favicon service as a reliable proxy.
 * Authenticated endpoint to prevent abuse.
 */
export async function GET(request: NextRequest) {
  const supabase = await createClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const rateLimit = checkApiLimit(user.id);
  if (!rateLimit.success) {
    return NextResponse.json(
      { error: 'Rate limit exceeded' },
      { status: 429, headers: getRateLimitHeaders(rateLimit) }
    );
  }

  const url = request.nextUrl.searchParams.get('url');
  if (!url) {
    return NextResponse.json({ error: 'Missing url parameter' }, { status: 400 });
  }

  // Validate the URL to prevent SSRF
  const validation = validateUrl(url);
  if (!validation.isValid) {
    return NextResponse.json({ error: validation.error }, { status: 400 });
  }

  try {
    const parsed = new URL(validation.normalizedUrl!);
    const domain = parsed.hostname;

    // Use Google's favicon service — reliable, fast, cached, and free
    // Returns a 16x16 PNG favicon for any domain
    const faviconUrl = `https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=64`;

    return NextResponse.json(
      { favicon_url: faviconUrl, domain },
      { headers: getRateLimitHeaders(rateLimit) }
    );
  } catch {
    return NextResponse.json(
      { error: 'Failed to resolve favicon' },
      { status: 500 }
    );
  }
}
