import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { validateUrlStrict } from '@/lib/security/url-validator';
import { checkApiLimit, getRateLimitHeaders } from '@/lib/security/rate-limiter';
import { updateBioLinkSchema } from '@/validations/bio';
import { isValidUUID } from '@/validations/qr';
import { writeBioAuditLog } from '@/lib/audit';

/**
 * PATCH /api/bio/[id]/links/[linkId] - Update a specific link
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; linkId: string }> }
) {
  const { id, linkId } = await params;

  if (!isValidUUID(id) || !isValidUUID(linkId)) {
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

    // Verify link belongs to page
    const { data: existingLink } = await supabase
      .from('bio_link_items')
      .select('id, title, url, icon, is_enabled')
      .eq('id', linkId)
      .eq('page_id', id)
      .single();

    if (!existingLink) {
      return NextResponse.json({ error: 'Link not found' }, { status: 404 });
    }

    const body = await request.json();

    const parsed = updateBioLinkSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation error', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const update: Record<string, unknown> = {};
    const data = parsed.data;

    if (data.title !== undefined) update.title = data.title;
    if (data.icon !== undefined) update.icon = data.icon;
    if (data.is_enabled !== undefined) update.is_enabled = data.is_enabled;

    if (data.url !== undefined) {
      const urlValidation = await validateUrlStrict(data.url);
      if (!urlValidation.isValid) {
        return NextResponse.json({ error: urlValidation.error }, { status: 400 });
      }
      update.url = urlValidation.normalizedUrl;
    }

    if (Object.keys(update).length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
    }

    const { data: updatedLink, error: updateError } = await supabase
      .from('bio_link_items')
      .update(update)
      .eq('id', linkId)
      .eq('page_id', id)
      .select()
      .single();

    if (updateError) {
      console.error('Failed to update link:', updateError.message);
      return NextResponse.json(
        { error: 'Failed to update link' },
        { status: 500 }
      );
    }

    // Audit log (fire-and-forget)
    writeBioAuditLog({
      pageId: id,
      actorId: user.id,
      action: 'link_updated',
      previousValue: { title: existingLink.title, url: existingLink.url },
      newValue: update,
      ipAddress: request.headers.get('x-forwarded-for')?.split(',')[0] || null,
      userAgent: request.headers.get('user-agent') || null,
    });

    return NextResponse.json(updatedLink, {
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
 * DELETE /api/bio/[id]/links/[linkId] - Delete a specific link
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; linkId: string }> }
) {
  const { id, linkId } = await params;

  if (!isValidUUID(id) || !isValidUUID(linkId)) {
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
      .from('bio_link_items')
      .delete()
      .eq('id', linkId)
      .eq('page_id', id);

    if (error) {
      console.error('Failed to delete link:', error.message);
      return NextResponse.json(
        { error: 'Failed to delete link' },
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
