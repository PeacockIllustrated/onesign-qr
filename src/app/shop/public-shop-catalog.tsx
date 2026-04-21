'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowUpRight, PackageSearch, Lock } from 'lucide-react';
import { SHOP_CATEGORY_LABELS } from '@/types/shop';
import type { ShopProductCategory, ShopProductRecord } from '@/types/shop';

export type PublicProduct = Pick<
  ShopProductRecord,
  | 'id'
  | 'slug'
  | 'name'
  | 'description'
  | 'category'
  | 'base_price_pence'
  | 'primary_image_url'
>;

interface PublicShopCatalogProps {
  products: PublicProduct[];
}

const ALL_FILTER = 'all' as const;
type FilterValue = ShopProductCategory | typeof ALL_FILTER;

const CATEGORY_ORDER: ShopProductCategory[] = [
  'nfc_card',
  'review_board',
  'table_talker',
  'window_decal',
  'badge',
  'other',
];

function formatGBP(pence: number): string {
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP',
  }).format(pence / 100);
}

export function PublicShopCatalog({ products }: PublicShopCatalogProps) {
  const [activeFilter, setActiveFilter] = useState<FilterValue>(ALL_FILTER);

  const availableCategories = CATEGORY_ORDER.filter((cat) =>
    products.some((p) => p.category === cat)
  );

  const filtered =
    activeFilter === ALL_FILTER
      ? products
      : products.filter((p) => p.category === activeFilter);

  if (products.length === 0) {
    return <EmptyState />;
  }

  return (
    <>
      {/* Filter row */}
      <div
        role="group"
        aria-label="Filter products by category"
        className="flex flex-wrap items-center gap-2 mb-8 md:mb-10"
      >
        <FilterChip
          label="All"
          active={activeFilter === ALL_FILTER}
          onClick={() => setActiveFilter(ALL_FILTER)}
          count={products.length}
        />
        {availableCategories.map((cat) => (
          <FilterChip
            key={cat}
            label={SHOP_CATEGORY_LABELS[cat]}
            active={activeFilter === cat}
            onClick={() => setActiveFilter(cat)}
            count={products.filter((p) => p.category === cat).length}
          />
        ))}
      </div>

      {/* Grid */}
      {filtered.length === 0 ? (
        <FilteredEmpty
          categoryLabel={
            activeFilter !== ALL_FILTER
              ? SHOP_CATEGORY_LABELS[activeFilter]
              : ''
          }
          onReset={() => setActiveFilter(ALL_FILTER)}
        />
      ) : (
        <>
          <p className="sr-only">
            Showing {filtered.length}{' '}
            {filtered.length === 1 ? 'product' : 'products'}
            {activeFilter !== ALL_FILTER
              ? ` in ${SHOP_CATEGORY_LABELS[activeFilter]}`
              : ''}
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 md:gap-6">
            {filtered.map((p) => (
              <PublicProductCard key={p.id} product={p} />
            ))}
          </div>
        </>
      )}
    </>
  );
}

/* ─── Product card (dark, signup-gated) ─────────────────────────── */

