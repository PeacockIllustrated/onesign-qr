import Link from 'next/link';
import { Plus, QrCode, ExternalLink, BarChart3 } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { Button, Card, CardContent, Badge } from '@/components/ui';
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

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold">your qr codes</h1>
          <p className="text-muted-foreground">
            Manage and track your QR codes
          </p>
        </div>
        <Link href="/app/new">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            create qr
          </Button>
        </Link>
      </div>

      {/* QR Code Grid */}
      {!qrCodes || qrCodes.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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
    <Card className="p-12">
      <div className="text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-sm bg-muted mb-4">
          <QrCode className="h-8 w-8 text-muted-foreground" />
        </div>
        <h2 className="text-lg font-semibold mb-2">no qr codes yet</h2>
        <p className="text-muted-foreground mb-6 max-w-sm mx-auto">
          Create your first QR code to get started. Managed QR codes can be
          updated without reprinting.
        </p>
        <Link href="/app/new">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            create your first qr
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
      <Card className="hover:border-foreground/20 transition-colors cursor-pointer">
        <CardContent className="p-6">
          {/* Preview placeholder */}
          <div className="aspect-square bg-muted rounded-sm mb-4 flex items-center justify-center">
            <QrCode className="h-16 w-16 text-muted-foreground" />
          </div>

          {/* Info */}
          <div className="space-y-2">
            <div className="flex items-start justify-between gap-2">
              <h3 className="font-medium truncate">{qr.name}</h3>
              <Badge variant={qr.is_active ? 'success' : 'secondary'}>
                {qr.is_active ? 'active' : 'inactive'}
              </Badge>
            </div>

            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Badge variant="outline">
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
