import Link from 'next/link';
import { Plus, PackageSearch } from 'lucide-react';
import { createAdminClient } from '@/lib/supabase/admin';
import { Button } from '@/components/ui';
import type { ShopProductRecord } from '@/types/shop';
import { SHOP_CATEGORY_LABELS } from '@/types/shop';

function formatGBP(pence: number): string {
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP',
  }).format(pence / 100);
}

export default async function AdminShopProductsPage() {
  const admin = createAdminClient();
  const { data } = await admin
    .from('shop_products')
    .select(
      'id, slug, name, category, base_price_pence, is_active, deleted_at, created_at, primary_image_url'
    )
    .order('created_at', { ascending: false });

  const products = (data ?? []) as Array<
    Pick<
      ShopProductRecord,
      | 'id'
      | 'slug'
      | 'name'
      | 'category'
      | 'base_price_pence'
      | 'is_active'
      | 'deleted_at'
      | 'created_at'
      | 'primary_image_url'
    >
  >;

  return (
    <div>
      <div className="flex items-center justify-between mb-6 gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-50">
            Shop products
          </h1>
          <p className="text-sm text-zinc-400 mt-1">
            {products.length} {products.length === 1 ? 'product' : 'products'}
          </p>
        </div>
        <Link href="/admin/shop/products/new">
          <Button className="rounded-lg">
            <Plus className="h-4 w-4 mr-2" />
            New product
          </Button>
        </Link>
      </div>

      {products.length === 0 ? (
        <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-12 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-zinc-800 text-zinc-500 mb-4">
            <PackageSearch className="h-8 w-8" />
          </div>
          <p className="text-sm text-zinc-400">
            No products yet. Create your first one.
          </p>
        </div>
      ) : (
        <div className="rounded-xl border border-zinc-800 bg-zinc-900 divide-y divide-zinc-800 overflow-hidden">
          {products.map((p) => (
            <Link
              key={p.id}
              href={`/admin/shop/products/${p.id}`}
              className="flex items-center gap-4 p-4 hover:bg-zinc-800/60 transition-colors group"
            >
              <div className="w-16 h-16 bg-zinc-950 border border-zinc-800 rounded-lg overflow-hidden flex-shrink-0">
                {p.primary_image_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={p.primary_image_url}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                ) : null}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-medium text-zinc-50 truncate group-hover:text-lynx-400 transition-colors">
                  {p.name}
                </div>
                <div className="text-xs text-zinc-500 mt-0.5 flex items-center gap-2">
                  <span>{SHOP_CATEGORY_LABELS[p.category]}</span>
                  <span className="text-zinc-700">·</span>
                  <span className="font-mono">{p.slug}</span>
                  {!p.is_active && (
                    <>
                      <span className="text-zinc-700">·</span>
                      <span>inactive</span>
                    </>
                  )}
                  {p.deleted_at && (
                    <>
                      <span className="text-zinc-700">·</span>
                      <span className="text-destructive">deleted</span>
                    </>
                  )}
                </div>
              </div>
              <div className="text-sm font-semibold tabular-nums text-zinc-100 shrink-0">
                {formatGBP(p.base_price_pence)}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
