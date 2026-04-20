import { cookies } from 'next/headers';
import type { SupabaseClient } from '@supabase/supabase-js';

export const ACTIVE_ORG_COOKIE = 'lynx_active_org';
const COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 30; // 30 days

export interface ResolveResult {
  orgId: string;
  /** true if the cookie was absent/invalid and we just wrote a fresh value. */
  wasReset: boolean;
}

/**
 * Returns the active org for the current request.
 *
 * - If the cookie is set AND the user is still a member → return that org.
 * - Otherwise → return the user's first membership (their personal org, in
 *   the Phase 0.C.1 world where everyone has exactly one org) AND write
 *   that value back into the cookie so subsequent requests are stable.
 *
 * Throws if the user has no memberships — this is a bug (the signup trigger
 * should have created a personal org).
 */
export async function resolveActiveOrgId(
  client: SupabaseClient,
  userId: string
): Promise<ResolveResult> {
  const { data: memberships, error } = await client
    .from('organization_members')
    .select('org_id')
    .eq('user_id', userId);

  if (error) {
    throw new Error(
      `Failed to list memberships for user ${userId}: ${error.message}`
    );
  }
  if (!memberships || memberships.length === 0) {
    throw new Error(
      `No organisation found for user ${userId}. Signup trigger may have failed.`
    );
  }

  const membershipIds = memberships.map((m) => m.org_id as string);
  const cookieStore = await cookies();
  const cookieOrg = cookieStore.get(ACTIVE_ORG_COOKIE)?.value;

  if (cookieOrg && membershipIds.includes(cookieOrg)) {
    return { orgId: cookieOrg, wasReset: false };
  }

  // Cookie missing or stale — reset to first membership.
  const fresh = membershipIds[0];
  cookieStore.set(ACTIVE_ORG_COOKIE, fresh, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: COOKIE_MAX_AGE_SECONDS,
    path: '/',
  });
  return { orgId: fresh, wasReset: true };
}

/**
 * Returns true if the target org is one of the user's memberships.
 * Used by /api/org/switch to validate the requested org before setting the
 * cookie.
 */
export async function isValidOrgForUser(
  client: SupabaseClient,
  userId: string,
  targetOrgId: string
): Promise<boolean> {
  const { data: memberships, error } = await client
    .from('organization_members')
    .select('org_id')
    .eq('user_id', userId);

  if (error || !memberships) return false;
  return memberships.some((m) => (m.org_id as string) === targetOrgId);
}

/**
 * Writes the active-org cookie. Assumes the caller has already validated
 * membership via isValidOrgForUser.
 */
export async function setActiveOrgCookie(orgId: string): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(ACTIVE_ORG_COOKIE, orgId, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: COOKIE_MAX_AGE_SECONDS,
    path: '/',
  });
}

/**
 * Clears the active-org cookie. Called on logout.
 */
export async function clearActiveOrgCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(ACTIVE_ORG_COOKIE);
}
