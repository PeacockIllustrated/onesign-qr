import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, BarChart3 } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import {
  Card,
  CardContent,
  Badge,
} from '@/components/ui';
import { QRDetailClient } from '@/components/qr/qr-detail-client';
import { CarrierBadge } from '@/components/qr/carrier-badge';
import { formatDate, formatNumber } from '@/lib/utils';
import type { QRCarrier } from '@/types/qr';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function QRDetailPage({ params }: PageProps) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Fetch QR code with style
  const { data: qr, error } = await supabase
    .from('qr_codes')
    .select('*, qr_styles(*)')
    .eq('id', id)
    .eq('owner_id', user!.id)
    .single();

  if (error || !qr) {
    notFound();
  }

  const style = Array.isArray(qr.qr_styles) ? qr.qr_styles[0] : qr.qr_styles;
  const redirectUrl = qr.mode === 'managed'
    ? `${process.env.NEXT_PUBLIC_APP_URL || ''}/r/${qr.slug}`
    : null;

  return (
    <div className="p-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <Link
          href="/app"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-4"
        >
          <ArrowLeft className="h-4 w-4" />
          back to dashboard
        </Link>

        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-zinc-50">{qr.name}</h1>
            <div className="flex items-center gap-3 mt-2">
              <Badge variant={qr.is_active ? 'success' : 'secondary'}>
                {qr.is_active ? 'Active' : 'Inactive'}
              </Badge>
              <CarrierBadge mode={qr.mode} carrier={(qr.carrier ?? 'qr') as QRCarrier} />
              {qr.analytics_enabled && (
                <span className="flex items-center gap-1 text-sm text-zinc-400">
                  <BarChart3 className="h-4 w-4" />
                  {formatNumber(qr.total_scans)} total scans
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Client component for interactive features */}
      <QRDetailClient
        qr={qr}
        style={style}
        redirectUrl={redirectUrl}
      />
    </div>
  );
}
