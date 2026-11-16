import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { resolveActiveOrgId } from '@/lib/org/active-org';
import { generateApiKey } from '@/lib/api-keys';
import { checkApiLimit, getRateLimitHeaders } from '@/lib/security/rate-limiter';

const MAX_ACTIVE_KEYS = 10;

const createKeySchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(60, 'Name must be at most 60 characters'),
});

/**
 * GET /api/api-keys — list the caller's keys (never returns the key itself).
 */
export async function GET() {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data, error } = await supabase
    .from('api_keys')
    .select('id, name, key_prefix, org_id, created_at, last_used_at, revoked_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (error) return NextResponse.json({ error: 'Failed to load keys' }, { status: 500 });
  return NextResponse.json({ data });
}

/**
 * POST /api/api-keys — create a key bound to the caller + their active org.
 * Returns the plaintext key once.
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const rateLimit = checkApiLimit(user.id);
  if (!rateLimit.success) {
    return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429, headers: getRateLimitHeaders(rateLimit) });
  }

  const parsed = createKeySchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: 'Validation error', details: parsed.error.flatten() }, { status: 400 });
  }

  const { count } = await supabase
    .from('api_keys')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .is('revoked_at', null);
  if ((count ?? 0) >= MAX_ACTIVE_KEYS) {
    return NextResponse.json(
      { error: `You can have at most ${MAX_ACTIVE_KEYS} active keys. Revoke one first.` },
      { status: 400 }
    );
  }

  const { orgId } = await resolveActiveOrgId(supabase, user.id);
  const { key, prefix, hash } = generateApiKey();

  const { data, error } = await supabase
    .from('api_keys')
    .insert({ user_id: user.id, org_id: orgId, name: parsed.data.name, key_prefix: prefix, key_hash: hash })
    .select('id, name, key_prefix, org_id, created_at, last_used_at, revoked_at')
    .single();

  if (error || !data) {
    console.error('Failed to create API key:', error?.message);
    return NextResponse.json({ error: 'Failed to create key' }, { status: 500 });
  }

  return NextResponse.json({ ...data, key }, { status: 201 });
}
