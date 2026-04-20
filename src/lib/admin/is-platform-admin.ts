import { createAdminClient } from '@/lib/supabase/admin';

/**
 * Returns true if the user has a platform_admins row.
 *
 * Uses the admin (service-role) Supabase client so the check bypasses RLS
 * on platform_admins — needed because the check happens in middleware and
 * admin routes before the user's auth context is relevant for authz.
 */
export async function isPlatformAdmin(userId: string): Promise<boolean> {
  if (!userId) return false;

  const admin = createAdminClient();
  const { data, error } = await admin
    .from('platform_admins')
    .select('user_id')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    console.error('[isPlatformAdmin] lookup failed', error);
    return false;
  }
  return data !== null;
}
