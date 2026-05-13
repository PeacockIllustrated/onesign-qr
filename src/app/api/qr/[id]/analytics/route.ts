import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { checkApiLimit, getRateLimitHeaders } from '@/lib/security/rate-limiter';
import { isValidUUID } from '@/validations/qr';

// ─── Aggregation helpers ─────────────────────────────────────────────

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

function aggregateByDay(
  items: Array<{ ts: string }>,
  periodDays: number,
): Array<{ date: string; count: number }> {
  const counts = new Map<string, number>();
  for (const item of items) {
    const day = item.ts.substring(0, 10);
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

// ─── Route handler ───────────────────────────────────────────────────

/**
 * GET /api/qr/[id]/analytics
 *
 * Query: period = 7d | 30d | 90d (default 30d)
 *
 * Returns scan totals, time-series, and breakdowns (country/device/os/browser/referrer)
 * for a single QR code. Owner-only — relies on qr_scan_events RLS to enforce.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  if (!isValidUUID(id)) {
    return NextResponse.json({ error: 'Invalid QR code ID' }, { status: 400 });
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
    // Verify ownership and analytics enablement
    const { data: qr, error: qrError } = await supabase
      .from('qr_codes')
      .select('id, total_scans, analytics_enabled')
      .eq('id', id)
      .eq('owner_id', user.id)
      .is('deleted_at', null)
      .single();

    if (qrError || !qr) {
      return NextResponse.json({ error: 'QR code not found' }, { status: 404 });
    }

    if (!qr.analytics_enabled) {
      return NextResponse.json(
        { error: 'Analytics not enabled for this QR code' },
        { status: 400 }
      );
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

    const [
      scanEventsResult,
      todayCountResult,
      weekCountResult,
    ] = await Promise.all([
      supabase
        .from('qr_scan_events')
        .select('scanned_at, country_code, device_type, os_family, browser_family, referrer_domain, ip_hash')
        .eq('qr_id', id)
        .gte('scanned_at', periodStart)
        .order('scanned_at', { ascending: false })
        .limit(10000),

      supabase
        .from('qr_scan_events')
        .select('id', { count: 'exact', head: true })
        .eq('qr_id', id)
        .gte('scanned_at', todayStart),

      supabase
        .from('qr_scan_events')
        .select('id', { count: 'exact', head: true })
        .eq('qr_id', id)
        .gte('scanned_at', weekStart),
    ]);

    const scanEvents = scanEventsResult.data ?? [];

    // ── Aggregate ────────────────────────────────────────────────

    const scansByDay = aggregateByDay(
      scanEvents.map((e) => ({ ts: e.scanned_at })),
      periodDays,
    );

    const ipSet = new Set<string>();
    for (const e of scanEvents) {
      if (e.ip_hash) ipSet.add(e.ip_hash);
    }

    const scansThisMonth = scanEvents.filter((e) => e.scanned_at >= monthStart).length;

    const topCountries = groupAndCount(scanEvents, (e) => e.country_code)
      .slice(0, 10)
      .map((c) => ({ country: c.key, count: c.count }));

    const topDevices = groupAndCount(scanEvents, (e) => e.device_type)
      .map((d) => ({ device: d.key, count: d.count }));

    const topOs = groupAndCount(scanEvents, (e) => e.os_family)
      .slice(0, 8)
      .map((o) => ({ os: o.key, count: o.count }));

    const topBrowsers = groupAndCount(scanEvents, (e) => e.browser_family)
      .slice(0, 8)
      .map((b) => ({ browser: b.key, count: b.count }));

    const topReferrers = groupAndCount(scanEvents, (e) => e.referrer_domain)
      .slice(0, 10)
      .map((r) => ({ domain: r.key, count: r.count }));

    const recentScans = scanEvents.slice(0, 20).map((e) => ({
      scanned_at: e.scanned_at,
      country_code: e.country_code,
      device_type: e.device_type,
      os_family: e.os_family,
      browser_family: e.browser_family,
      referrer_domain: e.referrer_domain,
    }));

    return NextResponse.json({
      total_scans: qr.total_scans,
      scans_today: todayCountResult.count ?? 0,
      scans_this_week: weekCountResult.count ?? 0,
      scans_this_month: scansThisMonth,
      unique_visitors: ipSet.size,
      period,
      scans_by_day: scansByDay,
      top_countries: topCountries,
      top_devices: topDevices,
      top_os: topOs,
      top_browsers: topBrowsers,
      top_referrers: topReferrers,
      recent_scans: recentScans,
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
