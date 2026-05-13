import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { checkApiLimit, getRateLimitHeaders } from '@/lib/security/rate-limiter';
import { createBrandDesignSchema } from '@/validations/brand';
import { getTemplate } from '@/lib/brand/templates';

/**
 * POST /api/brand/designs — create a new design (business card or signature)
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
    const parsed = createBrandDesignSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Validation error', details: parsed.error.flatten() }, { status: 400 });
    }

    const template = getTemplate(parsed.data.template_id);
    if (!template) {
      return NextResponse.json({ error: 'Unknown template' }, { status: 400 });
    }
    if (template.kind !== parsed.data.kind) {
      return NextResponse.json({ error: 'Template kind mismatch' }, { status: 400 });
    }

    const insert: Record<string, unknown> = {
      brand_profile_id: parsed.data.brand_profile_id,
      person_id: parsed.data.person_id ?? null,
      kind: parsed.data.kind,
      template_id: parsed.data.template_id,
      name: parsed.data.name,
      config: parsed.data.config ?? {},
    };

    const { data, error } = await supabase
      .from('brand_designs')
      .insert(insert)
      .select()
      .single();

    if (error) {
      console.error('Failed to create design:', error.message);
      return NextResponse.json({ error: 'Failed to create design' }, { status: 500 });
    }
    return NextResponse.json(data, { status: 201, headers: getRateLimitHeaders(rateLimit) });
  } catch (error) {
    console.error('API error:', error instanceof Error ? error.message : 'unknown');
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
