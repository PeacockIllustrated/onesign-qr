import { createAdminClient } from '@/lib/supabase/admin';
import type { AuditLogRecord } from '@/types/platform-admin';

export default async function AuditLogPage() {
  const admin = createAdminClient();

  const { data: rows } = await admin
    .from('platform_audit_log')
    .select('id, actor_user_id, action, target_type, target_id, metadata, created_at')
    .order('created_at', { ascending: false })
    .limit(200);

  // Enrich with actor emails.
  const actorIds = Array.from(
    new Set((rows ?? []).map((r: AuditLogRecord) => r.actor_user_id))
  );
  const idToEmail = new Map<string, string>();
  await Promise.all(
    actorIds.map(async (uid) => {
      try {
        const { data } = await admin.auth.admin.getUserById(uid);
        if (data?.user?.email) idToEmail.set(uid, data.user.email);
      } catch {
        // Fall back to showing the uid.
      }
    })
  );

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-50">Audit log</h1>
        <p className="text-sm text-zinc-400 mt-1">
          Most recent {rows?.length ?? 0} entries, newest first.
        </p>
      </div>

      <div className="rounded-xl border border-zinc-800 bg-zinc-900 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs uppercase tracking-widest text-zinc-500 border-b border-zinc-800">
              <th className="p-3 font-semibold">When</th>
              <th className="p-3 font-semibold">Actor</th>
              <th className="p-3 font-semibold">Action</th>
              <th className="p-3 font-semibold">Target</th>
              <th className="p-3 font-semibold">Metadata</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800">
            {(rows ?? []).map((r: AuditLogRecord) => (
              <tr key={r.id} className="hover:bg-zinc-800/40 transition-colors">
                <td className="p-3 text-xs text-zinc-500 tabular-nums whitespace-nowrap">
                  {new Date(r.created_at).toLocaleString('en-GB')}
                </td>
                <td className="p-3 text-xs text-zinc-300 truncate max-w-[200px]">
                  {idToEmail.get(r.actor_user_id) ?? r.actor_user_id}
                </td>
                <td className="p-3">
                  <span className="inline-block font-mono text-xs bg-zinc-800 text-lynx-400 rounded px-2 py-0.5">
                    {r.action}
                  </span>
                </td>
                <td className="p-3 text-xs text-zinc-300">
                  {r.target_type ? (
                    <span>
                      {r.target_type}{' '}
                      <span className="text-zinc-500 font-mono">{r.target_id}</span>
                    </span>
                  ) : (
                    <span className="text-zinc-700">—</span>
                  )}
                </td>
                <td className="p-3 text-xs font-mono text-zinc-500 max-w-[280px] truncate">
                  {r.metadata ? JSON.stringify(r.metadata) : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
