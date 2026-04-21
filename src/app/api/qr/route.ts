import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { validateUrlStrict } from '@/lib/security/url-validator';
import { checkQrCreateLimit, checkApiLimit, getRateLimitHeaders } from '@/lib/security/rate-limiter';
import { createQRSchema } from '@/validations/qr';
import { writeAuditLog } from '@/lib/audit';
import { getPersonalOrgId } from '@/lib/org/get-personal-org';
import { getActiveOrgPlan } from '@/lib/org/get-active-org-plan';

const MAX_SLUG_RETRIES = 3;

/**
 * POST /api/qr - Create a new QR code
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient();

  // Check authentication
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Check rate limit
  const rateLimit = checkQrCreateLimit(user.id);
  if (!rateLimit.success) {
    return NextResponse.json(
      { error: 'Rate limit exceeded' },
      { status: 429, headers: getRateLimitHeaders(rateLimit) }
    );
  }

  try {
    const body = await request.json();

    // Validate input
    const parsed = createQRSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation error', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { name, mode, destination_url, slug, carrier, analytics_enabled, style } = parsed.data;

    // Pro-gate: only Pro orgs may set carrier != 'qr'
    if (carrier !== 'qr') {
      const plan = await getActiveOrgPlan(supabase, user.id);
      if (plan !== 'pro') {
        return NextResponse.json(
          { error: 'pro_plan_required' },
          { status: 403 }
        );
      }
    }

    // Validate URL with DNS resolution (SSRF prevention)
    const urlValidation = await validateUrlStrict(destination_url);
    if (!urlValidation.isValid) {
      return NextResponse.json(
        { error: urlValidation.error },
        { status: 400 }
      );
    }

    // Generate slug and create QR code with retry logic for slug collisions
    let finalSlug = slug;
    let qr: { id: string } | null = null;

    for (let attempt = 0; attempt < MAX_SLUG_RETRIES; attempt++) {
      // Generate slug if managed mode and not provided (or after collision)
      if (mode === 'managed' && !finalSlug) {
        const { data: slugData, error: slugError } = await supabase
          .rpc('generate_qr_unique_slug');

        if (slugError) {
          return NextResponse.json(
            { error: 'Failed to generate slug' },
            { status: 500 }
          );
        }
        finalSlug = slugData;
      }

      // Create QR code
      const orgId = await getPersonalOrgId(supabase, user.id);

      const { data: created, error: createError } = await supabase
        .from('qr_codes')
        .insert({
          owner_id: user.id,
          org_id: orgId,
          name,
          mode,
          slug: mode === 'managed' ? finalSlug : null,
          carrier,
          destination_url: urlValidation.normalizedUrl,
          analytics_enabled: mode === 'managed' ? analytics_enabled : false,
        })
        .select()
        .single();

      if (createError) {
        // Unique violation — retry with a new slug
        if (createError.code === '23505' && mode === 'managed') {
          finalSlug = undefined;
          continue;
        }
        console.error('Failed to create QR:', createError.message);
        return NextResponse.json(
          { error: 'Failed to create QR code' },
          { status: 500 }
        );
      }

      qr = created;
      break;
    }

    if (!qr) {
      return NextResponse.json(
        { error: 'Failed to create QR code after multiple attempts' },
        { status: 500 }
      );
    }

    // Update style if provided
    if (style && Object.keys(style).length > 0) {
      const styleUpdate: Record<string, unknown> = {};
      if (style.foreground_color) styleUpdate.foreground_color = style.foreground_color;
      if (style.background_color) styleUpdate.background_color = style.background_color;
      if (style.error_correction) styleUpdate.error_correction = style.error_correction;
      if (style.quiet_zone !== undefined) styleUpdate.quiet_zone = style.quiet_zone;
      if (style.module_shape) styleUpdate.module_shape = style.module_shape;
      if (style.eye_shape) styleUpdate.eye_shape = style.eye_shape;

      if (Object.keys(styleUpdate).length > 0) {
        await supabase
          .from('qr_styles')
          .update(styleUpdate)
          .eq('qr_id', qr.id);
      }
    }

    // Write audit log (fire-and-forget)
    writeAuditLog({
      qrId: qr.id,
      actorId: user.id,
      action: 'created',
      newValue: { name, mode, destination_url: urlValidation.normalizedUrl, slug: finalSlug },
      ipAddress: request.headers.get('x-forwarded-for')?.split(',')[0] || null,
      userAgent: request.headers.get('user-agent') || null,
    });

    // Build response
    const redirectUrl = mode === 'managed'
      ? `${process.env.NEXT_PUBLIC_APP_URL || ''}/r/${finalSlug}`
      : null;

    return NextResponse.json({
      id: qr.id,
      slug: finalSlug,
      redirect_url: redirectUrl,
    }, {
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
 * GET /api/qr - List user's QR codes
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
    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100);
    const offset = parseInt(searchParams.get('offset') || '0');

    const { data: qrCodes, error, count } = await supabase
      .from('qr_codes')
      .select('*, qr_styles(*)', { count: 'exact' })
      .eq('owner_id', user.id)
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error('Failed to fetch QR codes:', error.message);
      return NextResponse.json(
        { error: 'Failed to fetch QR codes' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      data: qrCodes,
      pagination: {
        total: count,
        limit,
        offset,
      },
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
