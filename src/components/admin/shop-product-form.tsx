'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type {
  ShopProductCategory,
  ShopProductRecord,
} from '@/types/shop';
import { SHOP_CATEGORY_LABELS } from '@/types/shop';

interface FormState {
  slug: string;
  name: string;
  description: string;
  category: ShopProductCategory;
  base_price_pounds: string;
  primary_image_url: string;
  is_active: boolean;
}

function initialFromProduct(product?: ShopProductRecord): FormState {
  return {
    slug: product?.slug ?? '',
    name: product?.name ?? '',
    description: product?.description ?? '',
    category: product?.category ?? 'nfc_card',
    base_price_pounds: product
      ? (product.base_price_pence / 100).toFixed(2)
      : '',
    primary_image_url: product?.primary_image_url ?? '',
    is_active: product?.is_active ?? true,
  };
}

export function ShopProductForm({
  mode,
  product,
}: {
  mode: 'new' | 'edit';
  product?: ShopProductRecord;
}) {
  const router = useRouter();
  const [form, setForm] = useState<FormState>(initialFromProduct(product));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const pricePence = Math.round(
        parseFloat(form.base_price_pounds || '0') * 100
      );
      if (!Number.isFinite(pricePence) || pricePence < 0) {
        setError('Price must be a non-negative number');
        return;
      }

      const payloadCommon = {
        name: form.name.trim(),
        description: form.description.trim() || undefined,
        category: form.category,
        base_price_pence: pricePence,
        primary_image_url: form.primary_image_url.trim() || undefined,
        is_active: form.is_active,
      };

      let res: Response;
      if (mode === 'new') {
        res = await fetch('/api/admin/shop/products', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          credentials: 'same-origin',
          body: JSON.stringify({
            slug: form.slug.trim(),
            ...payloadCommon,
          }),
        });
      } else {
        res = await fetch(`/api/admin/shop/products/${product!.id}`, {
          method: 'PATCH',
          headers: { 'content-type': 'application/json' },
          credentials: 'same-origin',
          body: JSON.stringify(payloadCommon),
        });
      }

      if (!res.ok) {
        const json = (await res.json().catch(() => ({}))) as {
          error?: string;
        };
        setError(json.error ?? 'Save failed');
        return;
      }

      router.push('/admin/shop/products');
      router.refresh();
    } catch {
      setError('Save failed');
    } finally {
      setBusy(false);
    }
  }

  async function onDelete() {
    if (!product) return;
    if (!confirm(`Delete "${product.name}"? This is a soft delete.`)) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/shop/products/${product.id}`, {
        method: 'DELETE',
        credentials: 'same-origin',
      });
      if (!res.ok) {
        setError('Delete failed');
        return;
      }
      router.push('/admin/shop/products');
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  const categories: ShopProductCategory[] = [
    'nfc_card',
    'review_board',
    'table_talker',
    'window_decal',
    'badge',
    'other',
  ];

  return (
    <form onSubmit={onSubmit} className="max-w-xl space-y-4 bg-white border rounded p-6">
      <div>
        <label className="block text-sm font-medium mb-1" htmlFor="f-slug">
          Slug {mode === 'edit' && <span className="text-xs text-gray-500">(read-only)</span>}
        </label>
        <input
          id="f-slug"
          type="text"
          required
          disabled={mode === 'edit'}
          value={form.slug}
          onChange={(e) => setForm({ ...form, slug: e.target.value })}
          className="w-full border rounded px-3 py-2 text-sm disabled:bg-gray-50"
          placeholder="standard-nfc-card"
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-1" htmlFor="f-name">Name</label>
        <input
          id="f-name"
          type="text"
          required
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          className="w-full border rounded px-3 py-2 text-sm"
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-1" htmlFor="f-desc">Description</label>
        <textarea
          id="f-desc"
          rows={4}
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
          className="w-full border rounded px-3 py-2 text-sm"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1" htmlFor="f-cat">Category</label>
          <select
            id="f-cat"
            value={form.category}
            onChange={(e) =>
              setForm({ ...form, category: e.target.value as ShopProductCategory })
            }
            className="w-full border rounded px-3 py-2 text-sm"
          >
            {categories.map((c) => (
              <option key={c} value={c}>
                {SHOP_CATEGORY_LABELS[c]}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1" htmlFor="f-price">Price (£)</label>
          <input
            id="f-price"
            type="number"
            step="0.01"
            min="0"
            required
            value={form.base_price_pounds}
            onChange={(e) => setForm({ ...form, base_price_pounds: e.target.value })}
            className="w-full border rounded px-3 py-2 text-sm"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium mb-1" htmlFor="f-img">Primary image URL</label>
        <input
          id="f-img"
          type="url"
          value={form.primary_image_url}
          onChange={(e) => setForm({ ...form, primary_image_url: e.target.value })}
          className="w-full border rounded px-3 py-2 text-sm"
          placeholder="https://..."
        />
        <p className="text-xs text-gray-500 mt-1">
          For now, paste a URL. Storage-bucket upload UI is a follow-up.
        </p>
      </div>

      <div>
        <label className="inline-flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={form.is_active}
            onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
          />
          Active (visible to customers)
        </label>
      </div>

      {error && (
        <p className="text-sm text-red-600" role="alert">
          {error}
        </p>
      )}

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={busy}
          className="bg-black text-white px-4 py-2 rounded text-sm disabled:opacity-50"
        >
          {busy ? 'Saving…' : mode === 'new' ? 'Create product' : 'Save changes'}
        </button>
        {mode === 'edit' && (
          <button
            type="button"
            onClick={onDelete}
            disabled={busy}
            className="text-sm text-red-600 hover:underline ml-auto"
          >
            Delete
          </button>
        )}
      </div>
    </form>
  );
}
