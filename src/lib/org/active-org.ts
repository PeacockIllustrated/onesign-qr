import type { SupabaseClient } from '@supabase/supabase-js';
import type { MemberRole } from '@/types/organization';

/**
 * Active-org session primitives. The active-org cookie stores the UUID of the
 * organization whose data the logged-in user is currently operating on. It is
 * always revalidated against organization_members on each request — the cookie
 * is a hint, not an authority. Role changes (including revocation) therefore
 * take effect on the next request, not the next session.
 *
 * Used by Phase 0.C middleware + route handlers. Safe to land before Phase
 * 0.B data exists because every function degrades gracefully on an empty
 * organization_members table.
 */

export const ACTIVE_ORG_COOKIE = 'oneSignActiveOrg';

export const ACTIVE_ORG_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: true,
  sameSite: 'lax' as const,
  path: '/',
  maxAge: 60 * 60 * 24 * 365,
};

export interface ActiveOrgContext {
  userId: string;
  orgId: string;
  role: MemberRole;
}

interface MembershipRow {
  org_id: string;
  role: MemberRole;
  organizations:
    | { slug: string | null; deleted_at: string | null }
    | { slug: string | null; deleted_at: string | null }[]
    | null;
}

function unwrapOrg(
  org: MembershipRow['organizations']
): { slug: string | null; deleted_at: string | null } | null {
  if (!org) return null;
  return Array.isArray(org) ? org[0] ?? null : org;
}

/**
 * Looks up the caller's membership in a specific org. Returns null if the
 * user is not a member, the org is soft-deleted, or the org does not exist.
 */
export async function lookupMembership(
  supabase: SupabaseClient,
  userId: string,
  orgId: string
): Promise<ActiveOrgContext | null> {
  if (!isUuid(orgId)) return null;

  const { data, error } = await supabase
    .from('organization_members')
    .select('org_id, role, organizations!inner(slug, deleted_at)')
    .eq('user_id', userId)
    .eq('org_id', orgId)
    .maybeSingle<MembershipRow>();

  if (error || !data) return null;
  if (unwrapOrg(data.organizations)?.deleted_at) return null;

  return { userId, orgId: data.org_id, role: data.role };
}

/**
 * Returns the caller's first available org, preferring one they own, then
 * admin, then member. Used as the fallback when the active-org cookie points
 * at an org the user has been removed from.
 */
export async function firstOrgForUser(
  supabase: SupabaseClient,
  userId: string
): Promise<ActiveOrgContext | null> {
  const { data, error } = await supabase
    .from('organization_members')
    .select('org_id, role, organizations!inner(slug, deleted_at)')
    .eq('user_id', userId);

  if (error || !data) return null;

  const live = (data as unknown as MembershipRow[]).filter(
    (row) => !unwrapOrg(row.organizations)?.deleted_at
  );
  if (live.length === 0) return null;

  const rank: Record<MemberRole, number> = { owner: 0, admin: 1, member: 2 };
  live.sort((a, b) => rank[a.role] - rank[b.role]);
  return { userId, orgId: live[0].org_id, role: live[0].role };
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
    value
  );
}
