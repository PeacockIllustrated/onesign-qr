'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui';

interface DirectQRConfirmationModalProps {
  open: boolean;
  /** The destination URL currently entered; forwarded as ?url= to /app/new */
  destinationUrl: string;
  onCancel: () => void;
  onConfirm: () => void;
}

/**
 * Compact modal nudging users toward managed Links before they generate
 * an unchangeable direct QR. Dismissible via Esc or backdrop click.
 */
export function DirectQRConfirmationModal({
  open,
  destinationUrl,
  onCancel,
  onConfirm,
}: DirectQRConfirmationModalProps) {
  const router = useRouter();

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onCancel();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onCancel]);

  if (!open) return null;

  const linkHref = destinationUrl
    ? `/app/new?url=${encodeURIComponent(destinationUrl)}`
    : '/app/new';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="direct-qr-modal-title"
    >
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onCancel}
        aria-hidden="true"
      />
      <div className="relative w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl p-6">
        <h2 id="direct-qr-modal-title" className="text-lg font-semibold text-zinc-50">
          Generate a one-off QR?
        </h2>
        <p className="mt-2 text-sm text-zinc-400">
          Direct QRs encode the destination into the image permanently.
          You won&apos;t be able to change where it points later.
        </p>

        <div className="mt-4 rounded-xl bg-zinc-800/50 border border-zinc-800 p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-lynx-400 mb-2">
            Managed Links give you
          </p>
          <ul className="space-y-1 text-sm text-zinc-300">
            <li>• Change the destination any time</li>
            <li>• Scan analytics (who, when, where)</li>
            <li>• Custom /r/yourslug URL</li>
          </ul>
        </div>

        <div className="mt-6 flex flex-col sm:flex-row gap-2">
          <Button
            type="button"
            className="flex-1"
            onClick={() => router.push(linkHref)}
          >
            Create a Link instead
          </Button>
          <Button
            type="button"
            variant="outline"
            className="flex-1"
            onClick={onConfirm}
          >
            Generate anyway
          </Button>
        </div>
      </div>
    </div>
  );
}
