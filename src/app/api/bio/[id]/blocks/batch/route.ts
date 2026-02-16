import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { checkApiLimit, getRateLimitHeaders } from '@/lib/security/rate-limiter';
import { batchUpdateBlocksSchema } from '@/validations/bio';
import { isValidUUID } from '@/validations/qr';
import { writeBioAuditLog } from '@/lib/audit';

/**
 * POST /api/bio/[id]/blocks/batch - Batch update block positions
 *
 * Used by the grid editor when dragging/resizing blocks.
 * Accepts an array of { id, grid_col?, grid_row?, grid_col_span?, grid_row_span?, sort_order? }
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

    const parsed = batchUpdateBlocksSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation error', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { blocks } = parsed.data;

    // Update each block's position fields
    const updates = blocks.map((block) => {
      const update: Record<string, unknown> = {};
      if (block.grid_col !== undefined) update.grid_col = block.grid_col;
      if (block.grid_row !== undefined) update.grid_row = block.grid_row;
      if (block.grid_col_span !== undefined) update.grid_col_span = block.grid_col_span;
      if (block.grid_row_span !== undefined) update.grid_row_span = block.grid_row_span;
      if (block.sort_order !== undefined) update.sort_order = block.sort_order;

      return supabase
        .from('bio_blocks')
        .update(update)
        .eq('id', block.id)
        .eq('page_id', id);
    });

    const results = await Promise.all(updates);
    const failed = results.find((r) => r.error);

    if (failed?.error) {
      console.error('Failed to batch update blocks:', failed.error.message);
      return NextResponse.json(
        { error: 'Failed to update blocks' },
        { status: 500 }
      );
    }

    // Audit log (fire-and-forget)
    writeBioAuditLog({
      pageId: id,
      actorId: user.id,
      action: 'link_reordered',
      newValue: { blocks },
      ipAddress: request.headers.get('x-forwarded-for')?.split(',')[0] || null,
      userAgent: request.headers.get('user-agent') || null,
    });

    // Return updated blocks
    const { data: updatedBlocks } = await supabase
      .from('bio_blocks')
      .select('*')
      .eq('page_id', id)
      .order('grid_row', { ascending: true })
      .order('grid_col', { ascending: true });

    return NextResponse.json({ data: updatedBlocks }, {
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
