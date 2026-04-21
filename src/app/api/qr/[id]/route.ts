import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { validateUrl } from '@/lib/security/url-validator';
import { checkApiLimit, getRateLimitHeaders } from '@/lib/security/rate-limiter';
import { updateQRSchema, updateStyleSchema, isValidUUID } from '@/validations/qr';
import { writeAuditLog, determineUpdateAction } from '@/lib/audit';
import { getActiveOrgPlan } from '@/lib/org/get-active-org-plan';

/**
 * GET /api/qr/[id] - Get a specific QR code
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  // Validate UUID format
  if (!isValidUUID(id)) {
    return NextResponse.json({ error: 'Invalid QR code ID' }, { status: 400 });
  }

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
    const { data: qr, error } = await supabase
      .from('qr_codes')
      .select('*, qr_styles(*)')
      .eq('id', id)
      .eq('owner_id', user.id)
      .is('deleted_at', null)
      .single();

    if (error || !qr) {
      return NextResponse.json({ error: 'QR code not found' }, { status: 404 });
    }

    return NextResponse.json(qr, {
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
 * PATCH /api/qr/[id] - Update a QR code
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  // Validate UUID format
  if (!isValidUUID(id)) {
    return NextResponse.json({ error: 'Invalid QR code ID' }, { status: 400 });
  }

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
    // Verify ownership
    const { data: existingQr, error: fetchError } = await supabase
      .from('qr_codes')
      .select('id, owner_id, mode, destination_url, name, is_active, analytics_enabled')
      .eq('id', id)
      .eq('owner_id', user.id)
      .is('deleted_at', null)
      .single();

    if (fetchError || !existingQr) {
      return NextResponse.json({ error: 'QR code not found' }, { status: 404 });
    }

    const body = await request.json();

    // Handle QR code updates
    const qrUpdate: Record<string, unknown> = {};
    const styleUpdate: Record<string, unknown> = {};

    // Separate QR and style updates
    const { style, ...qrFields } = body;

    // Validate QR fields
    if (Object.keys(qrFields).length > 0) {
      const parsed = updateQRSchema.safeParse(qrFields);
      if (!parsed.success) {
        return NextResponse.json(
          { error: 'Validation error', details: parsed.error.flatten() },
          { status: 400 }
        );
      }

      // Validate destination URL if provided
      if (parsed.data.destination_url) {
        const urlValidation = validateUrl(parsed.data.destination_url);
        if (!urlValidation.isValid) {
          return NextResponse.json(
            { error: urlValidation.error },
            { status: 400 }
          );
        }
        qrUpdate.destination_url = urlValidation.normalizedUrl;
      }

      if (parsed.data.name) qrUpdate.name = parsed.data.name;
      if (parsed.data.is_active !== undefined) qrUpdate.is_active = parsed.data.is_active;
      if (parsed.data.analytics_enabled !== undefined) {
        qrUpdate.analytics_enabled = parsed.data.analytics_enabled;
      }

      if (parsed.data.carrier !== undefined) {
        // Pro-gate: only Pro orgs may set carrier != 'qr'
        if (parsed.data.carrier !== 'qr') {
          const plan = await getActiveOrgPlan(supabase, user.id);
          if (plan !== 'pro') {
            return NextResponse.json(
              { error: 'pro_plan_required' },
              { status: 403 }
            );
          }
        }
        qrUpdate.carrier = parsed.data.carrier;
      }
    }

    // Validate style fields
    if (style && Object.keys(style).length > 0) {
      const styleParsed = updateStyleSchema.safeParse(style);
      if (!styleParsed.success) {
        return NextResponse.json(
          { error: 'Style validation error', details: styleParsed.error.flatten() },
          { status: 400 }
        );
      }

      if (styleParsed.data.foreground_color) styleUpdate.foreground_color = styleParsed.data.foreground_color;
      if (styleParsed.data.background_color) styleUpdate.background_color = styleParsed.data.background_color;
      if (styleParsed.data.error_correction) styleUpdate.error_correction = styleParsed.data.error_correction;
      if (styleParsed.data.quiet_zone !== undefined) styleUpdate.quiet_zone = styleParsed.data.quiet_zone;
      if (styleParsed.data.module_shape) styleUpdate.module_shape = styleParsed.data.module_shape;
      if (styleParsed.data.eye_shape) styleUpdate.eye_shape = styleParsed.data.eye_shape;
    }

    // Apply QR update
    if (Object.keys(qrUpdate).length > 0) {
      const { error: updateError } = await supabase
        .from('qr_codes')
        .update(qrUpdate)
        .eq('id', id)
        .eq('owner_id', user.id);

      if (updateError) {
        console.error('Failed to update QR:', updateError.message);
        return NextResponse.json(
          { error: 'Failed to update QR code' },
          { status: 500 }
        );
      }
    }

    // Apply style update (also filter by owner via qr_id relationship)
    if (Object.keys(styleUpdate).length > 0) {
      const { error: styleError } = await supabase
        .from('qr_styles')
        .update(styleUpdate)
        .eq('qr_id', id);

      if (styleError) {
        console.error('Failed to update style:', styleError.message);
        return NextResponse.json(
          { error: 'Failed to update style' },
          { status: 500 }
        );
      }
    }

    // Write audit log (fire-and-forget)
    const action = determineUpdateAction(qrUpdate, styleUpdate);
    writeAuditLog({
      qrId: id,
      actorId: user.id,
      action,
      previousValue: {
        destination_url: existingQr.destination_url,
        name: existingQr.name,
        is_active: existingQr.is_active,
      },
      newValue: { ...qrUpdate, ...styleUpdate },
      ipAddress: request.headers.get('x-forwarded-for')?.split(',')[0] || null,
      userAgent: request.headers.get('user-agent') || null,
    });

    // Fetch updated QR
    const { data: updatedQr } = await supabase
      .from('qr_codes')
      .select('*, qr_styles(*)')
      .eq('id', id)
      .single();

    return NextResponse.json(updatedQr, {
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
 * DELETE /api/qr/[id] - Soft-delete a QR code
 *
 * Sets deleted_at timestamp and deactivates the QR code rather than
 * permanently removing it. This enables data recovery and compliance.
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  // Validate UUID format
  if (!isValidUUID(id)) {
    return NextResponse.json({ error: 'Invalid QR code ID' }, { status: 400 });
  }

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
    // Write audit log before soft-delete (fire-and-forget)
    writeAuditLog({
      qrId: id,
      actorId: user.id,
      action: 'deleted',
      ipAddress: request.headers.get('x-forwarded-for')?.split(',')[0] || null,
      userAgent: request.headers.get('user-agent') || null,
    });

    // Soft delete: set deleted_at and deactivate
    const { error } = await supabase
      .from('qr_codes')
      .update({
        deleted_at: new Date().toISOString(),
        is_active: false,
      })
      .eq('id', id)
      .eq('owner_id', user.id);

    if (error) {
      console.error('Failed to delete QR:', error.message);
      return NextResponse.json(
        { error: 'Failed to delete QR code' },
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
