import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { checkApiLimit, getRateLimitHeaders } from '@/lib/security/rate-limiter';
import { reorderLinksSchema } from '@/validations/bio';
import { isValidUUID } from '@/validations/qr';
import { writeBioAuditLog } from '@/lib/audit';

/**
 * POST /api/bio/[id]/links/reorder - Reorder links
 *
 * Accepts an array of { id, sort_order } pairs and batch-updates all items.
 */
export async function POST(
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
    const { data: page } = await supabase
      .from('bio_link_pages')
      .select('id')
      .eq('id', id)
      .eq('owner_id', user.id)
      .is('deleted_at', null)
      .single();

    if (!page) {
      return NextResponse.json({ error: 'Bio page not found' }, { status: 404 });
    }

    const body = await request.json();

    const parsed = reorderLinksSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation error', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { items } = parsed.data;

    // Update each item's sort_order
    const updates = items.map(({ id: itemId, sort_order }) =>
      supabase
        .from('bio_link_items')
        .update({ sort_order })
        .eq('id', itemId)
        .eq('page_id', id)
    );

    const results = await Promise.all(updates);
    const failed = results.find((r) => r.error);

    if (failed?.error) {
      console.error('Failed to reorder links:', failed.error.message);
      return NextResponse.json(
        { error: 'Failed to reorder links' },
        { status: 500 }
      );
    }

    // Audit log (fire-and-forget)
    writeBioAuditLog({
      pageId: id,
      actorId: user.id,
      action: 'link_reordered',
      newValue: { items },
      ipAddress: request.headers.get('x-forwarded-for')?.split(',')[0] || null,
      userAgent: request.headers.get('user-agent') || null,
    });

    // Return updated links
    const { data: links } = await supabase
      .from('bio_link_items')
      .select('*')
      .eq('page_id', id)
      .order('sort_order', { ascending: true });

    return NextResponse.json({ data: links }, {
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
