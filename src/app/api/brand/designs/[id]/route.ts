import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { checkApiLimit, getRateLimitHeaders } from '@/lib/security/rate-limiter';
import { updateBrandDesignSchema } from '@/validations/brand';
import { isValidUUID } from '@/validations/qr';
import { hydrateBrandDesign } from '@/lib/brand/hydrate';

/**
 * GET /api/brand/designs/[id] — fetch hydrated design (profile + person + URLs)
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  if (!isValidUUID(id)) return NextResponse.json({ error: 'Invalid design ID' }, { status: 400 });

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: design, error } = await supabase
    .from('brand_designs')
    .select('*')
    .eq('id', id)
    .is('deleted_at', null)
    .single();

  if (error || !design) {
    return NextResponse.json({ error: 'Design not found' }, { status: 404 });
  }

  try {
    const hydrated = await hydrateBrandDesign(supabase, design);
    return NextResponse.json(hydrated);
  } catch (err) {
    console.error('Hydration error:', err instanceof Error ? err.message : 'unknown');
    return NextResponse.json({ error: 'Failed to hydrate design' }, { status: 500 });
  }
}

/**
 * PATCH /api/brand/designs/[id] — update a design
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  if (!isValidUUID(id)) return NextResponse.json({ error: 'Invalid design ID' }, { status: 400 });

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const rateLimit = checkApiLimit(user.id);
  if (!rateLimit.success) {
    return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429, headers: getRateLimitHeaders(rateLimit) });
  }

  try {
    const body = await request.json();
    const parsed = updateBrandDesignSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Validation error', details: parsed.error.flatten() }, { status: 400 });
    }
    const { data, error } = await supabase
      .from('brand_designs')
      .update(parsed.data)
      .eq('id', id)
      .is('deleted_at', null)
      .select()
      .single();
    if (error || !data) {
      return NextResponse.json({ error: 'Design not found or update failed' }, { status: 404 });
    }
    return NextResponse.json(data, { headers: getRateLimitHeaders(rateLimit) });
  } catch (error) {
    console.error('API error:', error instanceof Error ? error.message : 'unknown');
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * DELETE /api/brand/designs/[id] — soft delete
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  if (!isValidUUID(id)) return NextResponse.json({ error: 'Invalid design ID' }, { status: 400 });

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { error } = await supabase
    .from('brand_designs')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id);

  if (error) return NextResponse.json({ error: 'Failed to delete design' }, { status: 500 });
  return new NextResponse(null, { status: 204 });
}
