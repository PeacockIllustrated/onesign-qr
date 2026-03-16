import Link from 'next/link';
import { Plus, ExternalLink, BarChart3, Activity, Hash, Link2, Eye } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { Button, Card, CardContent, Badge, OneSignIcon } from '@/components/ui';
import { formatDate, formatNumber } from '@/lib/utils';
import { QRDeleteButton } from '@/components/qr/qr-delete-button';
import { THEME_CONFIGS } from '@/lib/bio/theme-definitions';
import type { BioLinkTheme } from '@/types/bio';
import { generateBasicSVG, getQRContent } from '@/lib/qr/generator';

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Fetch QR codes
  const { data: qrCodes, error } = await supabase
    .from('qr_codes')
    .select('*, qr_styles(*)')
    .eq('owner_id', user!.id)
    .order('created_at', { ascending: false });

  // Fetch bio pages
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

  return (
    <div className="p-5 md:p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage and track your QR codes
          </p>
        </div>
        <Link href="/app/new">
          <Button className="rounded-lg">
            <Plus className="h-4 w-4 mr-2" />
            Create QR
          </Button>
        </Link>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        <Card className="rounded-xl">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Total Scans</p>
                <p className="text-2xl font-semibold mt-1">{formatNumber(totalScans)}</p>
              </div>
              <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center">
                <BarChart3 className="h-5 w-5 text-muted-foreground" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="rounded-xl">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Active Codes</p>
                <p className="text-2xl font-semibold mt-1">{activeCount}</p>
              </div>
              <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center">
                <Activity className="h-5 w-5 text-muted-foreground" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="rounded-xl">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Total Codes</p>
                <p className="text-2xl font-semibold mt-1">{totalCodes}</p>
              </div>
              <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center">
                <Hash className="h-5 w-5 text-muted-foreground" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="rounded-xl">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Bio Views</p>
                <p className="text-2xl font-semibold mt-1">{formatNumber(bioPages?.reduce((sum, p) => sum + (p.total_views || 0), 0) ?? 0)}</p>
              </div>
              <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center">
                <Eye className="h-5 w-5 text-muted-foreground" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Bio Pages Section */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-medium tracking-tight">Bio Pages</h2>
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
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-muted mb-3">
                <Link2 className="h-6 w-6 text-muted-foreground" />
              </div>
              <p className="text-sm text-muted-foreground">No bio page yet. Create one to share all your links in one place.</p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* QR Code Grid */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-medium tracking-tight">QR Codes</h2>
      </div>
      {!qrCodes || qrCodes.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {qrCodes.map((qr) => (
            <QRCard key={qr.id} qr={qr} />
          ))}
        </div>
      )}
    </div>
  );
}

function EmptyState() {
  return (
    <Card className="p-12 rounded-xl">
      <div className="text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-muted mb-4">
          <OneSignIcon size={32} />
        </div>
        <h2 className="text-lg font-medium mb-2">No QR codes yet</h2>
        <p className="text-muted-foreground mb-6 max-w-sm mx-auto">
          Create your first QR code to get started. Managed QR codes can be
          updated without reprinting.
        </p>
        <Link href="/app/new">
          <Button className="rounded-lg">
            <Plus className="h-4 w-4 mr-2" />
            Create your first QR
          </Button>
        </Link>
      </div>
    </Card>
  );
}

function BioPageCard({ page }: { page: any }) {
  const pageUrl = `${process.env.NEXT_PUBLIC_APP_URL || ''}/p/${page.slug}`;
  const themeConfig = THEME_CONFIGS[(page.theme as BioLinkTheme) ?? 'minimal'] ?? THEME_CONFIGS.minimal;

  return (
    <Card
      className="rounded-xl overflow-hidden hover:border-foreground/20 transition-colors"
      style={{ borderLeftWidth: 4, borderLeftColor: themeConfig.colors.accent }}
    >
      {/* Theme banner — mobile only */}
      <div
        className="flex sm:hidden items-center gap-2.5 px-4 py-2 border-b border-border/50"
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
              className="hidden sm:flex h-12 w-12 rounded-xl items-center justify-center shrink-0"
              style={{ background: themeConfig.background.css }}
            >
              <div
                className="w-6 h-1.5 rounded-full"
                style={{ backgroundColor: themeConfig.colors.buttonBg, opacity: 0.9 }}
              />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="font-medium truncate">{page.title}</h3>
                <Badge variant={page.is_active ? 'success' : 'secondary'} className="rounded-md shrink-0">
                  {page.is_active ? 'Active' : 'Inactive'}
                </Badge>
              </div>
              <div className="flex items-center gap-3 mt-1 text-muted-foreground flex-wrap">
                {/* Theme dots — desktop only */}
                <span className="hidden sm:flex items-center gap-1.5">
                  {themeConfig.previewColors.map((color, i) => (
                    <span
                      key={i}
                      className="inline-block h-2.5 w-2.5 rounded-full border border-border/50"
                      style={{ backgroundColor: color }}
                    />
                  ))}
                  <span className="text-xs">{themeConfig.name}</span>
                </span>
                <span className="flex items-center gap-1 text-xs">
                  <Eye className="h-3.5 w-3.5" />
                  {formatNumber(page.total_views)} views
                </span>
                <span className="font-mono text-xs">/p/{page.slug}</span>
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

async function QRCard({ qr }: { qr: any }) {
  // Generate actual QR code SVG
  const qrContent = getQRContent(qr.mode, qr.destination_url, qr.slug);
  const style = qr.qr_styles?.[0];
  let svgDataUrl: string | null = null;

  try {
    const svg = await generateBasicSVG(qrContent, {
      errorCorrection: style?.error_correction ?? 'M',
      margin: 2,
      foreground: style?.foreground_color ?? '#000000',
      background: style?.background_color ?? '#FFFFFF',
    });
    const base64 = Buffer.from(svg).toString('base64');
    svgDataUrl = `data:image/svg+xml;base64,${base64}`;
  } catch {
    // Fall back to placeholder if generation fails
  }

  return (
    <Link href={`/app/qr/${qr.id}`}>
      <Card className="hover:border-foreground/20 hover:shadow-sm transition-all cursor-pointer rounded-xl group">
        <CardContent className="p-3">
          <div className="flex items-center gap-3">
            {/* QR Code thumbnail */}
            <div className="w-16 h-16 shrink-0 rounded-lg overflow-hidden border border-border bg-white flex items-center justify-center">
              {svgDataUrl ? (
                <img src={svgDataUrl} alt={qr.name} className="w-full h-full" />
              ) : (
                <OneSignIcon size={24} className="opacity-20" />
              )}
            </div>

            {/* Info */}
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <h3 className="font-medium text-sm truncate">{qr.name}</h3>
                <Badge variant={qr.is_active ? 'success' : 'secondary'} className="rounded-md text-[10px] px-1.5 py-0 shrink-0">
                  {qr.is_active ? 'Active' : 'Inactive'}
                </Badge>
              </div>

              <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                <Badge variant="outline" className="rounded-md text-[10px] px-1.5 py-0">
                  {qr.mode}
                </Badge>
                {qr.analytics_enabled && (
                  <span className="flex items-center gap-1">
                    <BarChart3 className="h-3 w-3" />
                    {formatNumber(qr.total_scans)}
                  </span>
                )}
                <span>{formatDate(qr.created_at)}</span>
              </div>
            </div>

            {/* Delete button */}
            <div className="shrink-0">
              <QRDeleteButton qrId={qr.id} qrName={qr.name} />
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
