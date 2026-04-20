import Link from 'next/link';
import { ShopProductForm } from '@/components/admin/shop-product-form';

export default function NewShopProductPage() {
  return (
    <div>
      <Link
        href="/admin/shop/products"
        className="text-sm text-gray-500 hover:underline"
      >
        ← Back to products
      </Link>
      <h1 className="text-2xl font-semibold my-4">New product</h1>
      <ShopProductForm mode="new" />
    </div>
  );
}