function PublicProductCard({ product }: { product: PublicProduct }) {
  const href = `/auth/signup?next=/app/shop/${product.slug}`;
  return (
    <Link
      href={href}
      className="group relative flex flex-col bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden transition-all duration-300 hover:-translate-y-0.5 hover:border-lynx-400/40 hover:shadow-[0_8px_32px_-4px_rgba(88,163,134,0.18)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lynx-400 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950"
      aria-label={`${product.name} — ${formatGBP(product.base_price_pence)} — sign up to view`}
    >
      {/* Image */}
      <div className="relative aspect-[4/3] bg-zinc-950 overflow-hidden">
        {product.primary_image_url ? (
          <Image
            src={product.primary_image_url}
            alt={product.name}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            className="object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-zinc-900 to-zinc-950">
            <div className="relative w-16 h-16">
              <div className="absolute inset-0 border-2 border-zinc-700 rounded-lg rotate-6" />
              <div className="absolute inset-0 border-2 border-zinc-600 rounded-lg -rotate-3" />
              <div className="absolute inset-0 border-2 border-lynx-400/50 rounded-lg" />
            </div>
          </div>
        )}

        {/* Price badge */}
        <div className="absolute top-3 right-3 bg-zinc-950/90 backdrop-blur-sm border border-zinc-800 px-2.5 py-1 rounded-full text-xs font-semibold text-zinc-100 tabular-nums">
          {formatGBP(product.base_price_pence)}
        </div>
      </div>

      {/* Content */}
      <div className="flex flex-col flex-1 p-5">
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-zinc-50 leading-tight tracking-tight truncate">
            {product.name}
          </h3>
          {product.description && (
            <p className="mt-1.5 text-sm text-zinc-500 line-clamp-2 leading-relaxed">
              {product.description}
            </p>
          )}
        </div>

        {/* CTA */}
        <div className="mt-4 flex items-center justify-between">
          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-zinc-500 uppercase tracking-widest">
            <Lock className="h-3 w-3" aria-hidden="true" />
            Sign up to buy
          </span>
          <span
            className="inline-flex items-center gap-1 text-xs font-semibold text-zinc-300 bg-zinc-800 rounded-full px-3 py-1.5 transition-all duration-200 group-hover:bg-lynx-500 group-hover:text-zinc-950"
            aria-hidden="true"
          >
            View
            <ArrowUpRight className="h-3 w-3 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </span>
        </div>
      </div>
    </Link>
  );
}

/* ─── Filter chip ───────────────────────────────────────────────── */

interface FilterChipProps {
  label: string;
  active: boolean;
  onClick: () => void;
  count: number;
}

function FilterChip({ label, active, onClick, count }: FilterChipProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={[
        'inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lynx-400 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950',
        active
          ? 'bg-lynx-500 text-zinc-950'
          : 'bg-zinc-900 text-zinc-400 border border-zinc-800 hover:border-lynx-400/40 hover:text-zinc-100',
      ].join(' ')}
    >
      {label}
      <span
        className={[
          'text-xs rounded-full px-1.5 py-0.5 font-semibold tabular-nums leading-none',
          active ? 'bg-zinc-950/20 text-zinc-950' : 'bg-zinc-800 text-zinc-500',
        ].join(' ')}
        aria-hidden="true"
      >
        {count}
      </span>
    </button>
  );
}

/* ─── Empty states ──────────────────────────────────────────────── */

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-16 md:py-20 text-center">
      <div className="relative mb-6">
        <div className="w-20 h-20 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center">
          <PackageSearch className="h-9 w-9 text-zinc-700" aria-hidden="true" />
        </div>
      </div>
      <h3 className="text-lg font-semibold text-zinc-100 mb-2">
        Products arriving soon
      </h3>
      <p className="text-sm text-zinc-500 max-w-xs leading-relaxed">
        The shop opens the moment the first batch is in stock. Sign up free
        to be notified.
      </p>
    </div>
  );
}

function FilteredEmpty({
  categoryLabel,
  onReset,
}: {
  categoryLabel: string;
  onReset: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-14 text-center">
      <div className="w-16 h-16 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center mb-4">
        <PackageSearch className="h-7 w-7 text-zinc-700" aria-hidden="true" />
      </div>
      <h3 className="text-base font-semibold text-zinc-100 mb-1">
        Nothing in {categoryLabel} yet
      </h3>
      <p className="text-sm text-zinc-500 max-w-xs leading-relaxed mb-5">
        We&apos;re adding products regularly. Browse all categories in the
        meantime.
      </p>
      <button
        type="button"
        onClick={onReset}
        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-lynx-500 text-zinc-950 text-sm font-semibold hover:bg-lynx-400 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lynx-400 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950"
      >
        Browse all products
      </button>
    </div>
  );
}
