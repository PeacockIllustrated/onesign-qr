import { notFound } from 'next/navigation';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import { logAdminAction } from '@/lib/admin/audit';
import { ViewAsBanner } from '@/components/admin/view-as-banner';

interface Props {
  params: Promise<{ id: string }>;
}

export default async function OrgPreviewPage({ params }: Props) {
  const { id } = await params;
  const admin = createAdminClient();

  const { data: org } = await admin
    .from('organizations')
    .select('id, name')
    .eq('id', id)
    .single();
  if (!org) notFound();

  // Hoist page ids first so the submissions query has a clean IN filter.
  const { data: pagesRowsForIds } = await admin
    .from('bio_link_pages')
    .select('id')
    .eq('org_id', id);
  const pageIds = (pagesRowsForIds ?? []).map((p) => p.id as string);

  const [{ data: pages }, { data: qrs }, submissionsResp] = await Promise.all([
    admin
      .from('bio_link_pages')
      .select('id, slug, title, theme, is_active')
      .eq('org_id', id)
      .is('deleted_at', null)
      .order('created_at', { ascending: false }),
    admin
      .from('qr_codes')
      .select('id, slug, name, mode, destination_url, is_active')
      .eq('org_id', id)
      .is('deleted_at', null)
      .order('created_at', { ascending: false }),
    pageIds.length > 0
      ? admin
          .from('bio_form_submissions')
          .select('id, name, email, subject, is_read, submitted_at')
          .in('page_id', pageIds)
          .order('submitted_at', { ascending: false })
          .limit(50)
      : Promise.resolve({ data: [] as Array<{ id: string; name: string; email: string; subject: string | null; is_read: boolean; submitted_at: string }> }),
  ]);
  const submissions = submissionsResp.data;

  const server = await createClient();
  const {
    data: { user },
  } = await server.auth.getUser();
  if (user) {
    await logAdminAction({
      actorUserId: user.id,
      action: 'admin.view_as_preview',
      targetType: 'organization',
      targetId: id,
    });
  }

  return (
    <div className="-mx-6 -my-8">
      <ViewAsBanner orgName={org.name} orgId={id} />
      <div className="max-w-4xl mx-auto p-6 space-y-8">
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-50">
          {org.name} · Preview
        </h1>

        <section>
          <h2 className="text-sm font-semibold text-zinc-500 uppercase tracking-widest mb-3">
            Bio pages ({(pages ?? []).length})
          </h2>
          <ul className="rounded-xl border border-zinc-800 bg-zinc-900 divide-y divide-zinc-800 overflow-hidden">
            {(pages ?? []).map((p) => (
              <li
                key={p.id}
                className="p-3 text-sm flex justify-between items-center gap-3"
              >
                <span className="text-zinc-100 truncate">
                  {p.title}
                  <span className="ml-2 text-xs text-zinc-500 font-mono">/p/{p.slug}</span>
                </span>
                <span className="text-xs text-zinc-500 shrink-0">
                  {p.theme ?? '—'} · {p.is_active ? 'active' : 'draft'}
                </span>
              </li>
            ))}
          </ul>
        </section>

        <section>
          <h2 className="text-sm font-semibold text-zinc-500 uppercase tracking-widest mb-3">
            QR codes ({(qrs ?? []).length})
          </h2>
          <ul className="rounded-xl border border-zinc-800 bg-zinc-900 divide-y divide-zinc-800 overflow-hidden">
            {(qrs ?? []).map((q) => (
              <li key={q.id} className="p-3 text-sm">
                <div className="flex justify-between items-center gap-3">
                  <span className="text-zinc-100 truncate">
                    {q.name}
                    <span className="ml-2 text-xs text-zinc-500 font-mono">
                      /r/{q.slug}
                    </span>
                  </span>
                  <span className="text-xs text-zinc-500 shrink-0">
                    {q.mode} · {q.is_active ? 'active' : 'disabled'}
                  </span>
                </div>
                {q.destination_url && (
                  <div className="text-xs text-zinc-500 truncate mt-1 font-mono">
                    → {q.destination_url}
                  </div>
                )}
              </li>
            ))}
          </ul>
        </section>

        <section>
          <h2 className="text-sm font-semibold text-zinc-500 uppercase tracking-widest mb-3">
            Recent form submissions ({(submissions ?? []).length})
          </h2>
          <ul className="rounded-xl border border-zinc-800 bg-zinc-900 divide-y divide-zinc-800 overflow-hidden">
            {(submissions ?? []).map((s) => (
              <li
                key={s.id}
                className="p-3 text-sm flex justify-between items-center gap-3"
              >
                <span className="text-zinc-100 truncate">
                  <strong>{s.name}</strong>{' '}
                  <span className="text-zinc-400">· {s.email}</span>
                  {s.subject ? (
                    <span className="text-zinc-400"> · {s.subject}</span>
                  ) : (
                    ''
                  )}
                </span>
                <span className="text-xs text-zinc-500 tabular-nums shrink-0">
                  {new Date(s.submitted_at).toLocaleString('en-GB')}
                  {s.is_read ? '' : ' · unread'}
                </span>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}
