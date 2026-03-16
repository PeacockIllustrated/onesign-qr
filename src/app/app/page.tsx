import Link from 'next/link';
import { Plus, ExternalLink, BarChart3, Activity, Hash } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { Button, Card, CardContent, Badge, OneSignIcon } from '@/components/ui';
import { formatDate, formatNumber } from '@/lib/utils';

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Fetch QR codes
  const { data: qrCodes, error } = await supabase
    .from('qr_codes')
    .select('*, qr_styles(*)')
    .eq('owner_id', user!.id)
    .order('created_at', { ascending: false });

  const totalScans = qrCodes?.reduce((sum, qr) => sum + (qr.total_scans || 0), 0) ?? 0;
  const activeCount = qrCodes?.filter(qr => qr.is_active).length ?? 0;
  const totalCodes = qrCodes?.length ?? 0;

  return (
    <div className="p-5 md:p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
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
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <Card className="rounded-xl">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Total Scans</p>
                <p className="text-2xl font-bold mt-1">{formatNumber(totalScans)}</p>
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
                <p className="text-2xl font-bold mt-1">{activeCount}</p>
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
                <p className="text-2xl font-bold mt-1">{totalCodes}</p>
              </div>
              <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center">
                <Hash className="h-5 w-5 text-muted-foreground" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* QR Code Grid */}
      {!qrCodes || qrCodes.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
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
        <h2 className="text-lg font-semibold mb-2">No QR codes yet</h2>
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

function QRCard({ qr }: { qr: any }) {
  const redirectUrl = qr.mode === 'managed'
    ? `${process.env.NEXT_PUBLIC_APP_URL || ''}/r/${qr.slug}`
    : null;

  return (
    <Link href={`/app/qr/${qr.id}`}>
      <Card className="hover:border-foreground/20 hover:shadow-sm transition-all cursor-pointer rounded-xl group">
        <CardContent className="p-5">
          {/* Preview placeholder */}
          <div className="aspect-square bg-muted rounded-lg mb-4 flex items-center justify-center group-hover:bg-muted/80 transition-colors">
            <OneSignIcon size={48} className="opacity-20" />
          </div>

          {/* Info */}
          <div className="space-y-2.5">
            <div className="flex items-start justify-between gap-2">
              <h3 className="font-semibold truncate">{qr.name}</h3>
              <Badge variant={qr.is_active ? 'success' : 'secondary'} className="rounded-md shrink-0">
                {qr.is_active ? 'Active' : 'Inactive'}
              </Badge>
            </div>

            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Badge variant="outline" className="rounded-md">
                {qr.mode}
              </Badge>
              {qr.analytics_enabled && (
                <span className="flex items-center gap-1">
                  <BarChart3 className="h-3 w-3" />
                  {formatNumber(qr.total_scans)} scans
                </span>
              )}
            </div>

            {redirectUrl && (
              <p className="text-xs text-muted-foreground truncate flex items-center gap-1">
                <ExternalLink className="h-3 w-3 shrink-0" />
                {redirectUrl}
              </p>
            )}

            <p className="text-xs text-muted-foreground">
              Created {formatDate(qr.created_at)}
            </p>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
