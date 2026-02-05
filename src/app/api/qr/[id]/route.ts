import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { validateUrl } from '@/lib/security/url-validator';
import { checkApiLimit, getRateLimitHeaders } from '@/lib/security/rate-limiter';
import { updateQRSchema, updateStyleSchema } from '@/validations/qr';

/**
 * GET /api/qr/[id] - Get a specific QR code
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
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
      .single();

    if (error || !qr) {
      return NextResponse.json({ error: 'QR code not found' }, { status: 404 });
    }

    return NextResponse.json(qr, {
      headers: getRateLimitHeaders(rateLimit),
    });

  } catch (error) {
    console.error('API error:', error);
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
      .select('id, owner_id, mode')
      .eq('id', id)
      .eq('owner_id', user.id)
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
        .eq('id', id);

      if (updateError) {
        console.error('Failed to update QR:', updateError);
        return NextResponse.json(
          { error: 'Failed to update QR code' },
          { status: 500 }
        );
      }
    }

    // Apply style update
    if (Object.keys(styleUpdate).length > 0) {
      const { error: styleError } = await supabase
        .from('qr_styles')
        .update(styleUpdate)
        .eq('qr_id', id);

      if (styleError) {
        console.error('Failed to update style:', styleError);
        return NextResponse.json(
          { error: 'Failed to update style' },
          { status: 500 }
        );
      }
    }

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
    console.error('API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/qr/[id] - Delete a QR code
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
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
    const { error } = await supabase
      .from('qr_codes')
      .delete()
      .eq('id', id)
      .eq('owner_id', user.id);

    if (error) {
      console.error('Failed to delete QR:', error);
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
    console.error('API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
