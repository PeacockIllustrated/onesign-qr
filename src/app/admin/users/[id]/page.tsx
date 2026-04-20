import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import { logAdminAction } from '@/lib/admin/audit';

interface Props {
  params: Promise<{ id: string }>;
}

export default async function UserDetailPage({ params }: Props) {
  const { id } = await params;
  const admin = createAdminClient();

  const { data: userResp } = await admin.auth.admin.getUserById(id);
  const authUser = userResp?.user;
  if (!authUser) notFound();

  const { data: memberships } = await admin
    .from('organization_members')
    .select('org_id, role, joined_at, organizations!inner(id, name, slug)')
    .eq('user_id', id);

  const server = await createClient();
  const {
    data: { user },
  } = await server.auth.getUser();
  if (user) {
    await logAdminAction({
      actorUserId: user.id,
      action: 'admin.view_user',
      targetType: 'user',
      targetId: id,
    });
  }

  type Row = {
    org_id: string;
    role: string;
    joined_at: string;
    organizations:
      | { id: string; name: string; slug: string }
      | Array<{ id: string; name: string; slug: string }>;
  };
  const rows = (memberships ?? []) as unknown as Row[];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">{authUser.email}</h1>
        <p className="text-xs text-gray-500 font-mono mt-1">{authUser.id}</p>
        <p className="text-xs text-gray-500 mt-1">
          Created:{' '}
          {authUser.created_at
            ? new Date(authUser.created_at).toLocaleString()
            : '—'}
          {' · '}
          Last sign-in:{' '}
          {authUser.last_sign_in_at
            ? new Date(authUser.last_sign_in_at).toLocaleString()
            : '—'}
        </p>
      </div>

      <section>
        <h2 className="text-lg font-semibold mb-2">
          Organisations ({rows.length})
        </h2>
        <ul className="bg-white border rounded divide-y">
          {rows.map((r) => {
            const org = Array.isArray(r.organizations)
              ? r.organizations[0]
              : r.organizations;
            if (!org) return null;
            return (
              <li key={r.org_id} className="p-3 text-sm flex justify-between">
                <Link
                  href={`/admin/orgs/${org.id}`}
                  className="text-blue-700 hover:underline"
                >
                  {org.name} <span className="text-gray-500">({org.slug})</span>
                </Link>
                <span className="text-xs text-gray-500">{r.role}</span>
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}
