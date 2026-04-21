import Link from 'next/link';
import { Building2 } from 'lucide-react';
import { createAdminClient } from '@/lib/supabase/admin';

export default async function OrgsListPage() {
  const admin = createAdminClient();
  const { data: orgs } = await admin
    .from('organizations')
    .select('id, name, slug, plan, created_at, deleted_at')
    .order('created_at', { ascending: false })
    .limit(200);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-50">Organisations</h1>
        <p className="text-sm text-zinc-400 mt-1">
          {orgs?.length ?? 0} orgs shown
          {orgs && orgs.length === 200 ? ' (most recent)' : ''}
        </p>
      </div>

      <div className="rounded-xl border border-zinc-800 bg-zinc-900 divide-y divide-zinc-800 overflow-hidden">
        {(orgs ?? []).map((o) => (
          <Link
            key={o.id}
            href={`/admin/orgs/${o.id}`}
            className="flex items-center justify-between gap-4 p-4 hover:bg-zinc-800/60 transition-colors group"
          >
            <div className="flex items-center gap-3 min-w-0">
              <span className="flex items-center justify-center h-9 w-9 rounded-lg bg-zinc-800 text-lynx-400 border border-zinc-700 shrink-0">
                <Building2 className="h-4 w-4" />
              </span>
              <div className="min-w-0">
                <div className="text-sm font-medium text-zinc-50 truncate group-hover:text-lynx-400 transition-colors">
                  {o.name}
                </div>
                <div className="text-xs text-zinc-500 mt-0.5 flex items-center gap-2">
                  <span className="font-mono">{o.slug}</span>
                  <span className="text-zinc-700">·</span>
                  <span className="uppercase tracking-wider">{o.plan}</span>
                  {o.deleted_at && (
                    <>
                      <span className="text-zinc-700">·</span>
                      <span className="text-destructive">deleted</span>
                    </>
                  )}
                </div>
              </div>
            </div>
            <div className="text-xs text-zinc-500 tabular-nums shrink-0">
              {new Date(o.created_at).toLocaleDateString('en-GB')}
            </div>
          </Link>
        ))}
      </div>

      {orgs && orgs.length === 200 && (
        <p className="mt-4 text-xs text-zinc-500">
          Showing the most recent 200. Pagination pending.
        </p>
      )}
    </div>
  );
}
