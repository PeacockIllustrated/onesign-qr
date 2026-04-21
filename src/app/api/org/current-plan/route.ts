import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { checkApiLimit, getRateLimitHeaders } from '@/lib/security/rate-limiter';
import { getActiveOrgPlan } from '@/lib/org/get-active-org-plan';

/**
 * GET /api/org/current-plan
 * Returns the plan ('free' | 'pro') of the authenticated user's active org.
 * Used by client components that need to render Pro gates.
 */
export async function GET() {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const rateLimit = checkApiLimit(user.id);
  if (!rateLimit.success) {
    return NextResponse.json(
      { error: 'Rate limit exceeded' },
      { status: 429, headers: getRateLimitHeaders(rateLimit) }
    );
  }

  const plan = await getActiveOrgPlan(supabase, user.id);
  return NextResponse.json({ plan }, { headers: getRateLimitHeaders(rateLimit) });
}
