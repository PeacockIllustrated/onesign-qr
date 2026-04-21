'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Building2,
  Users,
  ShoppingBag,
  ClipboardList,
  Menu,
  X,
  LogOut,
  ShieldCheck,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface NavItem {
  href: string;
  icon: typeof LayoutDashboard;
  label: string;
  exact?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  { href: '/admin', icon: LayoutDashboard, label: 'Overview', exact: true },
  { href: '/admin/orgs', icon: Building2, label: 'Organisations' },
  { href: '/admin/users', icon: Users, label: 'Users' },
  { href: '/admin/shop', icon: ShoppingBag, label: 'Shop' },
  { href: '/admin/audit', icon: ClipboardList, label: 'Audit log' },
];

interface AdminSidebarProps {
  userEmail: string;
  children: React.ReactNode;
}

export function AdminSidebar({ userEmail, children }: AdminSidebarProps) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  const closeSidebar = () => setOpen(false);

  async function signOutOfAdmin() {
    await fetch('/api/admin/session', {
      method: 'DELETE',
      credentials: 'same-origin',
    });
    window.location.href = '/app';
  }

  const sidebarContent = (
    <>
      {/* Brand */}
      <div className="h-16 flex items-center gap-2.5 px-5 border-b border-zinc-800">
        <span className="flex items-center justify-center h-8 w-8 rounded-lg bg-lynx-500/15 border border-lynx-400/30 text-lynx-400">
          <ShieldCheck className="h-4 w-4" />
        </span>
        <div className="flex flex-col leading-tight">
          <span className="text-sm font-semibold text-zinc-50">Admin</span>
          <span className="text-[10px] uppercase tracking-widest text-zinc-500">
            OneSign · Lynx
          </span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {NAV_ITEMS.map((item) => {
          const isActive = item.exact
            ? pathname === item.href
            : pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={closeSidebar}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 text-sm rounded-lg transition-colors border',
                isActive
                  ? 'bg-lynx-500/15 text-lynx-400 font-medium border-lynx-400/20'
                  : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/60 border-transparent'
              )}
            >
              <item.icon className="h-[18px] w-[18px]" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* User section */}
      <div className="p-4 border-t border-zinc-800 space-y-3">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-lynx-500/20 text-lynx-400 border border-lynx-400/30 flex items-center justify-center text-xs font-semibold">
            {userEmail.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm text-zinc-200 truncate">{userEmail}</p>
            <p className="text-[10px] uppercase tracking-widest text-zinc-500">
              Platform admin
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={signOutOfAdmin}
          className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 text-sm rounded-lg border border-zinc-800 text-zinc-300 hover:text-zinc-50 hover:bg-zinc-800 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lynx-400 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-900"
        >
          <LogOut className="h-4 w-4" />
          Exit admin
        </button>
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
        <span className="ml-3 flex items-center gap-2 text-sm font-semibold text-zinc-50">
          <ShieldCheck className="h-4 w-4 text-lynx-400" />
          Admin
        </span>
      </div>

      {/* Mobile drawer */}
      {open && (
        <div className="md:hidden fixed inset-0 z-40">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={closeSidebar}
            aria-hidden="true"
          />
          <aside className="absolute inset-y-0 left-0 w-72 bg-zinc-900 border-r border-zinc-800 flex flex-col shadow-2xl">
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
        <div className="flex-1 overflow-auto">{children}</div>
      </main>
    </div>
  );
}
