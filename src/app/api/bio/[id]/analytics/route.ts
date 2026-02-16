import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { checkApiLimit, getRateLimitHeaders } from '@/lib/security/rate-limiter';
import { isValidUUID } from '@/validations/qr';

// ─── Aggregation helpers ─────────────────────────────────────────────

/** Group items by a key, counting occurrences. Returns sorted desc by count. */
function groupAndCount<T>(
  items: T[],
  keyFn: (item: T) => string | null | undefined,
): Array<{ key: string; count: number }> {
  const map = new Map<string, number>();
  for (const item of items) {
    const k = keyFn(item);
    if (!k) continue;
    map.set(k, (map.get(k) ?? 0) + 1);
  }
  return Array.from(map.entries())
    .map(([key, count]) => ({ key, count }))
    .sort((a, b) => b.count - a.count);
}

/** Group timestamped items by YYYY-MM-DD, filling missing days with 0. */
function aggregateByDay(
  items: Array<{ ts: string }>,
  periodDays: number,
): Array<{ date: string; count: number }> {
  const counts = new Map<string, number>();
  for (const item of items) {
    const day = item.ts.substring(0, 10); // YYYY-MM-DD
    counts.set(day, (counts.get(day) ?? 0) + 1);
  }

  const result: Array<{ date: string; count: number }> = [];
  const now = Date.now();
  for (let i = periodDays - 1; i >= 0; i--) {
    const d = new Date(now - i * 86_400_000);
    const key = d.toISOString().substring(0, 10);
    result.push({ date: key, count: counts.get(key) ?? 0 });
  }
  return result;
}

