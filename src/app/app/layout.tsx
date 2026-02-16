import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { ToastProvider } from '@/components/ui';
import { AppSidebar } from '@/components/layout/app-sidebar';

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/auth/login');
  }

  return (
    <ToastProvider>
      <AppSidebar userEmail={user.email ?? ''}>
        {children}
      </AppSidebar>
    </ToastProvider>
  );
}
