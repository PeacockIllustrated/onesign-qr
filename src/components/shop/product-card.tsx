import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import { ShopImage } from '@/components/shop/shop-image';
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
      className="group relative flex flex-col bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden transition-all duration-300 hover:-translate-y-0.5 hover:border-lynx-400/40 hover:shadow-[0_8px_32px_-4px_rgba(88,163,134,0.18)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lynx-400 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950"
      aria-label={`View ${product.name} — ${formatGBP(product.base_price_pence)}`}
    >
      {/* Image area */}
      <div className="relative aspect-[4/3] bg-zinc-950 overflow-hidden">
        <ShopImage src={product.primary_image_url ?? null} alt={product.name} />

        {/* Price badge — top-right corner */}
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

        {/* CTA row */}
        <div className="mt-4 flex items-center justify-between">
          <span className="text-xs font-medium text-zinc-500 uppercase tracking-widest">
            From {formatGBP(product.base_price_pence)}
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
