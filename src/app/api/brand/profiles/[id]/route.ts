import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { checkApiLimit, getRateLimitHeaders } from '@/lib/security/rate-limiter';
import { updateBrandProfileSchema } from '@/validations/brand';
import { isValidUUID } from '@/validations/qr';

/**
 * GET /api/brand/profiles/[id] — get profile with people and designs
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  if (!isValidUUID(id)) return NextResponse.json({ error: 'Invalid profile ID' }, { status: 400 });

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const rateLimit = checkApiLimit(user.id);
  if (!rateLimit.success) {
    return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429, headers: getRateLimitHeaders(rateLimit) });
  }

  const { data: profile, error } = await supabase
    .from('brand_profiles')
    .select('*')
    .eq('id', id)
    .is('deleted_at', null)
    .single();

  if (error || !profile) {
    return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
  }

  const [{ data: people }, { data: designs }] = await Promise.all([
    supabase
      .from('brand_people')
      .select('*')
      .eq('brand_profile_id', id)
      .order('sort_order', { ascending: true }),
    supabase
      .from('brand_designs')
      .select('*')
      .eq('brand_profile_id', id)
      .is('deleted_at', null)
      .order('updated_at', { ascending: false }),
  ]);

  return NextResponse.json(
    { profile, people: people ?? [], designs: designs ?? [] },
    { headers: getRateLimitHeaders(rateLimit) }
  );
}

/**
 * PATCH /api/brand/profiles/[id] — update profile
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  if (!isValidUUID(id)) return NextResponse.json({ error: 'Invalid profile ID' }, { status: 400 });

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const rateLimit = checkApiLimit(user.id);
  if (!rateLimit.success) {
    return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429, headers: getRateLimitHeaders(rateLimit) });
  }

  try {
    const body = await request.json();
    const parsed = updateBrandProfileSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Validation error', details: parsed.error.flatten() }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('brand_profiles')
      .update(parsed.data)
      .eq('id', id)
      .is('deleted_at', null)
      .select()
      .single();

    if (error || !data) {
      return NextResponse.json({ error: 'Profile not found or update failed' }, { status: 404 });
    }
    return NextResponse.json(data, { headers: getRateLimitHeaders(rateLimit) });
  } catch (error) {
    console.error('API error:', error instanceof Error ? error.message : 'unknown');
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * DELETE /api/brand/profiles/[id] — soft-delete profile
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  if (!isValidUUID(id)) return NextResponse.json({ error: 'Invalid profile ID' }, { status: 400 });

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // Authorise via user-scoped SELECT — the brand_profiles SELECT policy
  // requires org membership, so finding the row proves the caller is allowed
  // to act on it. Postgres applies the SELECT policy's USING expression to
  // the *new* row of an UPDATE, and our policy includes `deleted_at IS NULL`
  // — which means a soft-delete UPDATE always fails RLS as "new row violates
  // policy". Workaround: do the soft-delete with the admin client after
  // authorisation passes.
  const { data: existing, error: lookupError } = await supabase
    .from('brand_profiles')
    .select('id')
    .eq('id', id)
    .is('deleted_at', null)
    .single();

  if (lookupError || !existing) {
    return NextResponse.json({ error: 'Profile not found or already deleted' }, { status: 404 });
  }

  const admin = createAdminClient();
  const { error: updateError } = await admin
    .from('brand_profiles')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id);

  if (updateError) {
    return NextResponse.json({ error: 'Failed to delete profile', details: updateError.message }, { status: 500 });
  }
  return new NextResponse(null, { status: 204 });
}
