import { redirect } from 'next/navigation';

export default function AdminShopIndex() {
  redirect('/admin/shop/products');
}
