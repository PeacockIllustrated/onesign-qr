import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { checkBioCreateLimit, checkApiLimit, getRateLimitHeaders } from '@/lib/security/rate-limiter';
import { createBioPageSchema } from '@/validations/bio';
import { writeBioAuditLog } from '@/lib/audit';
import { BIO_DEFAULTS } from '@/lib/constants';
import { getPersonalOrgId } from '@/lib/org/get-personal-org';

const MAX_SLUG_RETRIES = 3;

/**
 * POST /api/bio - Create a new bio-link page
 *
 * Users may have up to MAX_PAGES_PER_USER pages. Only one can be active at a time
 * (enforced by a partial unique index). New pages default to draft (is_active = false)
 * unless this is the user's first page.
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient();

  // Check authentication
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Check rate limit
  const rateLimit = checkBioCreateLimit(user.id);
  if (!rateLimit.success) {
    return NextResponse.json(
      { error: 'Rate limit exceeded' },
      { status: 429, headers: getRateLimitHeaders(rateLimit) }
    );
  }

  try {
    const body = await request.json();

    // Validate input
    const parsed = createBioPageSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation error', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const {
      title,
      bio,
      slug,
      theme,
      button_style,
      custom_bg_color,
      custom_text_color,
      custom_accent_color,
      analytics_enabled,
      create_qr,
    } = parsed.data;

    // Check how many non-deleted pages the user already has
    const { count: existingCount, error: countError } = await supabase
      .from('bio_link_pages')
      .select('id', { count: 'exact', head: true })
      .eq('owner_id', user.id)
      .is('deleted_at', null);

    if (countError) {
      console.error('Failed to count existing bio pages:', countError.message);
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }

    const pageCount = existingCount ?? 0;

    if (pageCount >= BIO_DEFAULTS.MAX_PAGES_PER_USER) {
      return NextResponse.json(
        { error: `You can have up to ${BIO_DEFAULTS.MAX_PAGES_PER_USER} bio pages.` },
        { status: 409 }
      );
    }

    // First page is active by default; subsequent pages start as drafts
    const isFirstPage = pageCount === 0;

    // Look up the user's org_id once (before retry loop to avoid redundant lookups)
    const orgId = await getPersonalOrgId(supabase, user.id);

    // Generate slug with retry logic
    let finalSlug = slug;
    let page: { id: string; slug: string; is_active: boolean } | null = null;

    for (let attempt = 0; attempt < MAX_SLUG_RETRIES; attempt++) {
      if (!finalSlug) {
        const { data: slugData, error: slugError } = await supabase
          .rpc('generate_bio_unique_slug');

        if (slugError) {
          return NextResponse.json(
            { error: 'Failed to generate slug' },
            { status: 500 }
          );
        }
        finalSlug = slugData;
      }

      const { data: created, error: createError } = await supabase
        .from('bio_link_pages')
        .insert({
          owner_id: user.id,
          org_id: orgId,
          title,
          bio: bio || null,
          slug: finalSlug!,
          theme,
          button_style,
          custom_bg_color: custom_bg_color || null,
          custom_text_color: custom_text_color || null,
          custom_accent_color: custom_accent_color || null,
          analytics_enabled,
          is_active: isFirstPage,
        })
        .select('id, slug, is_active')
        .single();

      if (createError) {
        // Unique slug violation — retry with a new slug
        if (createError.code === '23505' && !slug) {
          finalSlug = undefined;
          continue;
        }
        console.error('Failed to create bio page:', createError.message, createError.code, createError.details);
        return NextResponse.json(
          {
            error: 'Failed to create bio page',
            ...(process.env.NODE_ENV === 'development' && {
              debug: createError.message,
              code: createError.code,
              details: createError.details,
            }),
          },
          { status: 500 }
        );
      }

      page = created;
      break;
    }

    if (!page) {
      return NextResponse.json(
        { error: 'Failed to create bio page after multiple attempts' },
        { status: 500 }
      );
    }

    // Optionally create a QR code pointing to this bio page
    let qrCodeId: string | null = null;
    if (create_qr) {
      const pageUrl = `${process.env.NEXT_PUBLIC_APP_URL || ''}/p/${page.slug}`;

      const { data: qr, error: qrError } = await supabase
        .from('qr_codes')
        .insert({
          owner_id: user.id,
          org_id: orgId,
          name: `QR for ${title}`,
          mode: 'managed' as const,
          slug: null, // Will be generated by trigger — actually we need to generate one
          destination_url: pageUrl,
          analytics_enabled: true,
        })
        .select('id')
        .single();

      // QR codes with mode='managed' require a slug, so generate one
      if (qrError) {
        // Non-critical: bio page was created, QR is optional
        console.error('Failed to create QR for bio page:', qrError.message);
      } else if (qr) {
        // Generate a slug for the QR code
        const { data: qrSlug } = await supabase.rpc('generate_qr_unique_slug');
        if (qrSlug) {
          await supabase
            .from('qr_codes')
            .update({ slug: qrSlug })
            .eq('id', qr.id);
        }

        qrCodeId = qr.id;
        // Link the QR to the bio page
        await supabase
          .from('bio_link_pages')
          .update({ qr_code_id: qr.id })
          .eq('id', page.id);
      }
    }

    // Write audit log (fire-and-forget)
    writeBioAuditLog({
      pageId: page.id,
      actorId: user.id,
      action: 'created',
      newValue: { title, slug: page.slug, theme, create_qr },
      ipAddress: request.headers.get('x-forwarded-for')?.split(',')[0] || null,
      userAgent: request.headers.get('user-agent') || null,
    });

    const pageUrl = `${process.env.NEXT_PUBLIC_APP_URL || ''}/p/${page.slug}`;

    return NextResponse.json({
      id: page.id,
      slug: page.slug,
      is_active: page.is_active,
      page_url: pageUrl,
      qr_code_id: qrCodeId,
    }, {
      status: 201,
      headers: getRateLimitHeaders(rateLimit),
    });

  } catch (error) {
    const message = error instanceof Error ? error.message : 'unknown error';
    const stack = error instanceof Error ? error.stack : undefined;
    console.error('API error:', message, stack);
    return NextResponse.json(
      {
        error: 'Internal server error',
        ...(process.env.NODE_ENV === 'development' && { debug: message, stack }),
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/bio - Get the user's bio page
 */
export async function GET(request: NextRequest) {
  const supabase = await createClient();

  // Check authentication
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Check rate limit
  const rateLimit = checkApiLimit(user.id);
  if (!rateLimit.success) {
    return NextResponse.json(
      { error: 'Rate limit exceeded' },
      { status: 429, headers: getRateLimitHeaders(rateLimit) }
    );
  }

  try {
    const { data: pages, error } = await supabase
      .from('bio_link_pages')
      .select('*, bio_link_items(*)')
      .eq('owner_id', user.id)
      .is('deleted_at', null)
      .order('is_active', { ascending: false })
      .order('created_at', { ascending: false })
      .order('sort_order', { referencedTable: 'bio_link_items', ascending: true });

    if (error) {
      return NextResponse.json({ data: [] }, {
        headers: getRateLimitHeaders(rateLimit),
      });
    }

    return NextResponse.json({ data: pages || [] }, {
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
