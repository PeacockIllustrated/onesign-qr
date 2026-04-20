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
  if (!user) redirect('/auth/login?next=/admin');

  // Defence in depth: middleware checked the admin session cookie; layout
  // checks platform_admins membership before rendering any admin content.
  const isAdmin = await isPlatformAdmin(user.id);
  if (!isAdmin) redirect('/app');

  // Refresh the admin session cookie on activity.
  await setAdminSession(user.id);

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminNav userEmail={user.email ?? ''} />
      <main className="max-w-6xl mx-auto px-6 py-8">{children}</main>
    </div>
  );
}
