'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const LINKS = [
  { href: '/admin', label: 'Overview' },
  { href: '/admin/orgs', label: 'Organisations' },
  { href: '/admin/users', label: 'Users' },
  { href: '/admin/shop', label: 'Shop' },
  { href: '/admin/audit', label: 'Audit log' },
];

export function AdminNav({ userEmail }: { userEmail: string }) {
  const pathname = usePathname();

  async function signOutOfAdmin() {
    await fetch('/api/admin/session', {
      method: 'DELETE',
      credentials: 'same-origin',
    });
    window.location.href = '/app';
  }

  return (
    <nav className="bg-black text-white px-6 py-3 flex items-center justify-between">
      <div className="flex items-center gap-6">
        <span className="font-semibold">OneSign – Lynx · Admin</span>
        <ul className="flex items-center gap-4 text-sm">
          {LINKS.map((l) => {
            const active =
              pathname === l.href ||
              (l.href !== '/admin' && pathname.startsWith(l.href));
            return (
              <li key={l.href}>
                <Link
                  href={l.href}
                  className={
                    active ? 'text-white font-semibold' : 'text-gray-300 hover:text-white'
                  }
                >
                  {l.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
      <div className="flex items-center gap-3 text-xs text-gray-300">
        <span>{userEmail}</span>
        <button
          type="button"
          onClick={signOutOfAdmin}
          className="underline hover:text-white"
        >
          Exit admin
        </button>
      </div>
    </nav>
  );
}
