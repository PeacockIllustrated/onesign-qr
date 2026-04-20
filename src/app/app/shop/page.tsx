import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { ShopCatalog } from './shop-catalog';
import type { ShopProductRecord } from '@/types/shop';

export const metadata = {
  title: 'Shop — OneSign',
  description: 'Premium NFC cards, review boards, table talkers and more for your business.',
};

export default async function ShopPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/auth/login?next=/app/shop');
  }

  const { data } = await supabase
    .from('shop_products')
    .select(
      'id, slug, name, description, category, base_price_pence, primary_image_url, gallery_image_urls'
    )
    .eq('is_active', true)
    .is('deleted_at', null)
    .order('created_at', { ascending: false });

  const products = (data ?? []) as Pick<
    ShopProductRecord,
    | 'id'
    | 'slug'
    | 'name'
    | 'description'
    | 'category'
    | 'base_price_pence'
    | 'primary_image_url'
    | 'gallery_image_urls'
  >[];

  return <ShopCatalog products={products} />;
}
