'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Input, Label, Select } from '@/components/ui';
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
    <form
      onSubmit={onSubmit}
      className="max-w-xl space-y-5 bg-zinc-900 border border-zinc-800 rounded-2xl p-6"
    >
      <div className="space-y-2">
        <Label htmlFor="f-slug">
          Slug{' '}
          {mode === 'edit' && (
            <span className="text-xs text-zinc-500 font-normal">(read-only)</span>
          )}
        </Label>
        <Input
          id="f-slug"
          type="text"
          required
          disabled={mode === 'edit'}
          value={form.slug}
          onChange={(e) => setForm({ ...form, slug: e.target.value })}
          placeholder="standard-nfc-card"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="f-name">Name</Label>
        <Input
          id="f-name"
          type="text"
          required
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="f-desc">Description</Label>
        <textarea
          id="f-desc"
          rows={4}
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
          className="flex w-full rounded-lg border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 transition-colors duration-150 resize-y"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="f-cat">Category</Label>
          <Select
            id="f-cat"
            value={form.category}
            onChange={(e) =>
              setForm({ ...form, category: e.target.value as ShopProductCategory })
            }
          >
            {categories.map((c) => (
              <option key={c} value={c}>
                {SHOP_CATEGORY_LABELS[c]}
              </option>
            ))}
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="f-price">Price (£)</Label>
          <Input
            id="f-price"
            type="number"
            step="0.01"
            min="0"
            required
            value={form.base_price_pounds}
            onChange={(e) =>
              setForm({ ...form, base_price_pounds: e.target.value })
            }
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="f-img">Primary image URL</Label>
        <Input
          id="f-img"
          type="url"
          value={form.primary_image_url}
          onChange={(e) =>
            setForm({ ...form, primary_image_url: e.target.value })
          }
          placeholder="https://..."
        />
        <p className="text-xs text-zinc-500">
          For now, paste a URL. Storage-bucket upload UI is a follow-up.
        </p>
      </div>

      <label className="inline-flex items-center gap-2 text-sm text-zinc-200 cursor-pointer">
        <input
          type="checkbox"
          checked={form.is_active}
          onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
          className="h-4 w-4 rounded border-zinc-700 bg-zinc-950 accent-lynx-500"
        />
        Active (visible to customers)
      </label>

      {error && (
        <p
          className="p-3 rounded-lg text-sm bg-destructive/15 text-destructive border border-destructive/30"
          role="alert"
        >
          {error}
        </p>
      )}

      <div className="flex items-center gap-3 pt-2">
        <Button type="submit" disabled={busy}>
          {busy ? 'Saving…' : mode === 'new' ? 'Create product' : 'Save changes'}
        </Button>
        {mode === 'edit' && (
          <button
            type="button"
            onClick={onDelete}
            disabled={busy}
            className="ml-auto text-sm font-semibold text-destructive hover:text-destructive/80 transition-colors"
          >
            Delete
          </button>
        )}
      </div>
    </form>
  );
}
