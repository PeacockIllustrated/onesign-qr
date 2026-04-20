import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createAdminClient } from '@/lib/supabase/admin';
import { ShopProductForm } from '@/components/admin/shop-product-form';
import type { ShopProductRecord } from '@/types/shop';

interface Props {
  params: Promise<{ id: string }>;
}

export default async function EditShopProductPage({ params }: Props) {
  const { id } = await params;
  const admin = createAdminClient();
  const { data, error } = await admin
    .from('shop_products')
    .select(
      'id, slug, sku, name, description, category, base_price_pence, primary_image_url, gallery_image_urls, is_active, created_at, updated_at, deleted_at'
    )
    .eq('id', id)
    .single();

  if (error || !data) notFound();
  const product = data as unknown as ShopProductRecord;

  return (
    <div>
      <Link
        href="/admin/shop/products"
        className="text-sm text-gray-500 hover:underline"
      >
        ← Back to products
      </Link>
      <h1 className="text-2xl font-semibold my-4">{product.name}</h1>
      <ShopProductForm mode="edit" product={product} />
    </div>
  );
}
