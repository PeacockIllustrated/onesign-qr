import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Returns the org_id of the one organisation the user belongs to.
 *
 * Phase 0.B invariant: every user belongs to exactly one organisation (their
 * personal org, auto-created by the Postgres trigger on auth.users insert or
 * by the backfill migration). Calling this on a user without any membership
 * is a bug — we throw rather than return null so callers get a clear signal.
 *
 * Phase 0.C will replace this with an active-org lookup once users can
 * belong to multiple orgs via the invite flow.
 */
export async function getPersonalOrgId(
  client: SupabaseClient,
  userId: string
): Promise<string> {
  const { data, error } = await client
    .from('organization_members')
    .select('org_id')
    .eq('user_id', userId)
    .single();

  if (error) {
    if ((error as { code?: string }).code === 'PGRST116') {
      throw new Error(
        `No organisation found for user ${userId}. ` +
          `Expected a personal org to exist — signup trigger may have failed.`
      );
    }
    throw new Error(
      `Failed to look up organisation for user ${userId}: ${(error as { message?: string }).message ?? 'unknown error'}`
    );
  }

  if (!data) {
    throw new Error(
      `No organisation found for user ${userId}. ` +
        `Expected a personal org to exist — signup trigger may have failed.`
    );
  }

  return data.org_id;
}
