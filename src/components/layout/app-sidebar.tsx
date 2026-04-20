'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Plus, Link2, Menu, X, Users } from 'lucide-react';
import { SignOutButton } from '@/components/auth/sign-out-button';
import { OneSignIcon, OneSignWordmark } from '@/components/ui';
import { OrgSwitcher } from '@/components/org/org-switcher';
import { cn } from '@/lib/utils';

const NAV_ITEMS = [
  { href: '/app', icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/app/new', icon: Plus, label: 'Create QR' },
  { href: '/app/bio', icon: Link2, label: 'Bio Pages' },
  { href: '/app/settings/team', icon: Users, label: 'Team' },
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
      <div className="h-16 flex items-center px-5 border-b border-border">
        <Link href="/app" className="flex items-center" onClick={closeSidebar}>
          <OneSignWordmark variant="black" height={22} />
        </Link>
      </div>

      {/* Organisation Switcher */}
      <div className="px-3 py-2">
        <OrgSwitcher />
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {NAV_ITEMS.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            onClick={closeSidebar}
            className={cn(
              'flex items-center gap-3 px-3 py-2.5 text-sm rounded-lg transition-colors',
              pathname === item.href
                ? 'bg-foreground text-background font-medium'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted'
            )}
          >
            <item.icon className="h-[18px] w-[18px]" />
            {item.label}
          </Link>
        ))}
      </nav>

      {/* User section */}
      <div className="p-4 border-t border-border">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-8 h-8 rounded-full bg-foreground text-background flex items-center justify-center text-xs font-semibold">
            {userEmail.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm truncate">{userEmail}</p>
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
          className="flex items-center justify-center h-10 w-10 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          aria-label="Open navigation"
        >
          <Menu className="h-5 w-5" />
        </button>
        <Link href="/app" className="flex items-center ml-3">
          <OneSignWordmark variant="black" height={18} />
        </Link>
      </div>

      {/* Mobile sidebar overlay */}
      {open && (
        <div className="md:hidden fixed inset-0 z-40">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={closeSidebar}
            aria-hidden="true"
          />
          {/* Drawer */}
          <aside className="absolute inset-y-0 left-0 w-72 bg-card border-r border-border flex flex-col shadow-xl">
            {/* Close button */}
            <button
              type="button"
              onClick={closeSidebar}
              className="absolute top-4 right-4 flex items-center justify-center h-8 w-8 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
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
        <div className="flex-1 overflow-auto bg-muted/30">
          {children}
        </div>
      </main>
    </div>
  );
}
