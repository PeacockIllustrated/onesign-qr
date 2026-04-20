import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { ProductHero } from '@/components/shop/product-hero';
import { ComingSoonCta } from '@/components/shop/coming-soon-cta';
import type { ShopProductRecord } from '@/types/shop';
import type { Metadata } from 'next';

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const supabase = await createClient();
  const { data: product } = await supabase
    .from('shop_products')
    .select('name, description')
    .eq('slug', slug)
    .eq('is_active', true)
    .is('deleted_at', null)
    .single();

  if (!product) {
    return { title: 'Product not found — OneSign' };
  }

  return {
    title: `${product.name} — OneSign Shop`,
    description: product.description ?? undefined,
  };
}

export default async function ShopProductPage({ params }: PageProps) {
  const { slug } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/auth/login?next=/app/shop/${slug}`);
  }

  const { data: product } = await supabase
    .from('shop_products')
    .select(
      'id, slug, name, description, category, base_price_pence, primary_image_url, gallery_image_urls'
    )
    .eq('slug', slug)
    .eq('is_active', true)
    .is('deleted_at', null)
    .single();

  if (!product) {
    notFound();
  }

  const p = product as Pick<
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

  return (
    <div className="min-h-screen bg-zinc-900">
      {/* ─── Back-link strip ──────────────────────────────────── */}
      <div className="max-w-7xl mx-auto px-5 md:px-8 pt-6 pb-0">
        <Link
          href="/app/shop"
          className="inline-flex items-center gap-1.5 text-xs text-zinc-500 hover:text-lynx-400 transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lynx-400 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-900 rounded"
          aria-label="Back to shop"
        >
          <ChevronLeft
            className="h-3.5 w-3.5"
            aria-hidden="true"
            strokeWidth={2.5}
          />
          <span>Back to shop</span>
        </Link>
      </div>

      {/* ─── Product hero + How it works ──────────────────────── */}
      <ProductHero
        name={p.name}
        description={p.description}
        category={p.category}
        primary_image_url={p.primary_image_url}
        gallery_image_urls={p.gallery_image_urls}
      >
        <ComingSoonCta pricePence={p.base_price_pence} />
      </ProductHero>
    </div>
  );
}
