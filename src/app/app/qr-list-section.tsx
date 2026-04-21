'use client';

import Link from 'next/link';
import { BarChart3, Hash } from 'lucide-react';
import { Card, CardContent } from '@/components/ui';
import { formatDate, formatNumber } from '@/lib/utils';
import { LinkListFilter } from '@/components/qr/link-list-filter';
import { QRDeleteButton } from '@/components/qr/qr-delete-button';
import type { QRCarrier, QRMode } from '@/types/qr';

export interface QRRow {
  id: string;
  name: string;
  mode: QRMode;
  carrier: QRCarrier;
  slug: string | null;
  destination_url: string;
  is_active: boolean;
  total_scans: number;
  created_at: string;
}

export function QRListSection({ qrCodes }: { qrCodes: QRRow[] }) {
  if (qrCodes.length === 0) {
    return (
      <Card className="rounded-xl">
        <CardContent className="p-8 text-center">
          <p className="text-sm text-zinc-400">No Links yet. Create one to get started.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <LinkListFilter
      items={qrCodes}
      renderItem={(qr, badge) => (
        <Card key={qr.id} className="rounded-xl hover:border-lynx-400/40 transition-colors">
          <CardContent className="p-5 space-y-3">
            <div className="flex items-start justify-between gap-3">
              <Link href={`/app/qr/${qr.id}`} className="flex-1 min-w-0">
                <h3 className="font-semibold text-zinc-50 truncate">{qr.name}</h3>
                <p className="text-xs text-zinc-500 mt-0.5 truncate">
                  {qr.mode === 'managed' ? `/r/${qr.slug}` : qr.destination_url}
                </p>
              </Link>
              {badge}
            </div>
            <div className="flex items-center gap-4 text-xs text-zinc-500">
              <span className="flex items-center gap-1">
                <BarChart3 className="h-3.5 w-3.5" />
                {formatNumber(qr.total_scans)} scans
              </span>
              <span className="flex items-center gap-1">
                <Hash className="h-3.5 w-3.5" />
                {formatDate(qr.created_at)}
              </span>
            </div>
            <div className="flex items-center justify-between pt-2 border-t border-zinc-800">
              <Link
                href={`/app/qr/${qr.id}`}
                className="text-xs text-lynx-400 hover:text-lynx-300"
              >
                Manage →
              </Link>
              <QRDeleteButton qrId={qr.id} qrName={qr.name} />
            </div>
          </CardContent>
        </Card>
      )}
    />
  );
}
