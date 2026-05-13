import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { checkApiLimit, getRateLimitHeaders } from '@/lib/security/rate-limiter';
import { createBrandPersonSchema } from '@/validations/brand';
import { isValidUUID } from '@/validations/qr';

/**
 * POST /api/brand/profiles/[id]/people — add a person to a brand profile
 */
export async function POST(
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
    const parsed = createBrandPersonSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Validation error', details: parsed.error.flatten() }, { status: 400 });
    }

    // Determine sort_order = max + 1
    const { data: maxRow } = await supabase
      .from('brand_people')
      .select('sort_order')
      .eq('brand_profile_id', id)
      .order('sort_order', { ascending: false })
      .limit(1)
      .maybeSingle();
    const nextOrder = (maxRow?.sort_order ?? -1) + 1;

    const insert: Record<string, unknown> = {
      brand_profile_id: id,
      full_name: parsed.data.full_name,
      sort_order: nextOrder,
    };
    if (parsed.data.role) insert.role = parsed.data.role;
    if (parsed.data.pronouns) insert.pronouns = parsed.data.pronouns;
    if (parsed.data.email) insert.email = parsed.data.email;
    if (parsed.data.phone) insert.phone = parsed.data.phone;
    if (parsed.data.mobile) insert.mobile = parsed.data.mobile;
    if (parsed.data.address) insert.address = parsed.data.address;

    const { data, error } = await supabase
      .from('brand_people')
      .insert(insert)
      .select()
      .single();

    if (error) {
      console.error('Failed to add person:', error.message);
      return NextResponse.json({ error: 'Failed to add person' }, { status: 500 });
    }
    return NextResponse.json(data, { status: 201, headers: getRateLimitHeaders(rateLimit) });
  } catch (error) {
    console.error('API error:', error instanceof Error ? error.message : 'unknown');
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
