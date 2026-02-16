'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { QrCode, LayoutDashboard, Plus, Link2, Menu, X } from 'lucide-react';
import { SignOutButton } from '@/components/auth/sign-out-button';
import { cn } from '@/lib/utils';

const NAV_ITEMS = [
  { href: '/app', icon: LayoutDashboard, label: 'dashboard' },
  { href: '/app/new', icon: Plus, label: 'create qr' },
  { href: '/app/bio', icon: Link2, label: 'bio page' },
] as const;

interface AppSidebarProps {
  userEmail: string;
  children: React.ReactNode;
}

export function AppSidebar({ userEmail, children }: AppSidebarProps) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  const closeSidebar = () => setOpen(false);

  const sidebarContent = (
    <>
      {/* Logo */}
      <div className="h-14 md:h-16 flex items-center px-6 border-b border-border">
        <Link href="/app" className="flex items-center gap-2" onClick={closeSidebar}>
          <QrCode className="h-6 w-6" />
          <span className="font-semibold">onesign qr</span>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1">
        {NAV_ITEMS.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            onClick={closeSidebar}
            className={cn(
              'flex items-center gap-3 px-3 py-2.5 text-sm rounded-sm transition-colors',
              pathname === item.href
                ? 'bg-muted text-foreground font-medium'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted'
            )}
          >
            <item.icon className="h-4 w-4" />
            {item.label}
          </Link>
        ))}
      </nav>

      {/* User section */}
      <div className="p-4 border-t border-border">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-8 h-8 rounded-sm bg-muted flex items-center justify-center text-sm font-medium">
            {userEmail.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{userEmail}</p>
          </div>
        </div>
        <SignOutButton />
      </div>
    </>
  );

  return (
    <div className="min-h-screen flex flex-col md:flex-row">
      {/* Mobile top bar */}
      <div className="md:hidden flex items-center h-14 px-4 border-b border-border bg-card shrink-0">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="flex items-center justify-center h-10 w-10 rounded-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          aria-label="Open navigation"
        >
          <Menu className="h-5 w-5" />
        </button>
        <Link href="/app" className="flex items-center gap-2 ml-3">
          <QrCode className="h-5 w-5" />
          <span className="font-semibold text-sm">onesign qr</span>
        </Link>
      </div>

      {/* Mobile sidebar overlay */}
      {open && (
        <div className="md:hidden fixed inset-0 z-40">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/50"
            onClick={closeSidebar}
            aria-hidden="true"
          />
          {/* Drawer */}
          <aside className="absolute inset-y-0 left-0 w-64 bg-card border-r border-border flex flex-col shadow-lg">
            {/* Close button */}
            <button
              type="button"
              onClick={closeSidebar}
              className="absolute top-4 right-4 flex items-center justify-center h-8 w-8 rounded-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              aria-label="Close navigation"
            >
              <X className="h-4 w-4" />
            </button>
            {sidebarContent}
          </aside>
        </div>
      )}

      {/* Desktop sidebar */}
      <aside className="hidden md:flex w-64 border-r border-border bg-card flex-col shrink-0">
        {sidebarContent}
      </aside>

      {/* Main content */}
      <main className="flex-1 flex flex-col min-w-0">
        <div className="flex-1 overflow-auto">
          {children}
        </div>
      </main>
    </div>
  );
}
