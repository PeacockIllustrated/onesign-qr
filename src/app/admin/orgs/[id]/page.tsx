import Link from 'next/link';
import { createAdminClient } from '@/lib/supabase/admin';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { logAdminAction } from '@/lib/admin/audit';

interface Props {
  params: Promise<{ id: string }>;
}

export default async function OrgDetailPage({ params }: Props) {
  const { id } = await params;
  const admin = createAdminClient();

  const { data: org } = await admin
    .from('organizations')
    .select('id, name, slug, plan, phone, website, created_at, deleted_at')
    .eq('id', id)
    .single();

  if (!org) notFound();

  const [{ data: members }, { data: pages }, { data: qrs }] = await Promise.all(
    [
      admin
        .from('organization_members')
        .select('user_id, role, joined_at')
        .eq('org_id', id),
      admin
        .from('bio_link_pages')
        .select('id, slug, title, is_active, deleted_at, created_at')
        .eq('org_id', id)
        .order('created_at', { ascending: false })
        .limit(50),
      admin
        .from('qr_codes')
        .select('id, slug, name, mode, is_active, created_at')
        .eq('org_id', id)
        .order('created_at', { ascending: false })
        .limit(50),
    ]
  );

  // Audit this view.
  const server = await createClient();
  const {
    data: { user },
  } = await server.auth.getUser();
  if (user) {
    await logAdminAction({
      actorUserId: user.id,
      action: 'admin.view_org',
      targetType: 'organization',
      targetId: id,
    });
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold">{org.name}</h1>
        <p className="text-sm text-gray-500">
          {org.slug} · {org.plan}
          {org.deleted_at ? ' · deleted' : ''}
        </p>
      </div>

      <Link
        href={`/admin/orgs/${id}/preview`}
        className="inline-block bg-black text-white px-4 py-2 rounded text-sm"
      >
        View as (read-only preview)
      </Link>

      <section>
        <h2 className="text-lg font-semibold mb-2">
          Members ({(members ?? []).length})
        </h2>
        <ul className="bg-white border rounded divide-y">
          {(members ?? []).map((m) => (
            <li key={m.user_id} className="p-3 text-sm flex justify-between">
              <Link
                href={`/admin/users/${m.user_id}`}
                className="font-mono text-xs text-blue-700 hover:underline"
              >
                {m.user_id}
              </Link>
              <span className="text-xs text-gray-500">{m.role}</span>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h2 className="text-lg font-semibold mb-2">
          Bio pages ({(pages ?? []).length})
        </h2>
        <ul className="bg-white border rounded divide-y">
          {(pages ?? []).map((p) => (
            <li key={p.id} className="p-3 text-sm flex justify-between">
              <span>
                {p.title}
                <span className="ml-2 text-xs text-gray-500">/p/{p.slug}</span>
              </span>
              <span className="text-xs text-gray-500">
                {p.is_active ? 'active' : 'draft'}
                {p.deleted_at ? ' · deleted' : ''}
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h2 className="text-lg font-semibold mb-2">
          QR codes ({(qrs ?? []).length})
        </h2>
        <ul className="bg-white border rounded divide-y">
          {(qrs ?? []).map((q) => (
            <li key={q.id} className="p-3 text-sm flex justify-between">
              <span>
                {q.name}
                <span className="ml-2 text-xs text-gray-500">/r/{q.slug}</span>
              </span>
              <span className="text-xs text-gray-500">
                {q.mode} · {q.is_active ? 'active' : 'disabled'}
              </span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
