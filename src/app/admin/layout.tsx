import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { isPlatformAdmin } from '@/lib/admin/is-platform-admin';
import { setAdminSession } from '@/lib/admin/admin-session';
import { AdminNav } from '@/components/admin/admin-nav';

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    console.error('[AdminLayout] no user — redirecting to /auth/login');
    redirect('/auth/login?next=/admin');
  }

  // Defence in depth: middleware checked the admin session cookie; layout
  // checks platform_admins membership before rendering any admin content.
  const isAdmin = await isPlatformAdmin(user.id);
  if (!isAdmin) {
    console.error(
      `[AdminLayout] isPlatformAdmin returned false for user ${user.id} (${user.email ?? '?'}) — redirecting to /app. ` +
      `Check SUPABASE_SERVICE_ROLE_KEY in prod env, or confirm platform_admins.user_id matches ${user.id}.`
    );
    redirect('/app');
  }

  // Refresh the admin session cookie on activity.
  try {
    await setAdminSession(user.id);
  } catch (err) {
    console.error(
      `[AdminLayout] setAdminSession threw — likely ADMIN_SESSION_SECRET missing or <32 chars in prod env. Error:`,
      err
    );
    throw err;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminNav userEmail={user.email ?? ''} />
      <main className="max-w-6xl mx-auto px-6 py-8">{children}</main>
    </div>
  );
}
