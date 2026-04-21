import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { ShopProductForm } from '@/components/admin/shop-product-form';

export default function NewShopProductPage() {
  return (
    <div>
      <Link
        href="/admin/shop/products"
        className="inline-flex items-center gap-1.5 text-xs text-zinc-500 hover:text-lynx-400 transition-colors"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Back to products
      </Link>
      <h1 className="text-2xl font-semibold tracking-tight text-zinc-50 mt-3 mb-6">
        New product
      </h1>
      <ShopProductForm mode="new" />
    </div>
  );
}
