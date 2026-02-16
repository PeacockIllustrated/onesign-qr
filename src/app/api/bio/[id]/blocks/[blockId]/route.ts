import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { checkApiLimit, getRateLimitHeaders } from '@/lib/security/rate-limiter';
import { updateBioBlockSchema_block, blockContentSchemas } from '@/validations/bio';
import { isValidUUID } from '@/validations/qr';
import { writeBioAuditLog } from '@/lib/audit';

/**
 * PATCH /api/bio/[id]/blocks/[blockId] - Update a specific block
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; blockId: string }> }
) {
  const { id, blockId } = await params;

  if (!isValidUUID(id) || !isValidUUID(blockId)) {
    return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });
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

    // Verify block belongs to page
    const { data: existingBlock } = await supabase
      .from('bio_blocks')
      .select('id, block_type, content')
      .eq('id', blockId)
      .eq('page_id', id)
      .single();

    if (!existingBlock) {
      return NextResponse.json({ error: 'Block not found' }, { status: 404 });
    }

    const body = await request.json();

    const parsed = updateBioBlockSchema_block.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation error', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const update: Record<string, unknown> = {};
    const data = parsed.data;

    if (data.grid_col !== undefined) update.grid_col = data.grid_col;
    if (data.grid_row !== undefined) update.grid_row = data.grid_row;
    if (data.grid_col_span !== undefined) update.grid_col_span = data.grid_col_span;
    if (data.grid_row_span !== undefined) update.grid_row_span = data.grid_row_span;
    if (data.is_enabled !== undefined) update.is_enabled = data.is_enabled;

    if (data.content !== undefined) {
      // Validate content against block-type-specific schema
      const contentSchema = blockContentSchemas[existingBlock.block_type];
      if (contentSchema) {
        const contentParsed = contentSchema.safeParse(data.content);
        if (!contentParsed.success) {
          return NextResponse.json(
            { error: 'Invalid block content', details: contentParsed.error.flatten() },
            { status: 400 }
          );
        }
      }
      update.content = data.content;
    }

    if (Object.keys(update).length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
    }

    const { data: updatedBlock, error: updateError } = await supabase
      .from('bio_blocks')
      .update(update)
      .eq('id', blockId)
      .eq('page_id', id)
      .select()
      .single();

    if (updateError) {
      console.error('Failed to update block:', updateError.message);
      return NextResponse.json(
        { error: 'Failed to update block' },
        { status: 500 }
      );
    }

    // Audit log (fire-and-forget)
    writeBioAuditLog({
      pageId: id,
      actorId: user.id,
      action: 'link_updated',
      previousValue: { content: existingBlock.content },
      newValue: update,
      ipAddress: request.headers.get('x-forwarded-for')?.split(',')[0] || null,
      userAgent: request.headers.get('user-agent') || null,
    });

    return NextResponse.json(updatedBlock, {
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
 * DELETE /api/bio/[id]/blocks/[blockId] - Delete a specific block
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; blockId: string }> }
) {
  const { id, blockId } = await params;

  if (!isValidUUID(id) || !isValidUUID(blockId)) {
    return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });
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

    // Audit log before delete (fire-and-forget)
    writeBioAuditLog({
      pageId: id,
      actorId: user.id,
      action: 'link_removed',
      ipAddress: request.headers.get('x-forwarded-for')?.split(',')[0] || null,
      userAgent: request.headers.get('user-agent') || null,
    });

    const { error } = await supabase
      .from('bio_blocks')
      .delete()
      .eq('id', blockId)
      .eq('page_id', id);

    if (error) {
      console.error('Failed to delete block:', error.message);
      return NextResponse.json(
        { error: 'Failed to delete block' },
        { status: 500 }
      );
    }

    return new NextResponse(null, {
      status: 204,
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
