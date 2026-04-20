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
    console.error(
      `[isPlatformAdmin] lookup FAILED for userId=${userId}. ` +
      `This usually means SUPABASE_SERVICE_ROLE_KEY is missing or wrong in the env. Error:`,
      error
    );
    return false;
  }
  if (data === null) {
    console.error(
      `[isPlatformAdmin] no platform_admins row for userId=${userId}. ` +
      `If you expected to be an admin, confirm platform_admins.user_id matches this id.`
    );
  }
  return data !== null;
}
