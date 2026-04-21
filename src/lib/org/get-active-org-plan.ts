import type { SupabaseClient } from '@supabase/supabase-js';
import type { OrganizationPlan } from '@/types/organization';
import { resolveActiveOrgId } from '@/lib/org/active-org';

/**
 * Returns the plan ('free' | 'pro') of the user's active organization.
 *
 * Falls back to 'free' on any error — callers treat it as the safe/default
 * tier. Pro features must be positively opted into; a lookup failure never
 * grants Pro.
 */
export async function getActiveOrgPlan(
  client: SupabaseClient,
  userId: string
): Promise<OrganizationPlan> {
  try {
    const { orgId } = await resolveActiveOrgId(client, userId);

    const { data, error } = await client
      .from('organizations')
      .select('plan')
      .eq('id', orgId)
      .single();

    if (error || !data) {
      return 'free';
    }

    return (data.plan as OrganizationPlan) ?? 'free';
  } catch {
    return 'free';
  }
}
