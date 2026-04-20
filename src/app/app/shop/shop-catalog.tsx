'use client';

import { useState } from 'react';
import { PackageSearch } from 'lucide-react';
import { ProductCard } from '@/components/shop/product-card';
import { SHOP_CATEGORY_LABELS } from '@/types/shop';
import type { ShopProductCategory, ShopProductRecord } from '@/types/shop';

type Product = Pick<
  ShopProductRecord,
  | 'id'
  | 'slug'
  | 'name'
  | 'description'
  | 'category'
  | 'base_price_pence'
  | 'primary_image_url'
  | 'gallery_image_urls'
>;

interface ShopCatalogProps {
  products: Product[];
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

export function ShopCatalog({ products }: ShopCatalogProps) {
  const [activeFilter, setActiveFilter] = useState<FilterValue>(ALL_FILTER);

  const filteredProducts =
    activeFilter === ALL_FILTER
      ? products
      : products.filter((p) => p.category === activeFilter);

  // Only show categories that have at least one product, plus "All"
  const availableCategories = CATEGORY_ORDER.filter((cat) =>
    products.some((p) => p.category === cat)
  );

  return (
    <div className="min-h-screen bg-zinc-50">
      {/* ─── HERO ─────────────────────────────────────────────── */}
      <section
        className="relative overflow-hidden bg-zinc-900"
        aria-label="Shop hero"
      >
        {/* Decorative background — subtle grid + radial glow */}
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage:
              'linear-gradient(to right, #fff 1px, transparent 1px), linear-gradient(to bottom, #fff 1px, transparent 1px)',
            backgroundSize: '48px 48px',
          }}
          aria-hidden="true"
        />
        <div
          className="absolute -top-32 -left-32 w-[480px] h-[480px] rounded-full opacity-20 blur-3xl"
          style={{
            background:
              'radial-gradient(circle, rgba(251,191,36,0.6) 0%, transparent 70%)',
          }}
          aria-hidden="true"
        />
        <div
          className="absolute -bottom-20 right-0 w-[320px] h-[320px] rounded-full opacity-10 blur-3xl"
          style={{
            background:
              'radial-gradient(circle, rgba(251,191,36,0.5) 0%, transparent 70%)',
          }}
          aria-hidden="true"
        />

        <div className="relative max-w-7xl mx-auto px-5 md:px-8 py-16 md:py-24">
          <div className="max-w-2xl">
            {/* Eyebrow */}
            <div className="inline-flex items-center gap-2 mb-6">
              <span className="inline-block w-6 h-px bg-lynx-400" aria-hidden="true" />
              <span className="text-lynx-400 text-xs font-semibold uppercase tracking-[0.2em]">
                OneSign Physical
              </span>
            </div>

            {/* Headline */}
            <h1 className="text-4xl sm:text-5xl md:text-[3.5rem] font-bold text-white leading-[1.05] tracking-tight">
              Make your business{' '}
              <span className="text-lynx-400">impossible</span>
              <br className="hidden sm:block" /> to ignore.
            </h1>

            {/* Subline */}
            <p className="mt-5 text-base md:text-lg text-zinc-400 leading-relaxed max-w-lg">
              NFC cards, review boards, table talkers and more — physical
              products that carry your digital presence into the real world.
            </p>

            {/* Stats strip */}
            <div className="mt-10 flex flex-wrap items-center gap-x-8 gap-y-4">
              {[
                { value: 'UK-made', label: 'Printed & shipped' },
                { value: '48hr', label: 'Typical dispatch' },
                { value: 'NFC-enabled', label: 'Tap-to-connect' },
              ].map(({ value, label }) => (
                <div key={value} className="flex flex-col">
                  <span className="text-sm font-bold text-white">{value}</span>
                  <span className="text-xs text-zinc-500 mt-0.5">{label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ─── CATALOG BODY ─────────────────────────────────────── */}
      <div className="max-w-7xl mx-auto px-5 md:px-8 py-10 md:py-14">

        {/* Category filter row */}
        {products.length > 0 && (
          <div
            className="flex flex-wrap items-center gap-2 mb-8 md:mb-10"
            role="group"
            aria-label="Filter products by category"
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
        )}

        {/* Product grid */}
        {filteredProducts.length > 0 ? (
          <>
            <p className="sr-only">
              Showing {filteredProducts.length}{' '}
              {filteredProducts.length === 1 ? 'product' : 'products'}
              {activeFilter !== ALL_FILTER
                ? ` in ${SHOP_CATEGORY_LABELS[activeFilter]}`
                : ''}
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 md:gap-6">
              {filteredProducts.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          </>
        ) : (
          <EmptyState
            filtered={activeFilter !== ALL_FILTER}
            categoryLabel={
              activeFilter !== ALL_FILTER
                ? SHOP_CATEGORY_LABELS[activeFilter]
                : undefined
            }
            onReset={() => setActiveFilter(ALL_FILTER)}
          />
        )}
      </div>
    </div>
  );
}

/* ─── Filter Chip ─────────────────────────────────────────────── */

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
        'inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900 focus-visible:ring-offset-2',
        active
          ? 'bg-zinc-900 text-white shadow-sm'
          : 'bg-white text-zinc-600 border border-zinc-200 hover:border-zinc-400 hover:text-zinc-900',
      ].join(' ')}
    >
      {label}
      <span
        className={[
          'text-xs rounded-full px-1.5 py-0.5 font-semibold tabular-nums leading-none',
          active
            ? 'bg-white/20 text-white'
            : 'bg-zinc-100 text-zinc-500',
        ].join(' ')}
        aria-hidden="true"
      >
        {count}
      </span>
    </button>
  );
}

/* ─── Empty State ─────────────────────────────────────────────── */

interface EmptyStateProps {
  filtered: boolean;
  categoryLabel?: string;
  onReset: () => void;
}

function EmptyState({ filtered, categoryLabel, onReset }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-20 md:py-28 text-center">
      {/* Icon */}
      <div className="relative mb-6">
        <div className="w-20 h-20 rounded-2xl bg-white border border-zinc-200 shadow-sm flex items-center justify-center">
          <PackageSearch className="h-9 w-9 text-zinc-300" aria-hidden="true" />
        </div>
        {/* Decorative dots */}
        <div className="absolute -top-1.5 -right-1.5 w-3 h-3 rounded-full bg-lynx-400" aria-hidden="true" />
        <div className="absolute -bottom-1 -left-2 w-2 h-2 rounded-full bg-zinc-300" aria-hidden="true" />
      </div>

      {filtered ? (
        <>
          <h2 className="text-lg font-semibold text-zinc-900 mb-2">
            Nothing in {categoryLabel} yet
          </h2>
          <p className="text-sm text-zinc-500 max-w-xs leading-relaxed mb-6">
            We&apos;re adding new products regularly. Browse all categories or
            check back soon.
          </p>
          <button
            type="button"
            onClick={onReset}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-zinc-900 text-white text-sm font-medium hover:bg-zinc-700 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900 focus-visible:ring-offset-2"
          >
            Browse all products
          </button>
        </>
      ) : (
        <>
          <h2 className="text-lg font-semibold text-zinc-900 mb-2">
            The shop is being stocked
          </h2>
          <p className="text-sm text-zinc-500 max-w-xs leading-relaxed">
            Our first products — NFC cards, review boards, and more — are
            arriving soon. You&apos;ll see them here the moment they&apos;re
            available.
          </p>
        </>
      )}
    </div>
  );
}
