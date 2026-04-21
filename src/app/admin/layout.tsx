import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { isPlatformAdmin } from '@/lib/admin/is-platform-admin';
import { AdminSidebar } from '@/components/admin/admin-sidebar';

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

  // NOTE: cookie refresh on render is not possible from a Server Component —
  // Next.js only allows cookie writes from Route Handlers and Server Actions.
  // The admin session cookie gets its 30-minute window from when POST
  // /api/admin/session issues it; it does not roll forward on activity in
  // this iteration.

  return (
    <AdminSidebar userEmail={user.email ?? ''}>
      <div className="max-w-6xl mx-auto px-6 py-8">{children}</div>
    </AdminSidebar>
  );
}
