'use client';

import { useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import type { QRCarrier, QRMode } from '@/types/qr';
import { CarrierBadge } from '@/components/qr/carrier-badge';

type FilterValue = 'all' | 'qr' | 'nfc' | 'direct';

interface LinkWithCarrier {
  id: string;
  mode: QRMode;
  carrier: QRCarrier;
}

interface LinkListFilterProps<T extends LinkWithCarrier> {
  items: T[];
  renderItem: (item: T, badge: ReactNode) => ReactNode;
}

const FILTERS: { value: FilterValue; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'qr', label: 'QR' },
  { value: 'nfc', label: 'NFC' },
  { value: 'direct', label: 'Direct' },
];

export function LinkListFilter<T extends LinkWithCarrier>({
  items,
  renderItem,
}: LinkListFilterProps<T>) {
  const [filter, setFilter] = useState<FilterValue>('all');

  const counts = useMemo(() => {
    return {
      all: items.length,
      qr: items.filter((i) => i.mode === 'managed' && i.carrier === 'qr').length,
      nfc: items.filter(
        (i) => i.mode === 'managed' && (i.carrier === 'nfc' || i.carrier === 'both')
      ).length,
      direct: items.filter((i) => i.mode === 'direct').length,
    };
  }, [items]);

  const filtered = useMemo(() => {
    if (filter === 'all') return items;
    if (filter === 'qr')
      return items.filter((i) => i.mode === 'managed' && i.carrier === 'qr');
    if (filter === 'nfc')
      return items.filter(
        (i) => i.mode === 'managed' && (i.carrier === 'nfc' || i.carrier === 'both')
      );
    return items.filter((i) => i.mode === 'direct');
  }, [items, filter]);

  return (
    <>
      <div
        role="group"
        aria-label="Filter links by carrier"
        className="flex flex-wrap items-center gap-2 mb-4"
      >
        {FILTERS.map((f) => {
          const active = f.value === filter;
          return (
            <button
              key={f.value}
              type="button"
              onClick={() => setFilter(f.value)}
              aria-pressed={active}
              className={[
                'inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-colors',
                active
                  ? 'bg-lynx-500 text-zinc-950'
                  : 'bg-zinc-900 text-zinc-400 border border-zinc-800 hover:text-zinc-100 hover:border-lynx-400/40',
              ].join(' ')}
            >
              {f.label}
              <span
                className={[
                  'text-xs rounded-full px-1.5 py-0.5 font-semibold tabular-nums leading-none',
                  active ? 'bg-zinc-950/20 text-zinc-950' : 'bg-zinc-800 text-zinc-500',
                ].join(' ')}
              >
                {counts[f.value]}
              </span>
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filtered.map((item) =>
          renderItem(
            item,
            <CarrierBadge mode={item.mode} carrier={item.carrier} />
          )
        )}
      </div>
    </>
  );
}
