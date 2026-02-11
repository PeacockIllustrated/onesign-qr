import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { validateUrlStrict } from '@/lib/security/url-validator';
import { checkApiLimit, getRateLimitHeaders } from '@/lib/security/rate-limiter';
import { createBioLinkSchema } from '@/validations/bio';
import { isValidUUID } from '@/validations/qr';
import { writeBioAuditLog } from '@/lib/audit';
import { BIO_DEFAULTS } from '@/lib/constants';

/**
 * POST /api/bio/[id]/links - Add a link to a bio page
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

    // Check link count limit
    const { count } = await supabase
      .from('bio_link_items')
      .select('id', { count: 'exact', head: true })
      .eq('page_id', id);

    if ((count ?? 0) >= BIO_DEFAULTS.MAX_LINKS_PER_PAGE) {
      return NextResponse.json(
        { error: `Maximum ${BIO_DEFAULTS.MAX_LINKS_PER_PAGE} links per page` },
        { status: 400 }
      );
    }

    const body = await request.json();

    const parsed = createBioLinkSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation error', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { title, url, icon, icon_type, icon_url, icon_bg_color, show_icon, is_enabled } = parsed.data;

    // Validate URL
    const urlValidation = await validateUrlStrict(url);
    if (!urlValidation.isValid) {
      return NextResponse.json(
        { error: urlValidation.error },
        { status: 400 }
      );
    }

    // Determine next sort_order
    const nextOrder = (count ?? 0);

    const { data: link, error: insertError } = await supabase
      .from('bio_link_items')
      .insert({
        page_id: id,
        title,
        url: urlValidation.normalizedUrl!,
        icon: icon || null,
        icon_type: icon_type || null,
        icon_url: icon_url || null,
        icon_bg_color: icon_bg_color || null,
        show_icon: show_icon ?? true,
        sort_order: nextOrder,
        is_enabled,
      })
      .select()
      .single();

    if (insertError) {
      console.error('Failed to create link:', insertError.message);
      return NextResponse.json(
        { error: 'Failed to create link' },
        { status: 500 }
      );
    }

    // Audit log (fire-and-forget)
    writeBioAuditLog({
      pageId: id,
      actorId: user.id,
      action: 'link_added',
      newValue: { title, url: urlValidation.normalizedUrl, icon },
      ipAddress: request.headers.get('x-forwarded-for')?.split(',')[0] || null,
      userAgent: request.headers.get('user-agent') || null,
    });

    return NextResponse.json(link, {
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
 * GET /api/bio/[id]/links - List links for a bio page
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

    const { data: links, error } = await supabase
      .from('bio_link_items')
      .select('*')
      .eq('page_id', id)
      .order('sort_order', { ascending: true });

    if (error) {
      return NextResponse.json(
        { error: 'Failed to fetch links' },
        { status: 500 }
      );
    }

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
