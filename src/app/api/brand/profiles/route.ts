import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { checkApiLimit, getRateLimitHeaders } from '@/lib/security/rate-limiter';
import { createBrandProfileSchema } from '@/validations/brand';
import { getPersonalOrgId } from '@/lib/org/get-personal-org';

/**
 * GET /api/brand/profiles — list profiles for the active org
 */
export async function GET(_request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const rateLimit = checkApiLimit(user.id);
  if (!rateLimit.success) {
    return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429, headers: getRateLimitHeaders(rateLimit) });
  }

  const { data, error } = await supabase
    .from('brand_profiles')
    .select('*')
    .is('deleted_at', null)
    .order('updated_at', { ascending: false });

  if (error) {
    console.error('Failed to list brand profiles:', error.message);
    return NextResponse.json({ error: 'Failed to list profiles' }, { status: 500 });
  }
  return NextResponse.json({ profiles: data ?? [] }, { headers: getRateLimitHeaders(rateLimit) });
}

/**
 * POST /api/brand/profiles — create a new brand profile in the active org
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const rateLimit = checkApiLimit(user.id);
  if (!rateLimit.success) {
    return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429, headers: getRateLimitHeaders(rateLimit) });
  }

  try {
    const body = await request.json();
    const parsed = createBrandProfileSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Validation error', details: parsed.error.flatten() }, { status: 400 });
    }

    const orgId = await getPersonalOrgId(supabase, user.id);
    const insert: Record<string, unknown> = {
      org_id: orgId,
      name: parsed.data.name,
    };
    if (parsed.data.tagline) insert.tagline = parsed.data.tagline;
    if (parsed.data.primary_color) insert.primary_color = parsed.data.primary_color;
    if (parsed.data.secondary_color) insert.secondary_color = parsed.data.secondary_color;
    if (parsed.data.accent_color) insert.accent_color = parsed.data.accent_color;
    if (parsed.data.font_heading) insert.font_heading = parsed.data.font_heading;
    if (parsed.data.font_body) insert.font_body = parsed.data.font_body;
    if (parsed.data.website) insert.website = parsed.data.website;

    const { data, error } = await supabase
      .from('brand_profiles')
      .insert(insert)
      .select()
      .single();

    if (error) {
      console.error('Failed to create brand profile:', error.message);
      return NextResponse.json({ error: 'Failed to create profile' }, { status: 500 });
    }
    return NextResponse.json(data, { status: 201, headers: getRateLimitHeaders(rateLimit) });
  } catch (error) {
    console.error('API error:', error instanceof Error ? error.message : 'unknown');
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
