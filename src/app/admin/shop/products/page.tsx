import Link from 'next/link';
import { createAdminClient } from '@/lib/supabase/admin';
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
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold">Shop products</h1>
        <Link
          href="/admin/shop/products/new"
          className="bg-black text-white px-4 py-2 rounded text-sm"
        >
          New product
        </Link>
      </div>

      {products.length === 0 ? (
        <div className="bg-white border rounded p-8 text-center text-sm text-gray-500">
          No products yet. Create your first one.
        </div>
      ) : (
        <div className="bg-white border rounded divide-y">
          {products.map((p) => (
            <Link
              key={p.id}
              href={`/admin/shop/products/${p.id}`}
              className="block p-4 hover:bg-gray-50 flex items-center gap-4"
            >
              <div className="w-16 h-16 bg-gray-100 rounded overflow-hidden flex-shrink-0">
                {p.primary_image_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={p.primary_image_url}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                ) : null}
              </div>
              <div className="flex-1">
                <div className="font-medium">{p.name}</div>
                <div className="text-xs text-gray-500">
                  {SHOP_CATEGORY_LABELS[p.category]} · {p.slug}
                  {!p.is_active ? ' · inactive' : ''}
                  {p.deleted_at ? ' · deleted' : ''}
                </div>
              </div>
              <div className="text-sm font-medium">
                {formatGBP(p.base_price_pence)}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
