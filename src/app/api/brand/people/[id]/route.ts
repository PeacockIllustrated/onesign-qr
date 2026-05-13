import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { checkApiLimit, getRateLimitHeaders } from '@/lib/security/rate-limiter';
import { updateBrandPersonSchema } from '@/validations/brand';
import { isValidUUID } from '@/validations/qr';

/**
 * PATCH /api/brand/people/[id] — update a person
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  if (!isValidUUID(id)) return NextResponse.json({ error: 'Invalid person ID' }, { status: 400 });

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const rateLimit = checkApiLimit(user.id);
  if (!rateLimit.success) {
    return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429, headers: getRateLimitHeaders(rateLimit) });
  }

  try {
    const body = await request.json();
    const parsed = updateBrandPersonSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Validation error', details: parsed.error.flatten() }, { status: 400 });
    }
    const { data, error } = await supabase
      .from('brand_people')
      .update(parsed.data)
      .eq('id', id)
      .select()
      .single();
    if (error || !data) {
      return NextResponse.json({ error: 'Person not found or update failed' }, { status: 404 });
    }
    return NextResponse.json(data, { headers: getRateLimitHeaders(rateLimit) });
  } catch (error) {
    console.error('API error:', error instanceof Error ? error.message : 'unknown');
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * DELETE /api/brand/people/[id] — hard delete a person
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  if (!isValidUUID(id)) return NextResponse.json({ error: 'Invalid person ID' }, { status: 400 });

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data, error } = await supabase
    .from('brand_people')
    .delete()
    .eq('id', id)
    .select('id');

  if (error) {
    return NextResponse.json({ error: 'Failed to delete person', details: error.message }, { status: 500 });
  }
  if (!data || data.length === 0) {
    return NextResponse.json({ error: 'Person not found or you do not have permission' }, { status: 404 });
  }
  return new NextResponse(null, { status: 204 });
}
