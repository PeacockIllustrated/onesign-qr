// StatStrip — horizontal trust-signal strip for use on zinc-950 hero sections.
// Assumes a dark background. Items are separated by tiny lynx-400 dot dividers.
// Consumer passes an array of { icon: ReactNode, label: string }.

import { type ReactNode } from 'react';

export interface StatItem {
  icon: ReactNode;
  label: string;
}

interface StatStripProps {
  items: StatItem[];
  className?: string;
}

/**
 * Compact horizontal strip of trust signals. Dot-separated on desktop;
 * wraps gracefully on mobile to two rows.
 *
 * @example
 * <StatStrip items={[
 *   { icon: <UKMadeIcon />, label: 'UK-made' },
 *   { icon: <DispatchIcon />, label: '48hr dispatch' },
 *   { icon: <NfcIcon />, label: 'NFC-enabled' },
 * ]} />
 */
export function StatStrip({ items, className = '' }: StatStripProps) {
  return (
    <ul
      className={`flex flex-wrap items-center gap-x-4 gap-y-3 list-none m-0 p-0 ${className}`}
      aria-label="Trust signals"
    >
      {items.map((item, idx) => (
        <li key={item.label} className="flex items-center gap-x-4">
          {/* Dot divider — shown between items only */}
          {idx > 0 && (
            <span
              aria-hidden="true"
              className="hidden sm:block w-1 h-1 rounded-full bg-lynx-400/50 flex-none"
            />
          )}
          <span className="flex items-center gap-1.5">
            {/* Icon slot — consumer provides aria-hidden SVG */}
            <span className="flex-none text-lynx-400/80" aria-hidden="true">
              {item.icon}
            </span>
            <span className="text-xs font-semibold text-zinc-300 tracking-wide whitespace-nowrap">
              {item.label}
            </span>
          </span>
        </li>
      ))}
    </ul>
  );
}
