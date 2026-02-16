import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { checkApiLimit, getRateLimitHeaders } from '@/lib/security/rate-limiter';
import { createBioBlockSchema, blockContentSchemas } from '@/validations/bio';
import { isValidUUID } from '@/validations/qr';
import { writeBioAuditLog } from '@/lib/audit';
import { BIO_DEFAULTS } from '@/lib/constants';

/**
 * POST /api/bio/[id]/blocks - Create a block on a bio page
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
    const { data: page, error: pageError } = await supabase
      .from('bio_link_pages')
      .select('id')
      .eq('id', id)
      .eq('owner_id', user.id)
      .is('deleted_at', null)
      .single();

    if (pageError || !page) {
      return NextResponse.json({ error: 'Bio page not found' }, { status: 404 });
    }

    // Check block count limit
    const { count } = await supabase
      .from('bio_blocks')
      .select('id', { count: 'exact', head: true })
      .eq('page_id', id);

    if ((count ?? 0) >= BIO_DEFAULTS.MAX_BLOCKS_PER_PAGE) {
      return NextResponse.json(
        { error: `Maximum ${BIO_DEFAULTS.MAX_BLOCKS_PER_PAGE} blocks per page` },
        { status: 400 }
      );
    }

    const body = await request.json();

    const parsed = createBioBlockSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation error', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { block_type, grid_col, grid_row, grid_col_span, grid_row_span, content, is_enabled } = parsed.data;

    // Validate content against block-type-specific schema
    const contentSchema = blockContentSchemas[block_type];
    if (contentSchema) {
      const contentParsed = contentSchema.safeParse(content);
      if (!contentParsed.success) {
        return NextResponse.json(
          { error: 'Invalid block content', details: contentParsed.error.flatten() },
          { status: 400 }
        );
      }
    }

    // Determine next sort_order
    const nextOrder = (count ?? 0);

    const { data: block, error: insertError } = await supabase
      .from('bio_blocks')
      .insert({
        page_id: id,
        block_type,
        grid_col,
        grid_row,
        grid_col_span,
        grid_row_span,
        content,
        sort_order: nextOrder,
        is_enabled,
      })
      .select()
      .single();

    if (insertError) {
      console.error('Failed to create block:', insertError.message);
      return NextResponse.json(
        { error: 'Failed to create block' },
        { status: 500 }
      );
    }

    // Audit log (fire-and-forget)
    writeBioAuditLog({
      pageId: id,
      actorId: user.id,
      action: 'link_added',
      newValue: { block_type, content },
      ipAddress: request.headers.get('x-forwarded-for')?.split(',')[0] || null,
      userAgent: request.headers.get('user-agent') || null,
    });

    return NextResponse.json(block, {
      status: 201,
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

/**
 * GET /api/bio/[id]/blocks - List blocks for a bio page
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

    const { data: blocks, error } = await supabase
      .from('bio_blocks')
      .select('*')
      .eq('page_id', id)
      .order('grid_row', { ascending: true })
      .order('grid_col', { ascending: true });

    if (error) {
      return NextResponse.json(
        { error: 'Failed to fetch blocks' },
        { status: 500 }
      );
    }

    return NextResponse.json({ data: blocks }, {
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
