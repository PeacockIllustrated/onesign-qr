import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { checkApiLimit, getRateLimitHeaders } from '@/lib/security/rate-limiter';
import { isValidUUID } from '@/validations/qr';
import { writeBioAuditLog } from '@/lib/audit';

/**
 * POST /api/bio/[id]/qr - Generate a QR code linked to this bio page
 *
 * Creates a managed QR code with destination_url pointing to /p/{slug},
 * then links it via bio_link_pages.qr_code_id.
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
    // Verify page ownership and get slug
    const { data: page, error: pageError } = await supabase
      .from('bio_link_pages')
      .select('id, slug, title, qr_code_id')
      .eq('id', id)
      .eq('owner_id', user.id)
      .is('deleted_at', null)
      .single();

    if (pageError || !page) {
      return NextResponse.json({ error: 'Bio page not found' }, { status: 404 });
    }

    // Check if already has a QR
    if (page.qr_code_id) {
      return NextResponse.json(
        { error: 'Bio page already has a linked QR code', qr_code_id: page.qr_code_id },
        { status: 409 }
      );
    }

    const pageUrl = `${process.env.NEXT_PUBLIC_APP_URL || ''}/p/${page.slug}`;

    // Generate slug for the QR code
    const { data: qrSlug, error: slugError } = await supabase.rpc('generate_qr_unique_slug');
    if (slugError || !qrSlug) {
      return NextResponse.json(
        { error: 'Failed to generate QR slug' },
        { status: 500 }
      );
    }

    // Create the managed QR code
    const { data: qr, error: qrError } = await supabase
      .from('qr_codes')
      .insert({
        owner_id: user.id,
        name: `QR for ${page.title}`,
        mode: 'managed' as const,
        slug: qrSlug,
        destination_url: pageUrl,
        analytics_enabled: true,
      })
      .select('id, slug')
      .single();

    if (qrError || !qr) {
      console.error('Failed to create QR for bio page:', qrError?.message);
      return NextResponse.json(
        { error: 'Failed to create QR code' },
        { status: 500 }
      );
    }

    // Link QR to bio page
    const { error: linkError } = await supabase
      .from('bio_link_pages')
      .update({ qr_code_id: qr.id })
      .eq('id', id);

    if (linkError) {
      console.error('Failed to link QR to bio page:', linkError.message);
    }

    // Audit log (fire-and-forget)
    writeBioAuditLog({
      pageId: id,
      actorId: user.id,
      action: 'updated',
      newValue: { qr_code_id: qr.id, qr_slug: qr.slug },
      ipAddress: request.headers.get('x-forwarded-for')?.split(',')[0] || null,
      userAgent: request.headers.get('user-agent') || null,
    });

    const redirectUrl = `${process.env.NEXT_PUBLIC_APP_URL || ''}/r/${qr.slug}`;

    return NextResponse.json({
      qr_code_id: qr.id,
      qr_slug: qr.slug,
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
