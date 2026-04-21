'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Plus, Link2, Menu, X, Users, ShoppingBag } from 'lucide-react';
import { SignOutButton } from '@/components/auth/sign-out-button';
import { OneSignWordmark } from '@/components/ui';
import { OrgSwitcher } from '@/components/org/org-switcher';
import { cn } from '@/lib/utils';

const NAV_ITEMS = [
  { href: '/app', icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/app/new', icon: Plus, label: 'Create QR' },
  { href: '/app/bio', icon: Link2, label: 'Bio Pages' },
  { href: '/app/settings/team', icon: Users, label: 'Team' },
  { href: '/app/shop', icon: ShoppingBag, label: 'Shop' },
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
      <div className="h-16 flex items-center px-5 border-b border-zinc-800">
        <Link href="/app" className="flex items-center" onClick={closeSidebar}>
          <OneSignWordmark variant="on-dark" height={26} />
        </Link>
      </div>

      {/* Organisation Switcher */}
      <div className="px-3 py-2">
        <OrgSwitcher />
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {NAV_ITEMS.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={closeSidebar}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 text-sm rounded-lg transition-colors',
                isActive
                  ? 'bg-lynx-500/15 text-lynx-400 font-medium border border-lynx-400/20'
                  : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/60 border border-transparent'
              )}
            >
              <item.icon className="h-[18px] w-[18px]" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* User section */}
      <div className="p-4 border-t border-zinc-800">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-8 h-8 rounded-full bg-lynx-500/20 text-lynx-400 border border-lynx-400/30 flex items-center justify-center text-xs font-semibold">
            {userEmail.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm text-zinc-200 truncate">{userEmail}</p>
          </div>
        </div>
        <SignOutButton />
      </div>
    </>
  );

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-zinc-950">
      {/* Mobile top bar */}
      <div className="md:hidden flex items-center h-14 px-4 border-b border-zinc-800 bg-zinc-900 shrink-0">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="flex items-center justify-center h-10 w-10 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition-colors"
          aria-label="Open navigation"
        >
          <Menu className="h-5 w-5" />
        </button>
        <Link href="/app" className="flex items-center ml-3">
          <OneSignWordmark variant="on-dark" height={22} />
        </Link>
      </div>

      {/* Mobile sidebar overlay */}
      {open && (
        <div className="md:hidden fixed inset-0 z-40">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={closeSidebar}
            aria-hidden="true"
          />
          {/* Drawer */}
          <aside className="absolute inset-y-0 left-0 w-72 bg-zinc-900 border-r border-zinc-800 flex flex-col shadow-2xl">
            {/* Close button */}
            <button
              type="button"
              onClick={closeSidebar}
              className="absolute top-4 right-4 flex items-center justify-center h-8 w-8 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition-colors"
              aria-label="Close navigation"
            >
              <X className="h-4 w-4" />
            </button>
            {sidebarContent}
          </aside>
        </div>
      )}

      {/* Desktop sidebar */}
      <aside className="hidden md:flex w-64 border-r border-zinc-800 bg-zinc-900 flex-col shrink-0">
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
