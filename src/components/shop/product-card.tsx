import Link from 'next/link';
import Image from 'next/image';
import { ArrowUpRight } from 'lucide-react';
import type { ShopProductRecord } from '@/types/shop';

type ProductCardProps = {
  product: Pick<
    ShopProductRecord,
    'id' | 'slug' | 'name' | 'description' | 'category' | 'base_price_pence' | 'primary_image_url'
  >;
};

function formatGBP(pence: number): string {
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP',
  }).format(pence / 100);
}

export function ProductCard({ product }: ProductCardProps) {
  return (
    <Link
      href={`/app/shop/${product.slug}`}
      className="group relative flex flex-col bg-white border border-zinc-200/80 rounded-2xl overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_8px_32px_-4px_rgba(0,0,0,0.12)] hover:border-zinc-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900 focus-visible:ring-offset-2"
      aria-label={`View ${product.name} — ${formatGBP(product.base_price_pence)}`}
    >
      {/* Image area */}
      <div className="relative aspect-[4/3] bg-zinc-50 overflow-hidden">
        {product.primary_image_url ? (
          <Image
            src={product.primary_image_url}
            alt={product.name}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            className="object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          /* Placeholder — geometric pattern suggesting a physical product */
          <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-zinc-100 to-zinc-200">
            <div className="relative w-16 h-16">
              <div className="absolute inset-0 border-2 border-zinc-300 rounded-lg rotate-6" />
              <div className="absolute inset-0 border-2 border-zinc-400 rounded-lg -rotate-3" />
              <div className="absolute inset-0 border-2 border-zinc-500 rounded-lg" />
            </div>
          </div>
        )}

        {/* Price badge — top-right corner */}
        <div className="absolute top-3 right-3 bg-white/95 backdrop-blur-sm px-2.5 py-1 rounded-full text-xs font-semibold text-zinc-900 shadow-sm border border-zinc-200/60 tabular-nums">
          {formatGBP(product.base_price_pence)}
        </div>
      </div>

      {/* Content */}
      <div className="flex flex-col flex-1 p-5">
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-zinc-900 leading-tight tracking-tight truncate">
            {product.name}
          </h3>
          {product.description && (
            <p className="mt-1.5 text-sm text-zinc-500 line-clamp-2 leading-relaxed">
              {product.description}
            </p>
          )}
        </div>

        {/* CTA row */}
        <div className="mt-4 flex items-center justify-between">
          <span className="text-xs font-medium text-zinc-400 uppercase tracking-widest">
            From {formatGBP(product.base_price_pence)}
          </span>
          <span
            className="inline-flex items-center gap-1 text-xs font-semibold text-zinc-900 bg-zinc-100 rounded-full px-3 py-1.5 transition-all duration-200 group-hover:bg-zinc-900 group-hover:text-white"
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
