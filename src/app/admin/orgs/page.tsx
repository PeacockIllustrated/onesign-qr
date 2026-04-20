import Link from 'next/link';
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
      <h1 className="text-2xl font-semibold mb-6">Organisations</h1>
      <div className="bg-white border rounded divide-y">
        {(orgs ?? []).map((o) => (
          <Link
            key={o.id}
            href={`/admin/orgs/${o.id}`}
            className="block p-4 hover:bg-gray-50 flex justify-between items-center"
          >
            <div>
              <div className="font-medium">{o.name}</div>
              <div className="text-xs text-gray-500">
                {o.slug} · {o.plan}
                {o.deleted_at ? ' · deleted' : ''}
              </div>
            </div>
            <div className="text-xs text-gray-400">
              {new Date(o.created_at).toLocaleDateString()}
            </div>
          </Link>
        ))}
      </div>
      {orgs && orgs.length === 200 && (
        <p className="mt-4 text-xs text-gray-500">
          Showing most recent 200. Pagination not yet implemented.
        </p>
      )}
    </div>
  );
}
