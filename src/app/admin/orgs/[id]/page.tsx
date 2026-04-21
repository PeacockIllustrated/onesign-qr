import Link from 'next/link';
import { Eye } from 'lucide-react';
import { createAdminClient } from '@/lib/supabase/admin';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { logAdminAction } from '@/lib/admin/audit';
import { Button } from '@/components/ui';

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
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-50">
            {org.name}
          </h1>
          <p className="text-sm text-zinc-400 mt-1 flex items-center gap-2">
            <span className="font-mono">{org.slug}</span>
            <span className="text-zinc-700">·</span>
            <span className="uppercase tracking-wider">{org.plan}</span>
            {org.deleted_at && (
              <>
                <span className="text-zinc-700">·</span>
                <span className="text-destructive">deleted</span>
              </>
            )}
          </p>
        </div>
        <Link href={`/admin/orgs/${id}/preview`}>
          <Button className="rounded-lg">
            <Eye className="h-4 w-4 mr-2" />
            View as (read-only)
          </Button>
        </Link>
      </div>

      <AdminListSection title={`Members (${(members ?? []).length})`}>
        {(members ?? []).map((m) => (
          <li key={m.user_id} className="p-3 text-sm flex justify-between items-center gap-3">
            <Link
              href={`/admin/users/${m.user_id}`}
              className="font-mono text-xs text-lynx-400 hover:text-lynx-300 transition-colors truncate"
            >
              {m.user_id}
            </Link>
            <span className="text-xs text-zinc-500 capitalize shrink-0">{m.role}</span>
          </li>
        ))}
      </AdminListSection>

      <AdminListSection title={`Bio pages (${(pages ?? []).length})`}>
        {(pages ?? []).map((p) => (
          <li key={p.id} className="p-3 text-sm flex justify-between items-center gap-3">
            <span className="text-zinc-100 truncate">
              {p.title}
              <span className="ml-2 text-xs text-zinc-500 font-mono">/p/{p.slug}</span>
            </span>
            <span className="text-xs text-zinc-500 shrink-0">
              {p.is_active ? 'active' : 'draft'}
              {p.deleted_at ? ' · deleted' : ''}
            </span>
          </li>
        ))}
      </AdminListSection>

      <AdminListSection title={`QR codes (${(qrs ?? []).length})`}>
        {(qrs ?? []).map((q) => (
          <li key={q.id} className="p-3 text-sm flex justify-between items-center gap-3">
            <span className="text-zinc-100 truncate">
              {q.name}
              <span className="ml-2 text-xs text-zinc-500 font-mono">/r/{q.slug}</span>
            </span>
            <span className="text-xs text-zinc-500 shrink-0">
              {q.mode} · {q.is_active ? 'active' : 'disabled'}
            </span>
          </li>
        ))}
      </AdminListSection>
    </div>
  );
}

function AdminListSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <h2 className="text-sm font-semibold text-zinc-500 uppercase tracking-widest mb-3">
        {title}
      </h2>
      <ul className="rounded-xl border border-zinc-800 bg-zinc-900 divide-y divide-zinc-800 overflow-hidden">
        {children}
      </ul>
    </section>
  );
}
