import Link from 'next/link';
import { QrCode, LayoutDashboard, Plus, Settings, LogOut } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { ToastProvider } from '@/components/ui';
import { SignOutButton } from '@/components/auth/sign-out-button';

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
      <div className="min-h-screen flex">
        {/* Sidebar */}
        <aside className="w-64 border-r border-border bg-card flex flex-col">
          {/* Logo */}
          <div className="h-16 flex items-center px-6 border-b border-border">
            <Link href="/app" className="flex items-center gap-2">
              <QrCode className="h-6 w-6" />
              <span className="font-semibold">onesign qr</span>
            </Link>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-1">
            <NavLink href="/app" icon={<LayoutDashboard className="h-4 w-4" />}>
              dashboard
            </NavLink>
            <NavLink href="/app/new" icon={<Plus className="h-4 w-4" />}>
              create qr
            </NavLink>
          </nav>

          {/* User section */}
          <div className="p-4 border-t border-border">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-8 h-8 rounded-sm bg-muted flex items-center justify-center text-sm font-medium">
                {user.email?.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{user.email}</p>
              </div>
            </div>
            <SignOutButton />
          </div>
        </aside>

        {/* Main content */}
        <main className="flex-1 flex flex-col">
          <div className="flex-1 overflow-auto">
            {children}
          </div>
        </main>
      </div>
    </ToastProvider>
  );
}

function NavLink({
  href,
  icon,
  children,
}: {
  href: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 px-3 py-2 text-sm rounded-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
    >
      {icon}
      {children}
    </Link>
  );
}
