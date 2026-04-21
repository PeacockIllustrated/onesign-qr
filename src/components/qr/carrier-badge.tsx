import type { QRCarrier, QRMode } from '@/types/qr';

interface CarrierBadgeProps {
  mode: QRMode;
  carrier: QRCarrier;
}

/**
 * Small pill showing a Link's carrier (QR / NFC / QR + NFC) or "Direct"
 * for direct-mode QRs. Used on the dashboard list and detail page header.
 */
export function CarrierBadge({ mode, carrier }: CarrierBadgeProps) {
  if (mode === 'direct') {
    return (
      <span className="inline-flex items-center px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wider rounded-full bg-zinc-800 text-zinc-500 border border-zinc-700">
        Direct
      </span>
    );
  }

  const label =
    carrier === 'both' ? 'QR + NFC' : carrier === 'nfc' ? 'NFC' : 'QR';
  const accent = carrier === 'qr'
    ? 'bg-zinc-800 text-zinc-300 border-zinc-700'
    : 'bg-lynx-500/15 text-lynx-400 border-lynx-400/30';

  return (
    <span className={`inline-flex items-center px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wider rounded-full border ${accent}`}>
      {label}
    </span>
  );
}
