'use client';

import Link from 'next/link';
import { Lock, QrCode, Nfc } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui';

interface CarrierCardProps {
  variant: 'qr' | 'nfc';
  /** 'free' | 'pro' — only relevant for variant='nfc'. QR is always free. */
  plan?: 'free' | 'pro';
  /** Whether the user has enabled the NFC carrier. Ignored for variant='qr'. */
  enabled?: boolean;
  /** Toggle enabled state. Ignored for variant='qr'. */
  onEnabledChange?: (next: boolean) => void;
  /** The interactive content (e.g., QR style panel, NFC order button). */
  children?: React.ReactNode;
}

/**
 * Carrier card: a section on /app/new and /app/qr/[id] representing a
 * physical expression of the Link. QR is always enabled and free; NFC
 * is Pro-gated and rendered in a locked/greyed-out state for Free orgs.
 */
export function CarrierCard({
  variant,
  plan = 'free',
  enabled = false,
  onEnabledChange,
  children,
}: CarrierCardProps) {
  if (variant === 'qr') {
    return (
      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <QrCode className="h-4 w-4 text-lynx-400" />
            QR code
            <span className="ml-1 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider rounded bg-zinc-800 text-zinc-400">
              Free
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>{children}</CardContent>
      </Card>
    );
  }

  // NFC variant
  const locked = plan !== 'pro';

  return (
    <Card className={locked ? 'opacity-70' : undefined} aria-disabled={locked || undefined}>
      <CardHeader className="flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2 text-base">
          {locked ? (
            <Lock className="h-4 w-4 text-zinc-500" />
          ) : (
            <Nfc className="h-4 w-4 text-lynx-400" />
          )}
          NFC chips
          <span className="ml-1 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider rounded bg-lynx-500/15 text-lynx-400 border border-lynx-400/20">
            Pro
          </span>
        </CardTitle>
        {!locked && onEnabledChange && (
          <label className="flex items-center gap-2 text-xs text-zinc-400">
            <input
              type="checkbox"
              checked={enabled}
              onChange={(e) => onEnabledChange(e.target.checked)}
              className="rounded border-input"
            />
            Enable
          </label>
        )}
      </CardHeader>
      <CardContent>
        {locked ? (
          <div className="space-y-3">
            <p className="text-sm text-zinc-400">
              NFC cards let customers tap-to-connect — no scanning needed.
              Pre-programmed before dispatch; change the destination any time from your Link page.
            </p>
            <Link
              href="/pricing"
              className="inline-flex items-center gap-2 text-sm font-medium text-lynx-400 hover:text-lynx-300"
            >
              Upgrade to Pro
              <span aria-hidden>→</span>
            </Link>
          </div>
        ) : (
          children ?? (
            <p className="text-sm text-zinc-400">
              Order pre-programmed NFC chips for this Link. We&apos;ll print and programme
              them with the redirect URL before dispatch — you manage the destination from
              your dashboard.
            </p>
          )
        )}
      </CardContent>
    </Card>
  );
}
