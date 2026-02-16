import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { checkApiLimit, getRateLimitHeaders } from '@/lib/security/rate-limiter';
import { updateBioPageSchema } from '@/validations/bio';
import { isValidUUID } from '@/validations/qr';
import { writeBioAuditLog, determineBioUpdateAction } from '@/lib/audit';

/**
 * GET /api/bio/[id] - Get a specific bio page with its links
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
    const { data: page, error } = await supabase
      .from('bio_link_pages')
      .select('*, bio_link_items(*)')
      .eq('id', id)
      .eq('owner_id', user.id)
      .is('deleted_at', null)
      .order('sort_order', { referencedTable: 'bio_link_items', ascending: true })
      .single();

    if (error || !page) {
      return NextResponse.json({ error: 'Bio page not found' }, { status: 404 });
    }

    return NextResponse.json(page, {
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
 * PATCH /api/bio/[id] - Update a bio page
 */
export async function PATCH(
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
    // Verify ownership
    const { data: existing, error: fetchError } = await supabase
      .from('bio_link_pages')
      .select('id, owner_id, title, bio, theme, button_style, is_active')
      .eq('id', id)
      .eq('owner_id', user.id)
      .is('deleted_at', null)
      .single();

    if (fetchError || !existing) {
      return NextResponse.json({ error: 'Bio page not found' }, { status: 404 });
    }

    const body = await request.json();

    const parsed = updateBioPageSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation error', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const update: Record<string, unknown> = {};
    const data = parsed.data;

    if (data.title !== undefined) update.title = data.title;
    if (data.bio !== undefined) update.bio = data.bio;
    if (data.theme !== undefined) update.theme = data.theme;
    if (data.button_style !== undefined) update.button_style = data.button_style;
    if (data.custom_bg_color !== undefined) update.custom_bg_color = data.custom_bg_color;
    if (data.custom_text_color !== undefined) update.custom_text_color = data.custom_text_color;
    if (data.custom_accent_color !== undefined) update.custom_accent_color = data.custom_accent_color;
    if (data.font_title !== undefined) update.font_title = data.font_title;
    if (data.font_body !== undefined) update.font_body = data.font_body;
    if (data.border_radius !== undefined) update.border_radius = data.border_radius;
    if (data.spacing !== undefined) update.spacing = data.spacing;
    if (data.background_variant !== undefined) update.background_variant = data.background_variant;
    if (data.is_active !== undefined) update.is_active = data.is_active;
    if (data.analytics_enabled !== undefined) update.analytics_enabled = data.analytics_enabled;
    if (data.card_layout !== undefined) update.card_layout = data.card_layout;
    if (data.subtitle !== undefined) update.subtitle = data.subtitle;
    if (data.company !== undefined) update.company = data.company;
    if (data.job_title !== undefined) update.job_title = data.job_title;
    if (data.location !== undefined) update.location = data.location;
    if (data.contact_email !== undefined) update.contact_email = data.contact_email;
    if (data.contact_phone !== undefined) update.contact_phone = data.contact_phone;
    if (data.contact_website !== undefined) update.contact_website = data.contact_website;
    if (data.cover_aspect_ratio !== undefined) update.cover_aspect_ratio = data.cover_aspect_ratio;
    if (data.cover_position_y !== undefined) update.cover_position_y = data.cover_position_y;

    if (Object.keys(update).length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
    }

    const { error: updateError } = await supabase
      .from('bio_link_pages')
      .update(update)
      .eq('id', id)
      .eq('owner_id', user.id);

    if (updateError) {
      console.error('Failed to update bio page:', updateError.message);
      return NextResponse.json(
        { error: 'Failed to update bio page' },
        { status: 500 }
      );
    }

    // Audit log (fire-and-forget)
    const action = determineBioUpdateAction(update);
    writeBioAuditLog({
      pageId: id,
      actorId: user.id,
      action,
      previousValue: {
        title: existing.title,
        bio: existing.bio,
        theme: existing.theme,
        is_active: existing.is_active,
      },
      newValue: update,
      ipAddress: request.headers.get('x-forwarded-for')?.split(',')[0] || null,
      userAgent: request.headers.get('user-agent') || null,
    });

    // Fetch updated page
    const { data: updated } = await supabase
      .from('bio_link_pages')
      .select('*, bio_link_items(*)')
      .eq('id', id)
      .order('sort_order', { referencedTable: 'bio_link_items', ascending: true })
      .single();

    return NextResponse.json(updated, {
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
 * DELETE /api/bio/[id] - Soft-delete a bio page
 */
export async function DELETE(
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
    // Audit log before soft-delete (fire-and-forget)
    writeBioAuditLog({
      pageId: id,
      actorId: user.id,
      action: 'deleted',
      ipAddress: request.headers.get('x-forwarded-for')?.split(',')[0] || null,
      userAgent: request.headers.get('user-agent') || null,
    });

    const { error } = await supabase
      .from('bio_link_pages')
      .update({
        deleted_at: new Date().toISOString(),
        is_active: false,
      })
      .eq('id', id)
      .eq('owner_id', user.id);

    if (error) {
      console.error('Failed to delete bio page:', error.message);
      return NextResponse.json(
        { error: 'Failed to delete bio page' },
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
