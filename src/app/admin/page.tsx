import { createAdminClient } from '@/lib/supabase/admin';
import type { PlatformKpis } from '@/types/platform-admin';

async function fetchKpis(): Promise<PlatformKpis> {
  const admin = createAdminClient();

  async function count(table: string): Promise<number> {
    const { count } = await admin
      .from(table)
      .select('*', { count: 'exact', head: true });
    return count ?? 0;
  }

  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const [
    totalOrgs,
    totalUsersResp,
    totalBioPages,
    totalQrCodes,
    orgsThisWeekResp,
    formSubsResp,
  ] = await Promise.all([
    count('organizations'),
    admin.auth.admin.listUsers({ page: 1, perPage: 1 }).then((r) => {
      const userData = r.data as { total?: number; users?: unknown[] } | undefined;
      return {
        total: userData?.total ?? userData?.users?.length ?? 0,
      };
    }),
    count('bio_link_pages'),
    count('qr_codes'),
    admin
      .from('organizations')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', weekAgo)
      .then((r) => r.count ?? 0),
    admin
      .from('bio_form_submissions')
      .select('*', { count: 'exact', head: true })
      .gte('submitted_at', weekAgo)
      .then((r) => r.count ?? 0),
  ]);

  return {
    total_orgs: totalOrgs,
    total_users: totalUsersResp.total,
    orgs_created_this_week: orgsThisWeekResp,
    total_bio_pages: totalBioPages,
    total_qr_codes: totalQrCodes,
    form_submissions_last_7d: formSubsResp,
  };
}

export default async function AdminHomePage() {
  const kpis = await fetchKpis();

  const tiles: Array<{ label: string; value: number }> = [
    { label: 'Organisations', value: kpis.total_orgs },
    { label: 'Users', value: kpis.total_users },
    { label: 'Orgs created (7d)', value: kpis.orgs_created_this_week },
    { label: 'Bio pages', value: kpis.total_bio_pages },
    { label: 'QR codes', value: kpis.total_qr_codes },
    { label: 'Form submissions (7d)', value: kpis.form_submissions_last_7d },
  ];

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-50">Overview</h1>
        <p className="text-sm text-zinc-400 mt-1">
          Platform-wide metrics. Refreshed on each page load.
        </p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        {tiles.map((t) => (
          <div
            key={t.label}
            className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 hover:border-lynx-400/30 transition-colors"
          >
            <div className="text-xs text-zinc-500 uppercase tracking-widest font-medium">
              {t.label}
            </div>
            <div className="text-3xl font-semibold mt-2 tabular-nums text-zinc-50">
              {t.value.toLocaleString('en-GB')}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
