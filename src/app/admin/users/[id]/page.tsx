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
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-50">{authUser.email}</h1>
        <p className="text-xs text-zinc-500 font-mono mt-1.5">{authUser.id}</p>
        <p className="text-xs text-zinc-500 mt-2 tabular-nums">
          Created:{' '}
          {authUser.created_at
            ? new Date(authUser.created_at).toLocaleString('en-GB')
            : '—'}
          {' · '}
          Last sign-in:{' '}
          {authUser.last_sign_in_at
            ? new Date(authUser.last_sign_in_at).toLocaleString('en-GB')
            : '—'}
        </p>
      </div>

      <section>
        <h2 className="text-sm font-semibold text-zinc-500 uppercase tracking-widest mb-3">
          Organisations ({rows.length})
        </h2>
        <ul className="rounded-xl border border-zinc-800 bg-zinc-900 divide-y divide-zinc-800 overflow-hidden">
          {rows.map((r) => {
            const org = Array.isArray(r.organizations)
              ? r.organizations[0]
              : r.organizations;
            if (!org) return null;
            return (
              <li
                key={r.org_id}
                className="p-3 text-sm flex justify-between items-center gap-3"
              >
                <Link
                  href={`/admin/orgs/${org.id}`}
                  className="text-lynx-400 hover:text-lynx-300 transition-colors truncate"
                >
                  {org.name}{' '}
                  <span className="text-zinc-500 font-mono text-xs">({org.slug})</span>
                </Link>
                <span className="text-xs text-zinc-500 capitalize shrink-0">{r.role}</span>
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}
