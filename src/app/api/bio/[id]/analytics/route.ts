import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { checkApiLimit, getRateLimitHeaders } from '@/lib/security/rate-limiter';
import { isValidUUID } from '@/validations/qr';

/**
 * GET /api/bio/[id]/analytics - Get analytics for a bio page
 *
 * Returns view totals, clicks per link, and breakdown data.
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

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
    const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const monthStart = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();

    // Parallel queries for view counts
    const [todayResult, weekResult, monthResult, linksResult] = await Promise.all([
      supabase
        .from('bio_link_view_events')
        .select('id', { count: 'exact', head: true })
        .eq('page_id', id)
        .gte('viewed_at', todayStart),
      supabase
        .from('bio_link_view_events')
        .select('id', { count: 'exact', head: true })
        .eq('page_id', id)
        .gte('viewed_at', weekStart),
      supabase
        .from('bio_link_view_events')
        .select('id', { count: 'exact', head: true })
        .eq('page_id', id)
        .gte('viewed_at', monthStart),
      supabase
        .from('bio_link_items')
        .select('id, title, total_clicks')
        .eq('page_id', id)
        .order('sort_order', { ascending: true }),
    ]);

    return NextResponse.json({
      total_views: page.total_views,
      views_today: todayResult.count ?? 0,
      views_this_week: weekResult.count ?? 0,
      views_this_month: monthResult.count ?? 0,
      links: (linksResult.data ?? []).map((link) => ({
        id: link.id,
        title: link.title,
        total_clicks: link.total_clicks,
      })),
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
