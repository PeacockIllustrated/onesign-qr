import Link from 'next/link';
import { Plus, ExternalLink, BarChart3, Activity, Hash, Link2, Eye } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { Button, Card, CardContent, Badge } from '@/components/ui';
import { formatNumber } from '@/lib/utils';
import { THEME_CONFIGS } from '@/lib/bio/theme-definitions';
import type { BioLinkTheme } from '@/types/bio';
import { QRListSection } from './qr-list-section';

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: qrCodes } = await supabase
    .from('qr_codes')
    .select('*, qr_styles(*)')
    .eq('owner_id', user!.id)
    .order('created_at', { ascending: false });

  const { data: bioPages } = await supabase
    .from('bio_link_pages')
    .select('*')
    .eq('owner_id', user!.id)
    .is('deleted_at', null)
    .order('is_active', { ascending: false })
    .order('created_at', { ascending: false });

  const totalScans = qrCodes?.reduce((sum, qr) => sum + (qr.total_scans || 0), 0) ?? 0;
  const activeCount = qrCodes?.filter(qr => qr.is_active).length ?? 0;
  const totalCodes = qrCodes?.length ?? 0;
  const totalBioViews = bioPages?.reduce((sum, p) => sum + (p.total_views || 0), 0) ?? 0;

  return (
    <div className="p-5 md:p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-50">Dashboard</h1>
          <p className="text-sm text-zinc-400 mt-1">
            Manage and track your Links
          </p>
        </div>
        <Link href="/app/new">
          <Button className="rounded-lg">
            <Plus className="h-4 w-4 mr-2" />
            Create Link
          </Button>
        </Link>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        <StatCard label="Total Scans" value={formatNumber(totalScans)} icon={<BarChart3 className="h-5 w-5" />} />
        <StatCard label="Active Codes" value={String(activeCount)} icon={<Activity className="h-5 w-5" />} />
        <StatCard label="Total Codes" value={String(totalCodes)} icon={<Hash className="h-5 w-5" />} />
        <StatCard label="Bio Views" value={formatNumber(totalBioViews)} icon={<Eye className="h-5 w-5" />} />
      </div>

      {/* Bio Pages Section */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-medium tracking-tight text-zinc-100">Bio Pages</h2>
          <Link href="/app/bio">
            <Button variant="outline" size="sm" className="rounded-lg">
              {bioPages && bioPages.length > 0 ? 'Manage' : (
                <><Plus className="h-4 w-4 mr-1.5" />Create Bio Page</>
              )}
            </Button>
          </Link>
        </div>
        {bioPages && bioPages.length > 0 ? (
          <div className="space-y-3">
            {bioPages.map((page) => (
              <BioPageCard key={page.id} page={page} />
            ))}
          </div>
        ) : (
          <Card className="rounded-xl">
            <CardContent className="p-8 text-center">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-zinc-800 text-lynx-400 mb-3">
                <Link2 className="h-6 w-6" />
              </div>
              <p className="text-sm text-zinc-400">No bio page yet. Create one to share all your links in one place.</p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Links Grid */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-medium tracking-tight text-zinc-100">Your Links</h2>
      </div>
      <QRListSection
        qrCodes={(qrCodes ?? []).map((qr: any) => ({
          id: qr.id,
          name: qr.name,
          mode: qr.mode,
          carrier: qr.carrier ?? 'qr',
          slug: qr.slug,
          destination_url: qr.destination_url,
          is_active: qr.is_active,
          total_scans: qr.total_scans ?? 0,
          created_at: qr.created_at,
        }))}
      />
    </div>
  );
}

function StatCard({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) {
  return (
    <Card className="rounded-xl">
      <CardContent className="p-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider">{label}</p>
            <p className="text-2xl font-semibold mt-1 text-zinc-50 tabular-nums">{value}</p>
          </div>
          <div className="h-10 w-10 rounded-lg bg-zinc-800 text-lynx-400 flex items-center justify-center">
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function BioPageCard({ page }: { page: any }) {
  const pageUrl = `${process.env.NEXT_PUBLIC_APP_URL || ''}/p/${page.slug}`;
  const themeConfig = THEME_CONFIGS[(page.theme as BioLinkTheme) ?? 'minimal'] ?? THEME_CONFIGS.minimal;

  return (
    <Card
      className="rounded-xl overflow-hidden hover:border-lynx-400/30 transition-colors"
      style={{ borderLeftWidth: 4, borderLeftColor: themeConfig.colors.accent }}
    >
      {/* Theme banner — mobile only */}
      <div
        className="flex sm:hidden items-center gap-2.5 px-4 py-2 border-b border-zinc-800"
        style={{ background: themeConfig.background.css }}
      >
        <div
          className="w-5 h-1.5 rounded-full shrink-0"
          style={{ backgroundColor: themeConfig.colors.buttonBg, opacity: 0.9 }}
        />
        <span className="text-xs font-medium" style={{ color: themeConfig.colors.text }}>
          {themeConfig.name}
        </span>
        {themeConfig.previewColors.map((color, i) => (
          <span
            key={i}
            className="inline-block h-2 w-2 rounded-full border border-white/30"
            style={{ backgroundColor: color }}
          />
        ))}
      </div>

      <CardContent className="p-4 sm:p-5">
        <div className="flex items-start sm:items-center justify-between gap-3 sm:gap-4">
          <div className="flex items-start sm:items-center gap-3 sm:gap-4 min-w-0">
            {/* Theme swatch — desktop only */}
            <div
              className="hidden sm:flex h-12 w-12 rounded-xl items-center justify-center shrink-0 ring-1 ring-inset ring-zinc-800"
              style={{ background: themeConfig.background.css }}
            >
              <div
                className="w-6 h-1.5 rounded-full"
                style={{ backgroundColor: themeConfig.colors.buttonBg, opacity: 0.9 }}
              />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="font-medium truncate text-zinc-50">{page.title}</h3>
                <Badge variant={page.is_active ? 'success' : 'secondary'} className="rounded-md shrink-0">
                  {page.is_active ? 'Active' : 'Inactive'}
                </Badge>
              </div>
              <div className="flex items-center gap-3 mt-1 text-zinc-400 flex-wrap">
                {/* Theme dots — desktop only */}
                <span className="hidden sm:flex items-center gap-1.5">
                  {themeConfig.previewColors.map((color, i) => (
                    <span
                      key={i}
                      className="inline-block h-2.5 w-2.5 rounded-full border border-zinc-700"
                      style={{ backgroundColor: color }}
                    />
                  ))}
                  <span className="text-xs">{themeConfig.name}</span>
                </span>
                <span className="flex items-center gap-1 text-xs">
                  <Eye className="h-3.5 w-3.5" />
                  {formatNumber(page.total_views)} views
                </span>
                <span className="font-mono text-xs text-zinc-500">/p/{page.slug}</span>
              </div>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 shrink-0">
            <Link href={`/app/bio/${page.id}`}>
              <Button variant="outline" size="sm" className="rounded-lg w-full sm:w-auto">
                Edit
              </Button>
            </Link>
            <a href={pageUrl} target="_blank" rel="noopener noreferrer">
              <Button variant="outline" size="sm" className="rounded-lg w-full sm:w-auto">
                <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
                View
              </Button>
            </a>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

