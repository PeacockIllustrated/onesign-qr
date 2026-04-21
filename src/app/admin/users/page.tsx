import Link from 'next/link';
import { Mail } from 'lucide-react';
import { createAdminClient } from '@/lib/supabase/admin';

export default async function UsersListPage() {
  const admin = createAdminClient();
  const { data } = await admin.auth.admin.listUsers({
    page: 1,
    perPage: 100,
  });

  const users = data?.users ?? [];

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-50">Users</h1>
        <p className="text-sm text-zinc-400 mt-1">
          {users.length} users shown{users.length === 100 ? ' (first page)' : ''}
        </p>
      </div>

      <div className="rounded-xl border border-zinc-800 bg-zinc-900 divide-y divide-zinc-800 overflow-hidden">
        {users.map((u) => (
          <Link
            key={u.id}
            href={`/admin/users/${u.id}`}
            className="flex items-center justify-between gap-4 p-4 hover:bg-zinc-800/60 transition-colors group"
          >
            <div className="flex items-center gap-3 min-w-0">
              <span className="flex items-center justify-center h-9 w-9 rounded-lg bg-lynx-500/15 text-lynx-400 border border-lynx-400/30 shrink-0">
                <Mail className="h-4 w-4" />
              </span>
              <div className="min-w-0">
                <div className="text-sm font-medium text-zinc-50 truncate group-hover:text-lynx-400 transition-colors">
                  {u.email ?? '(no email)'}
                </div>
                <div className="text-xs text-zinc-500 font-mono truncate mt-0.5">
                  {u.id}
                </div>
              </div>
            </div>
            <div className="text-xs text-zinc-500 tabular-nums shrink-0">
              {u.created_at
                ? new Date(u.created_at).toLocaleDateString('en-GB')
                : ''}
            </div>
          </Link>
        ))}
      </div>

      {users.length === 100 && (
        <p className="mt-4 text-xs text-zinc-500">
          Showing the first 100. Pagination pending.
        </p>
      )}
    </div>
  );
}
