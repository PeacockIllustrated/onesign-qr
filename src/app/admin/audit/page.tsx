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
      <h1 className="text-2xl font-semibold mb-6">Audit log</h1>
      <div className="bg-white border rounded overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left text-xs uppercase text-gray-500">
            <tr>
              <th className="p-3">When</th>
              <th className="p-3">Actor</th>
              <th className="p-3">Action</th>
              <th className="p-3">Target</th>
              <th className="p-3">Metadata</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {(rows ?? []).map((r: AuditLogRecord) => (
              <tr key={r.id}>
                <td className="p-3 text-xs text-gray-500 whitespace-nowrap">
                  {new Date(r.created_at).toLocaleString()}
                </td>
                <td className="p-3 text-xs">
                  {idToEmail.get(r.actor_user_id) ?? r.actor_user_id}
                </td>
                <td className="p-3 font-mono text-xs">{r.action}</td>
                <td className="p-3 text-xs">
                  {r.target_type ? (
                    <span>
                      {r.target_type}{' '}
                      <span className="text-gray-400">{r.target_id}</span>
                    </span>
                  ) : (
                    '—'
                  )}
                </td>
                <td className="p-3 text-xs font-mono text-gray-500">
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