/** Extract a human-readable label from a block's JSONB content. */
function blockLabel(blockType: string, content: Record<string, unknown>): string {
  if (blockType === 'link' && typeof content.title === 'string') return content.title;
  if ((blockType === 'heading' || blockType === 'text') && typeof content.text === 'string') {
    const text = content.text as string;
    return text.length > 40 ? text.slice(0, 40) + '…' : text;
  }
  // Capitalize block type for others (e.g. "social_icons" → "Social Icons")
  return blockType.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

// ─── Route handler ───────────────────────────────────────────────────

/**
 * GET /api/bio/[id]/analytics - Full analytics dashboard data
 *
 * Query params:
 *   period = 7d | 30d | 90d  (default: 30d)
 *
 * Returns view/click totals, time-series, per-block performance,
 * country/device/referrer/browser breakdowns.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  if (!isValidUUID(id)) {
    return NextResponse.json({ error: 'Invalid bio page ID' }, { status: 400 });
  }

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

  try {
    // Verify page ownership
    const { data: page, error: pageError } = await supabase
      .from('bio_link_pages')
      .select('id, total_views')
      .eq('id', id)
      .eq('owner_id', user.id)
      .is('deleted_at', null)
      .single();

    if (pageError || !page) {
      return NextResponse.json({ error: 'Bio page not found' }, { status: 404 });
    }

    // Parse period
    const url = new URL(request.url);
    const periodParam = url.searchParams.get('period') || '30d';
    const periodDays = periodParam === '7d' ? 7 : periodParam === '90d' ? 90 : 30;
    const period = periodParam === '7d' ? '7d' : periodParam === '90d' ? '90d' : '30d';

    const now = new Date();
    const periodStart = new Date(now.getTime() - periodDays * 86_400_000).toISOString();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
    const weekStart = new Date(now.getTime() - 7 * 86_400_000).toISOString();
    const monthStart = new Date(now.getTime() - 30 * 86_400_000).toISOString();

    // 7 parallel queries
    const [
      viewEventsResult,
      linkClicksResult,
      blockClicksResult,
      linksResult,
      blocksResult,
      todayCountResult,
      weekCountResult,
    ] = await Promise.all([
      // 1. View events for the selected period
      supabase
        .from('bio_link_view_events')
        .select('viewed_at, country_code, device_type, referrer_domain, browser_family, ip_hash')
        .eq('page_id', id)
        .gte('viewed_at', periodStart)
        .order('viewed_at', { ascending: false })
        .limit(10000),

      // 2. Legacy link click events
      supabase
        .from('bio_link_click_events')
        .select('item_id, clicked_at')
        .eq('page_id', id)
        .gte('clicked_at', periodStart)
        .limit(10000),

      // 3. Block click events
      supabase
        .from('bio_block_click_events')
        .select('block_id, clicked_at')
        .eq('page_id', id)
        .gte('clicked_at', periodStart)
        .limit(10000),

      // 4. Legacy links (with total_clicks counter)
      supabase
        .from('bio_link_items')
        .select('id, title, total_clicks')
        .eq('page_id', id)
        .order('sort_order', { ascending: true }),

      // 5. Blocks (with total_clicks counter)
      supabase
        .from('bio_blocks')
        .select('id, block_type, content, total_clicks')
        .eq('page_id', id)
        .order('sort_order', { ascending: true }),

      // 6. Exact view count today
      supabase
        .from('bio_link_view_events')
        .select('id', { count: 'exact', head: true })
        .eq('page_id', id)
        .gte('viewed_at', todayStart),

      // 7. Exact view count this week
      supabase
        .from('bio_link_view_events')
        .select('id', { count: 'exact', head: true })
        .eq('page_id', id)
        .gte('viewed_at', weekStart),
    ]);

    const viewEvents = viewEventsResult.data ?? [];
    const linkClicks = linkClicksResult.data ?? [];
    const blockClicks = blockClicksResult.data ?? [];
    const links = linksResult.data ?? [];
    const blocks = blocksResult.data ?? [];

    // ── Aggregate ────────────────────────────────────────────────

    // Views by day
    const viewsByDay = aggregateByDay(
      viewEvents.map((e) => ({ ts: e.viewed_at })),
      periodDays,
    );

    // Clicks by day (merge legacy + block clicks)
    const allClickTimestamps = [
      ...linkClicks.map((c) => ({ ts: c.clicked_at })),
      ...blockClicks.map((c) => ({ ts: c.clicked_at })),
    ];
    const clicksByDay = aggregateByDay(allClickTimestamps, periodDays);

    // Total clicks in period
    const totalClicks = linkClicks.length + blockClicks.length;

    // Unique visitors (distinct ip_hash)
    const ipSet = new Set<string>();
    for (const e of viewEvents) {
      if (e.ip_hash) ipSet.add(e.ip_hash);
    }
    const uniqueVisitors = ipSet.size;

    // Views this month (derived from events)
    const viewsThisMonth = viewEvents.filter((e) => e.viewed_at >= monthStart).length;

    // Top countries (top 10)
    const topCountries = groupAndCount(viewEvents, (e) => e.country_code)
      .slice(0, 10)
      .map((c) => ({ country: c.key, count: c.count }));

    // Top devices
    const topDevices = groupAndCount(viewEvents, (e) => e.device_type)
      .map((d) => ({ device: d.key, count: d.count }));

    // Top referrers (top 10, filter out nulls)
    const topReferrers = groupAndCount(viewEvents, (e) => e.referrer_domain)
      .slice(0, 10)
      .map((r) => ({ domain: r.key, count: r.count }));

    // Top browsers (top 8)
    const topBrowsers = groupAndCount(viewEvents, (e) => e.browser_family)
      .slice(0, 8)
      .map((b) => ({ browser: b.key, count: b.count }));

    // Per-link clicks this week
    const linkClicksByItem = new Map<string, number>();
    for (const c of linkClicks) {
      if (c.clicked_at >= weekStart) {
        linkClicksByItem.set(c.item_id, (linkClicksByItem.get(c.item_id) ?? 0) + 1);
      }
    }

    const linksData = links.map((link) => ({
      id: link.id,
      title: link.title,
      total_clicks: link.total_clicks,
      clicks_this_week: linkClicksByItem.get(link.id) ?? 0,
    }));

    // Blocks data with labels
    const blocksData = blocks.map((block) => ({
      id: block.id,
      block_type: block.block_type,
      label: blockLabel(block.block_type, block.content as Record<string, unknown>),
      total_clicks: block.total_clicks,
    }));

    return NextResponse.json({
      total_views: page.total_views,
      views_today: todayCountResult.count ?? 0,
      views_this_week: weekCountResult.count ?? 0,
      views_this_month: viewsThisMonth,
      total_clicks: totalClicks,
      unique_visitors: uniqueVisitors,
      period,
      views_by_day: viewsByDay,
      clicks_by_day: clicksByDay,
      links: linksData,
      blocks: blocksData,
      top_countries: topCountries,
      top_devices: topDevices,
      top_referrers: topReferrers,
      top_browsers: topBrowsers,
    }, {
      headers: getRateLimitHeaders(rateLimit),
    });

  } catch (error) {
    console.error('API error:', error instanceof Error ? error.message : 'unknown error');
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
