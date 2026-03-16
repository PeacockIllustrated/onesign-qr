import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { checkApiLimit, getRateLimitHeaders } from '@/lib/security/rate-limiter';
import { isValidUUID } from '@/validations/qr';

/**
 * GET /api/bio/[id]/submissions - List form submissions for a bio page
 *
 * Auth required, page ownership verified.
 * Optional query param: ?block_id=xxx to filter by block.
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

    // Build query
    let query = supabase
      .from('bio_form_submissions')
      .select('*')
      .eq('page_id', id)
      .order('submitted_at', { ascending: false });

    // Optional block_id filter
    const blockId = request.nextUrl.searchParams.get('block_id');
    if (blockId) {
      if (!isValidUUID(blockId)) {
        return NextResponse.json({ error: 'Invalid block_id' }, { status: 400 });
      }
      query = query.eq('block_id', blockId);
    }

    const { data: submissions, error } = await query;

    if (error) {
      console.error('Failed to fetch submissions:', error.message);
      return NextResponse.json(
        { error: 'Failed to fetch submissions' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { data: submissions },
      { headers: getRateLimitHeaders(rateLimit) }
    );
  } catch (error) {
    console.error('API error:', error instanceof Error ? error.message : 'unknown error');
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
