# Shopfront: Foundation + Admin Product Management + Aesthetic Customer Browse

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a browsable, aesthetically polished `/app/shop` where logged-in orgs can see OneSign-branded physical merchandise (NFC cards, review boards, table talkers) — plus the `/admin/shop/products` CRUD for seeding products. Checkout is intentionally deferred to a follow-up plan; the "Buy" button renders but is disabled with a "coming soon" note.

**Architecture:** Five new DB tables (`shop_products`, `shop_product_variants`, `shop_product_customizations`, `shop_orders`, `shop_order_items`) shipped together so the schema is complete up front. Admin UI is utility-styled (matching existing `/admin` chrome). Customer UI (`/app/shop/*`) uses the `frontend-design` skill for a distinctive, high-quality look — this is deliberately the focal design moment. Product images live in a new `shop-product-media` storage bucket, publicly readable (products are catalog items shown to authenticated users).

**Tech Stack:** Next.js 16 App Router, TypeScript, Supabase (Postgres + storage), Vitest, Zod, Tailwind CSS. No new dependencies in this plan (Stripe comes in the follow-up plan).

**Prerequisites (must be true before starting):**
- Super-admin dashboard live in production (`/admin` reachable by platform admins).
- Phase 0 foundation complete (org-scoped RLS, `org_id` populated on owned tables).

**Scope boundary:**
- ✅ **In scope:** migration 00024 (5 tables + RLS + storage bucket), types + Zod schemas for shop records, admin product CRUD API + UI, customer-facing `/app/shop` list and product detail (aesthetic), admin nav link, app nav link, runbook.
- ❌ **Out of scope (deferred to the Stripe/Orders follow-up plan):** Stripe Checkout integration, payment webhook, order fulfilment kanban, ship email, customer checkout flow, Stripe subscription billing for app tier. The "Buy" CTA on product detail is rendered as a disabled button with "Coming soon" copy in this plan.
- ❌ **Deliberately simple for MVP:** the admin UI only edits top-level product fields (name, description, base_price, image, category, active). Variants and customizations exist in the schema but aren't exposed in the admin UI — a later pass can add them when shopfront grows. Operator can edit via the Supabase Dashboard if needed before the UI ships.

**Reference spec:** `docs/superpowers/specs/2026-04-17-onesign-lynx-h1-h2-design.md` — Section 4.3 (Shopfront).

---

## File structure

**Created:**
- `supabase/migrations/00024_shopfront.sql` — 5 tables + enum + RLS + storage bucket + public bucket policy.
- `src/types/shop.ts` — record types: `ShopProductRecord`, `ShopProductVariantRecord`, `ShopProductCustomizationRecord`, `ShopOrderRecord`, `ShopOrderItemRecord`, `ShopProductCategory`, `ShopOrderStatus`.
- `src/validations/shop.ts` — Zod: `createShopProductSchema`, `updateShopProductSchema`.
- `src/__tests__/validations/shop.test.ts` — unit tests.
- `src/app/api/admin/shop/products/route.ts` — POST (create) + GET (list).
- `src/app/api/admin/shop/products/[id]/route.ts` — GET, PATCH, DELETE (soft).
- `src/__tests__/app/api/admin/shop/products.test.ts` — unit tests.
- `src/app/api/shop/products/route.ts` — public-to-authenticated-users list (for /app/shop).
- `src/app/admin/shop/page.tsx` — redirects to `/admin/shop/products`.
- `src/app/admin/shop/products/page.tsx` — admin product list.
- `src/app/admin/shop/products/new/page.tsx` — create form.
- `src/app/admin/shop/products/[id]/page.tsx` — edit form.
- `src/components/admin/shop-product-form.tsx` — shared client component for new/edit.
- `src/app/app/shop/page.tsx` — aesthetic customer-facing catalog.
- `src/app/app/shop/[slug]/page.tsx` — aesthetic product detail.
- `src/components/shop/product-card.tsx` — product card used in `/app/shop`.
- `src/components/shop/product-hero.tsx` — product detail hero.
- `src/components/shop/coming-soon-cta.tsx` — disabled "Buy" button with "coming soon" copy.

**Modified:**
- `src/components/admin/admin-nav.tsx` — add "Shop" link.
- `src/components/layout/app-sidebar.tsx` — add "Shop" link.
- `docs/superpowers/runbooks/phase-0-migration.md` — append Shopfront deploy section.

**Not touched:**
- Any existing RLS policy, API route, or org-scoped feature.

---

## Part 1 — Schema and types

### Task 1: Migration 00024 (shop tables + storage bucket)

**Files:**
- Create: `supabase/migrations/00024_shopfront.sql`

Five tables, one enum. RLS rules:
- `shop_products`, `shop_product_variants`, `shop_product_customizations`: public to authenticated users (so every org can browse). Only platform admins can INSERT/UPDATE/DELETE (catalog is OneSign-managed).
- `shop_orders`, `shop_order_items`: owner-org SELECT; only platform admins can INSERT/UPDATE/DELETE for now (customer checkout will use service-role route handler in the follow-up plan).
- Storage bucket `shop-product-media`: public SELECT; platform-admin INSERT/UPDATE/DELETE.

- [ ] **Step 1: Create the migration file**

```sql
-- Migration: Shopfront — products, variants, customizations, orders, order items
--
-- OneSign-branded physical merchandise storefront. Five tables shipped
-- together so the schema is complete up front:
--   - shop_products: catalog items (name, description, base_price, media,
--     category, is_active)
--   - shop_product_variants: size/color/qty variants with price deltas
--   - shop_product_customizations: per-product fields like
--     logo/bio_page_link/custom_text
--   - shop_orders: customer orders (org-owned)
--   - shop_order_items: line items within an order
--
-- RLS policies use existing is_platform_admin() + is_member_of_org() helpers
-- from migration 00018.
--
-- Storage bucket 'shop-product-media' stores product imagery, publicly
-- readable (product catalog is shown to authenticated users).
--
-- GBP only — price stored as integer pence (no currency column yet).

BEGIN;

-- =============================================================================
-- ENUMS
-- =============================================================================

DO $$ BEGIN
  CREATE TYPE shop_product_category AS ENUM (
    'nfc_card',
    'review_board',
    'table_talker',
    'window_decal',
    'badge',
    'other'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE shop_order_status AS ENUM (
    'pending',
    'paid',
    'in_production',
    'shipped',
    'delivered',
    'cancelled',
    'refunded'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE shop_customization_field_type AS ENUM (
    'logo',
    'bio_page_link',
    'custom_text',
    'color'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- =============================================================================
-- TABLE: shop_products
-- =============================================================================

CREATE TABLE IF NOT EXISTS shop_products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  slug TEXT NOT NULL,
  sku TEXT,
  name TEXT NOT NULL,
  description TEXT,
  category shop_product_category NOT NULL DEFAULT 'other',
  base_price_pence INT NOT NULL CHECK (base_price_pence >= 0),
  primary_image_url TEXT,
  gallery_image_urls JSONB,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_shop_products_slug_active
  ON shop_products(slug) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_shop_products_active_category
  ON shop_products(category, is_active) WHERE deleted_at IS NULL;

ALTER TABLE shop_products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "shop_products_select_authenticated"
  ON shop_products FOR SELECT
  TO authenticated
  USING (is_active = true AND deleted_at IS NULL);

CREATE POLICY "shop_products_all_platform_admin"
  ON shop_products FOR ALL
  TO authenticated
  USING (is_platform_admin())
  WITH CHECK (is_platform_admin());

-- updated_at trigger
CREATE OR REPLACE FUNCTION touch_shop_products_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_shop_products_updated_at ON shop_products;
CREATE TRIGGER trg_shop_products_updated_at
  BEFORE UPDATE ON shop_products
  FOR EACH ROW EXECUTE FUNCTION touch_shop_products_updated_at();

-- =============================================================================
-- TABLE: shop_product_variants
-- =============================================================================

CREATE TABLE IF NOT EXISTS shop_product_variants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID NOT NULL REFERENCES shop_products(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  sku TEXT,
  price_delta_pence INT NOT NULL DEFAULT 0,
  stock_qty INT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_shop_variants_product
  ON shop_product_variants(product_id, sort_order);

ALTER TABLE shop_product_variants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "shop_variants_select_authenticated"
  ON shop_product_variants FOR SELECT
  TO authenticated
  USING (
    is_active = true AND EXISTS (
      SELECT 1 FROM shop_products p
      WHERE p.id = shop_product_variants.product_id
        AND p.is_active = true AND p.deleted_at IS NULL
    )
  );

CREATE POLICY "shop_variants_all_platform_admin"
  ON shop_product_variants FOR ALL
  TO authenticated
  USING (is_platform_admin())
  WITH CHECK (is_platform_admin());

-- =============================================================================
-- TABLE: shop_product_customizations
-- =============================================================================

CREATE TABLE IF NOT EXISTS shop_product_customizations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID NOT NULL REFERENCES shop_products(id) ON DELETE CASCADE,
  field_key TEXT NOT NULL,
  field_label TEXT NOT NULL,
  field_type shop_customization_field_type NOT NULL,
  is_required BOOLEAN NOT NULL DEFAULT false,
  constraints JSONB,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_shop_customizations_product
  ON shop_product_customizations(product_id, sort_order);
CREATE UNIQUE INDEX IF NOT EXISTS idx_shop_customizations_unique
  ON shop_product_customizations(product_id, field_key);

ALTER TABLE shop_product_customizations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "shop_customizations_select_authenticated"
  ON shop_product_customizations FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM shop_products p
      WHERE p.id = shop_product_customizations.product_id
        AND p.is_active = true AND p.deleted_at IS NULL
    )
  );

CREATE POLICY "shop_customizations_all_platform_admin"
  ON shop_product_customizations FOR ALL
  TO authenticated
  USING (is_platform_admin())
  WITH CHECK (is_platform_admin());

-- =============================================================================
-- TABLE: shop_orders
-- =============================================================================

CREATE TABLE IF NOT EXISTS shop_orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE RESTRICT,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  stripe_session_id TEXT,
  stripe_payment_intent_id TEXT,
  status shop_order_status NOT NULL DEFAULT 'pending',
  subtotal_pence INT NOT NULL DEFAULT 0,
  shipping_pence INT NOT NULL DEFAULT 0,
  tax_pence INT NOT NULL DEFAULT 0,
  total_pence INT NOT NULL DEFAULT 0,
  shipping_address JSONB,
  tracking_number TEXT,
  internal_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_shop_orders_org
  ON shop_orders(org_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_shop_orders_status
  ON shop_orders(status, created_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS idx_shop_orders_stripe_session
  ON shop_orders(stripe_session_id) WHERE stripe_session_id IS NOT NULL;

ALTER TABLE shop_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "shop_orders_select_org_member"
  ON shop_orders FOR SELECT
  TO authenticated
  USING (is_platform_admin() OR is_member_of_org(org_id));

-- Customer checkout will INSERT via service-role route handler in the follow-up
-- plan; for now only platform admins can write.
CREATE POLICY "shop_orders_all_platform_admin"
  ON shop_orders FOR ALL
  TO authenticated
  USING (is_platform_admin())
  WITH CHECK (is_platform_admin());

CREATE OR REPLACE FUNCTION touch_shop_orders_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_shop_orders_updated_at ON shop_orders;
CREATE TRIGGER trg_shop_orders_updated_at
  BEFORE UPDATE ON shop_orders
  FOR EACH ROW EXECUTE FUNCTION touch_shop_orders_updated_at();

-- =============================================================================
-- TABLE: shop_order_items
-- =============================================================================

CREATE TABLE IF NOT EXISTS shop_order_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID NOT NULL REFERENCES shop_orders(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES shop_products(id) ON DELETE RESTRICT,
  variant_id UUID REFERENCES shop_product_variants(id) ON DELETE SET NULL,
  customization_values JSONB,
  quantity INT NOT NULL CHECK (quantity > 0),
  unit_price_pence INT NOT NULL CHECK (unit_price_pence >= 0),
  line_total_pence INT NOT NULL CHECK (line_total_pence >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_shop_order_items_order
  ON shop_order_items(order_id);

ALTER TABLE shop_order_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "shop_order_items_select_via_order"
  ON shop_order_items FOR SELECT
  TO authenticated
  USING (
    is_platform_admin() OR EXISTS (
      SELECT 1 FROM shop_orders o
      WHERE o.id = shop_order_items.order_id
        AND is_member_of_org(o.org_id)
    )
  );

CREATE POLICY "shop_order_items_all_platform_admin"
  ON shop_order_items FOR ALL
  TO authenticated
  USING (is_platform_admin())
  WITH CHECK (is_platform_admin());

-- =============================================================================
-- STORAGE BUCKET: shop-product-media
-- =============================================================================

INSERT INTO storage.buckets (id, name, public)
VALUES ('shop-product-media', 'shop-product-media', true)
ON CONFLICT (id) DO NOTHING;

-- Public read of product media.
DROP POLICY IF EXISTS "shop_product_media_public_select" ON storage.objects;
CREATE POLICY "shop_product_media_public_select"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'shop-product-media');

-- Only platform admins can upload/update/delete product media.
DROP POLICY IF EXISTS "shop_product_media_insert_admin" ON storage.objects;
CREATE POLICY "shop_product_media_insert_admin"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'shop-product-media' AND is_platform_admin());

DROP POLICY IF EXISTS "shop_product_media_update_admin" ON storage.objects;
CREATE POLICY "shop_product_media_update_admin"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'shop-product-media' AND is_platform_admin());

DROP POLICY IF EXISTS "shop_product_media_delete_admin" ON storage.objects;
CREATE POLICY "shop_product_media_delete_admin"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'shop-product-media' AND is_platform_admin());

COMMIT;
```

- [ ] **Step 2: Run schema-lint**

Run: `npm run migration:schema-lint`
Expected: `Migration schema-lint passed.`

- [ ] **Step 3: Run tests**

Run: `npm run test:run`
Expected: 210 tests pass.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/00024_shopfront.sql
git commit -m "feat: migration 00024 adds shopfront schema (5 tables + storage)"
```

---

### Task 2: TypeScript types for shop records

**Files:**
- Create: `src/types/shop.ts`

- [ ] **Step 1: Create the types file**

```typescript
export type ShopProductCategory =
  | 'nfc_card'
  | 'review_board'
  | 'table_talker'
  | 'window_decal'
  | 'badge'
  | 'other';

export type ShopOrderStatus =
  | 'pending'
  | 'paid'
  | 'in_production'
  | 'shipped'
  | 'delivered'
  | 'cancelled'
  | 'refunded';

export type ShopCustomizationFieldType =
  | 'logo'
  | 'bio_page_link'
  | 'custom_text'
  | 'color';

export interface ShopProductRecord {
  id: string;
  slug: string;
  sku: string | null;
  name: string;
  description: string | null;
  category: ShopProductCategory;
  base_price_pence: number;
  primary_image_url: string | null;
  gallery_image_urls: string[] | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface ShopProductVariantRecord {
  id: string;
  product_id: string;
  label: string;
  sku: string | null;
  price_delta_pence: number;
  stock_qty: number | null;
  is_active: boolean;
  sort_order: number;
  created_at: string;
}

export interface ShopProductCustomizationRecord {
  id: string;
  product_id: string;
  field_key: string;
  field_label: string;
  field_type: ShopCustomizationFieldType;
  is_required: boolean;
  constraints: Record<string, unknown> | null;
  sort_order: number;
  created_at: string;
}

export interface ShopOrderRecord {
  id: string;
  org_id: string;
  user_id: string | null;
  stripe_session_id: string | null;
  stripe_payment_intent_id: string | null;
  status: ShopOrderStatus;
  subtotal_pence: number;
  shipping_pence: number;
  tax_pence: number;
  total_pence: number;
  shipping_address: Record<string, unknown> | null;
  tracking_number: string | null;
  internal_notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface ShopOrderItemRecord {
  id: string;
  order_id: string;
  product_id: string;
  variant_id: string | null;
  customization_values: Record<string, unknown> | null;
  quantity: number;
  unit_price_pence: number;
  line_total_pence: number;
  created_at: string;
}

/**
 * UI helper: human label for a category enum value.
 */
export const SHOP_CATEGORY_LABELS: Record<ShopProductCategory, string> = {
  nfc_card: 'NFC Cards',
  review_board: 'Review Boards',
  table_talker: 'Table Talkers',
  window_decal: 'Window Decals',
  badge: 'Badges',
  other: 'Other',
};
```

- [ ] **Step 2: Typecheck + commit**

```
npm run type-check
```

```bash
git add src/types/shop.ts
git commit -m "feat: add shop record TypeScript types"
```

---

### Task 3: Zod schemas for shop product endpoints with TDD

**Files:**
- Create: `src/validations/shop.ts`
- Create: `src/__tests__/validations/shop.test.ts`

- [ ] **Step 1: Failing tests**

Create `src/__tests__/validations/shop.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import {
  createShopProductSchema,
  updateShopProductSchema,
} from '@/validations/shop';

describe('createShopProductSchema', () => {
  it('accepts a minimal valid payload', () => {
    const r = createShopProductSchema.safeParse({
      slug: 'standard-nfc-card',
      name: 'Standard NFC Card',
      category: 'nfc_card',
      base_price_pence: 1000,
    });
    expect(r.success).toBe(true);
  });

  it('accepts a payload with all optional fields', () => {
    const r = createShopProductSchema.safeParse({
      slug: 'review-board-a5',
      sku: 'RB-A5-BLK',
      name: 'Review Board A5',
      description: 'Matte black aluminium, QR etched.',
      category: 'review_board',
      base_price_pence: 2500,
      primary_image_url: 'https://example.com/rb.jpg',
      gallery_image_urls: [
        'https://example.com/rb-1.jpg',
        'https://example.com/rb-2.jpg',
      ],
      is_active: true,
    });
    expect(r.success).toBe(true);
  });

  it('rejects empty slug', () => {
    expect(
      createShopProductSchema.safeParse({
        slug: '',
        name: 'x',
        category: 'nfc_card',
        base_price_pence: 1,
      }).success
    ).toBe(false);
  });

  it('rejects a slug with uppercase or spaces', () => {
    expect(
      createShopProductSchema.safeParse({
        slug: 'Standard Card',
        name: 'x',
        category: 'nfc_card',
        base_price_pence: 1,
      }).success
    ).toBe(false);
  });

  it('rejects negative price', () => {
    expect(
      createShopProductSchema.safeParse({
        slug: 'x',
        name: 'x',
        category: 'nfc_card',
        base_price_pence: -1,
      }).success
    ).toBe(false);
  });

  it('rejects unknown category', () => {
    expect(
      createShopProductSchema.safeParse({
        slug: 'x',
        name: 'x',
        category: 'rocket_fuel',
        base_price_pence: 1,
      }).success
    ).toBe(false);
  });
});

describe('updateShopProductSchema', () => {
  it('accepts a partial update', () => {
    expect(
      updateShopProductSchema.safeParse({ name: 'Renamed' }).success
    ).toBe(true);
    expect(updateShopProductSchema.safeParse({}).success).toBe(true);
  });

  it('rejects a slug change (slug is create-time only)', () => {
    const r = updateShopProductSchema.safeParse({ slug: 'new-slug' });
    if (r.success) {
      expect('slug' in r.data).toBe(false);
    }
  });
});
```

- [ ] **Step 2: Run — expect FAIL**

Run: `npm run test:run -- src/__tests__/validations/shop.test.ts`

- [ ] **Step 3: Write schemas**

Create `src/validations/shop.ts`:

```typescript
import { z } from 'zod';

const slugSchema = z
  .string()
  .min(1)
  .max(80)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
    message: 'Slug must be lowercase letters, digits, and hyphens only',
  });

const categorySchema = z.enum([
  'nfc_card',
  'review_board',
  'table_talker',
  'window_decal',
  'badge',
  'other',
]);

const priceSchema = z.number().int().min(0).max(10_000_000);
const optionalUrl = z.string().url().max(2000).optional();
const optionalUrls = z.array(z.string().url().max(2000)).max(20).optional();

export const createShopProductSchema = z.object({
  slug: slugSchema,
  sku: z.string().max(80).optional(),
  name: z.string().min(1).max(160),
  description: z.string().max(10_000).optional(),
  category: categorySchema,
  base_price_pence: priceSchema,
  primary_image_url: optionalUrl,
  gallery_image_urls: optionalUrls,
  is_active: z.boolean().optional(),
});
export type CreateShopProductInput = z.infer<typeof createShopProductSchema>;

export const updateShopProductSchema = z
  .object({
    sku: z.string().max(80).optional(),
    name: z.string().min(1).max(160).optional(),
    description: z.string().max(10_000).optional(),
    category: categorySchema.optional(),
    base_price_pence: priceSchema.optional(),
    primary_image_url: optionalUrl,
    gallery_image_urls: optionalUrls,
    is_active: z.boolean().optional(),
  })
  .strict();
export type UpdateShopProductInput = z.infer<typeof updateShopProductSchema>;
```

- [ ] **Step 4: Run tests — expect PASS**

Run: `npm run test:run -- src/__tests__/validations/shop.test.ts`
Expected: 8 tests pass.

- [ ] **Step 5: Full suite + typecheck**

```
npm run test:run
npm run type-check
```
Expected: 218 tests pass.

- [ ] **Step 6: Commit**

```bash
git add src/validations/shop.ts src/__tests__/validations/shop.test.ts
git commit -m "feat: add shop product Zod schemas"
```

---

## Part 2 — Admin API

### Task 4: POST + GET `/api/admin/shop/products`

**Files:**
- Create: `src/app/api/admin/shop/products/route.ts`
- Create: `src/__tests__/app/api/admin/shop/products.test.ts`

`POST`: platform admin only (checked via `isPlatformAdmin`). Body validated via `createShopProductSchema`. Inserts row and returns 201.

`GET`: platform admin only. Returns all products (active + inactive + deleted for admin visibility), ordered by `created_at DESC`.

- [ ] **Step 1: Write failing tests**

```typescript
// src/__tests__/app/api/admin/shop/products.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockSupabase = {
  auth: { getUser: vi.fn() },
  from: vi.fn(),
};
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(async () => mockSupabase),
}));

const mockAdmin = { from: vi.fn() };
vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: vi.fn(() => mockAdmin),
}));

const mockIsPlatformAdmin = vi.fn();
vi.mock('@/lib/admin/is-platform-admin', () => ({
  isPlatformAdmin: (...args: unknown[]) => mockIsPlatformAdmin(...args),
}));

import { POST, GET } from '@/app/api/admin/shop/products/route';

function jsonRequest(body: unknown) {
  return new Request('http://localhost:3000/api/admin/shop/products', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('POST /api/admin/shop/products', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns 401 when unauthenticated', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: null },
      error: null,
    });
    const res = await POST(jsonRequest({}));
    expect(res.status).toBe(401);
  });

  it('returns 403 when not a platform admin', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: 'u1' } },
      error: null,
    });
    mockIsPlatformAdmin.mockResolvedValue(false);
    const res = await POST(jsonRequest({
      slug: 'x', name: 'x', category: 'nfc_card', base_price_pence: 1,
    }));
    expect(res.status).toBe(403);
  });

  it('returns 400 on invalid body', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: 'u1' } },
      error: null,
    });
    mockIsPlatformAdmin.mockResolvedValue(true);
    const res = await POST(jsonRequest({ slug: '' }));
    expect(res.status).toBe(400);
  });

  it('returns 201 with the created product', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: 'u1' } },
      error: null,
    });
    mockIsPlatformAdmin.mockResolvedValue(true);

    const single = vi.fn().mockResolvedValue({
      data: {
        id: 'prod-1',
        slug: 'nfc-card',
        name: 'NFC Card',
        category: 'nfc_card',
        base_price_pence: 1000,
        is_active: true,
        created_at: '2026-04-20T00:00:00Z',
      },
      error: null,
    });
    mockAdmin.from.mockReturnValue({
      insert: () => ({ select: () => ({ single }) }),
    });

    const res = await POST(jsonRequest({
      slug: 'nfc-card',
      name: 'NFC Card',
      category: 'nfc_card',
      base_price_pence: 1000,
    }));
    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json.product.slug).toBe('nfc-card');
  });

  it('returns 409 on unique slug conflict', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: 'u1' } },
      error: null,
    });
    mockIsPlatformAdmin.mockResolvedValue(true);

    const single = vi.fn().mockResolvedValue({
      data: null,
      error: { code: '23505', message: 'duplicate' },
    });
    mockAdmin.from.mockReturnValue({
      insert: () => ({ select: () => ({ single }) }),
    });

    const res = await POST(jsonRequest({
      slug: 'dup',
      name: 'dup',
      category: 'nfc_card',
      base_price_pence: 1,
    }));
    expect(res.status).toBe(409);
  });
});

describe('GET /api/admin/shop/products', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns 401 when unauthenticated', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: null },
      error: null,
    });
    const res = await GET();
    expect(res.status).toBe(401);
  });

  it('returns 403 when not a platform admin', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: 'u1' } },
      error: null,
    });
    mockIsPlatformAdmin.mockResolvedValue(false);
    const res = await GET();
    expect(res.status).toBe(403);
  });

  it('returns the product list', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: 'u1' } },
      error: null,
    });
    mockIsPlatformAdmin.mockResolvedValue(true);

    const order = vi.fn().mockResolvedValue({
      data: [
        { id: 'p1', slug: 'a', name: 'A', category: 'nfc_card', base_price_pence: 100, is_active: true },
      ],
      error: null,
    });
    mockAdmin.from.mockReturnValue({
      select: () => ({ order }),
    });

    const res = await GET();
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.products).toHaveLength(1);
  });
});
```

- [ ] **Step 2: Run — expect FAIL**

Run: `npm run test:run -- src/__tests__/app/api/admin/shop/products.test.ts`

- [ ] **Step 3: Write the handlers**

Create `src/app/api/admin/shop/products/route.ts`:

```typescript
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { isPlatformAdmin } from '@/lib/admin/is-platform-admin';
import { createShopProductSchema } from '@/validations/shop';

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const isAdmin = await isPlatformAdmin(user.id);
  if (!isAdmin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const parse = createShopProductSchema.safeParse(body);
  if (!parse.success) {
    return NextResponse.json(
      { error: 'Invalid body', details: parse.error.flatten() },
      { status: 400 }
    );
  }

  const admin = createAdminClient();
  const { data: product, error } = await admin
    .from('shop_products')
    .insert({
      slug: parse.data.slug,
      sku: parse.data.sku ?? null,
      name: parse.data.name,
      description: parse.data.description ?? null,
      category: parse.data.category,
      base_price_pence: parse.data.base_price_pence,
      primary_image_url: parse.data.primary_image_url ?? null,
      gallery_image_urls: parse.data.gallery_image_urls ?? null,
      is_active: parse.data.is_active ?? true,
    })
    .select(
      'id, slug, sku, name, description, category, base_price_pence, primary_image_url, gallery_image_urls, is_active, created_at, updated_at, deleted_at'
    )
    .single();

  if (error) {
    if ((error as { code?: string }).code === '23505') {
      return NextResponse.json(
        { error: 'A product with that slug already exists' },
        { status: 409 }
      );
    }
    console.error('[admin shop products POST] insert failed', error);
    return NextResponse.json(
      { error: 'Failed to create product' },
      { status: 500 }
    );
  }

  return NextResponse.json({ product }, { status: 201 });
}

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const isAdmin = await isPlatformAdmin(user.id);
  if (!isAdmin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from('shop_products')
    .select(
      'id, slug, sku, name, description, category, base_price_pence, primary_image_url, gallery_image_urls, is_active, created_at, updated_at, deleted_at'
    )
    .order('created_at', { ascending: false });

  if (error) {
    return NextResponse.json(
      { error: 'Failed to load products' },
      { status: 500 }
    );
  }

  return NextResponse.json({ products: data ?? [] });
}
```

- [ ] **Step 4: Run tests — expect PASS**

Run: `npm run test:run -- src/__tests__/app/api/admin/shop/products.test.ts`
Expected: 8 tests pass.

- [ ] **Step 5: Full suite + typecheck**

```
npm run test:run
npm run type-check
```
Expected: 226 tests pass.

- [ ] **Step 6: Commit**

```bash
git add src/app/api/admin/shop/products/route.ts src/__tests__/app/api/admin/shop/products.test.ts
git commit -m "feat: admin POST/GET /api/admin/shop/products"
```

---

### Task 5: GET + PATCH + DELETE `/api/admin/shop/products/[id]`

**Files:**
- Create: `src/app/api/admin/shop/products/[id]/route.ts`

Detail endpoint for admin. GET returns one product. PATCH applies `updateShopProductSchema`. DELETE is soft — sets `deleted_at = now()` and `is_active = false` rather than hard-delete (so order line-items with FK to product can still resolve).

- [ ] **Step 1: Write the handler**

```typescript
// src/app/api/admin/shop/products/[id]/route.ts
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { isPlatformAdmin } from '@/lib/admin/is-platform-admin';
import { updateShopProductSchema } from '@/validations/shop';

async function requireAdmin(): Promise<
  { error: Response } | { userId: string }
> {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) {
    return {
      error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
    };
  }
  const ok = await isPlatformAdmin(user.id);
  if (!ok) {
    return {
      error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }),
    };
  }
  return { userId: user.id };
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const gate = await requireAdmin();
  if ('error' in gate) return gate.error;
  const { id } = await params;

  const admin = createAdminClient();
  const { data, error } = await admin
    .from('shop_products')
    .select(
      'id, slug, sku, name, description, category, base_price_pence, primary_image_url, gallery_image_urls, is_active, created_at, updated_at, deleted_at'
    )
    .eq('id', id)
    .single();

  if (error || !data) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
  return NextResponse.json({ product: data });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const gate = await requireAdmin();
  if ('error' in gate) return gate.error;
  const { id } = await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const parse = updateShopProductSchema.safeParse(body);
  if (!parse.success) {
    return NextResponse.json(
      { error: 'Invalid body', details: parse.error.flatten() },
      { status: 400 }
    );
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from('shop_products')
    .update(parse.data)
    .eq('id', id)
    .select(
      'id, slug, sku, name, description, category, base_price_pence, primary_image_url, gallery_image_urls, is_active, created_at, updated_at, deleted_at'
    )
    .single();

  if (error || !data) {
    return NextResponse.json({ error: 'Update failed' }, { status: 500 });
  }
  return NextResponse.json({ product: data });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const gate = await requireAdmin();
  if ('error' in gate) return gate.error;
  const { id } = await params;

  const admin = createAdminClient();
  const { error } = await admin
    .from('shop_products')
    .update({ deleted_at: new Date().toISOString(), is_active: false })
    .eq('id', id);

  if (error) {
    return NextResponse.json({ error: 'Delete failed' }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 2: Typecheck + tests**

```
npm run type-check
npm run test:run
```
Expected: all pass.

- [ ] **Step 3: Commit**

```bash
git add "src/app/api/admin/shop/products/[id]/route.ts"
git commit -m "feat: admin GET/PATCH/DELETE /api/admin/shop/products/[id]"
```

---

### Task 6: Public list API `GET /api/shop/products`

**Files:**
- Create: `src/app/api/shop/products/route.ts`

Returns active, non-deleted products to any authenticated user. The RLS policy on `shop_products` already enforces `is_active = true AND deleted_at IS NULL`, but we also filter explicitly for clarity.

- [ ] **Step 1: Write the handler**

```typescript
// src/app/api/shop/products/route.ts
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data, error } = await supabase
    .from('shop_products')
    .select(
      'id, slug, name, description, category, base_price_pence, primary_image_url, gallery_image_urls'
    )
    .eq('is_active', true)
    .is('deleted_at', null)
    .order('created_at', { ascending: false });

  if (error) {
    return NextResponse.json(
      { error: 'Failed to load products' },
      { status: 500 }
    );
  }

  return NextResponse.json({ products: data ?? [] });
}
```

- [ ] **Step 2: Typecheck + commit**

```
npm run type-check
npm run test:run
```

```bash
git add src/app/api/shop/products/route.ts
git commit -m "feat: public GET /api/shop/products list"
```

---

## Part 3 — Admin UI

### Task 7: Admin shop product list + nav link

**Files:**
- Create: `src/app/admin/shop/page.tsx` (redirects to /admin/shop/products)
- Create: `src/app/admin/shop/products/page.tsx`
- Modify: `src/components/admin/admin-nav.tsx` — add Shop link

Admin-chrome-styled list of all products with "New product" button.

- [ ] **Step 1: Create the redirect shell**

Create `src/app/admin/shop/page.tsx`:

```tsx
import { redirect } from 'next/navigation';

export default function AdminShopIndex() {
  redirect('/admin/shop/products');
}
```

- [ ] **Step 2: Create the product list page**

Create `src/app/admin/shop/products/page.tsx`:

```tsx
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
```

- [ ] **Step 3: Add Shop to admin nav**

Read `src/components/admin/admin-nav.tsx`. Find the `LINKS` array. Add `{ href: '/admin/shop', label: 'Shop' }` between "Users" and "Audit log" so the final order is: Overview, Organisations, Users, Shop, Audit log.

- [ ] **Step 4: Typecheck + tests**

```
npm run type-check
npm run test:run
```
Expected: clean.

- [ ] **Step 5: Commit**

```bash
git add src/app/admin/shop/page.tsx src/app/admin/shop/products/page.tsx src/components/admin/admin-nav.tsx
git commit -m "feat: /admin/shop/products list + nav link"
```

---

### Task 8: Admin product form (new + edit)

**Files:**
- Create: `src/components/admin/shop-product-form.tsx` (shared client component)
- Create: `src/app/admin/shop/products/new/page.tsx`
- Create: `src/app/admin/shop/products/[id]/page.tsx`

A shared form component that handles both create and edit. Simple fields: slug (create only), name, description, category, base_price_pounds (UI in £, stored in pence), primary_image_url, is_active. Save button hits POST or PATCH depending on mode. Delete button on edit form soft-deletes via DELETE API.

Image uploads are out of scope for this task — operator pastes an image URL for now. A follow-up task can add bucket uploads.

- [ ] **Step 1: Shared form component**

Create `src/components/admin/shop-product-form.tsx`:

```tsx
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
```

- [ ] **Step 2: New product page**

Create `src/app/admin/shop/products/new/page.tsx`:

```tsx
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
```

- [ ] **Step 3: Edit product page**

Create `src/app/admin/shop/products/[id]/page.tsx`:

```tsx
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
```

- [ ] **Step 4: Typecheck + tests**

```
npm run type-check
npm run test:run
```
Expected: clean.

- [ ] **Step 5: Commit**

```bash
git add src/components/admin/shop-product-form.tsx src/app/admin/shop/products/new/page.tsx "src/app/admin/shop/products/[id]/page.tsx"
git commit -m "feat: admin product create + edit forms"
```

---

## Part 4 — Aesthetic customer-facing shop

> **Design note for Tasks 9 + 10:** these are the customer-facing surfaces that the user explicitly asked to be "aesthetic." **Before writing either page, invoke the `frontend-design` skill** for a design direction and to get high-quality component output. The implementer subagent should use that skill rather than building from the rough sketches in these tasks. The JSX in these tasks is a **functional baseline** — replace with the frontend-design output while preserving:
> - The data-fetching approach (server component reads from Supabase auth client)
> - The routing structure (`/app/shop` index, `/app/shop/[slug]` detail)
> - The `<ComingSoonCta />` component where the Buy button lives (checkout is deferred)
> - All accessibility affordances (semantic HTML, alt text, focusable controls)

### Task 9: `/app/shop` catalog page + app nav link

**Files:**
- Create: `src/app/app/shop/page.tsx`
- Create: `src/components/shop/product-card.tsx`
- Modify: `src/components/layout/app-sidebar.tsx` — add Shop link

This is the customer's first impression of the shop. Invoke the `frontend-design` skill to generate a distinctive, high-quality layout. Baseline functional version below — treat it as the MVP to replace with frontend-design output.

- [ ] **Step 1: Invoke the frontend-design skill for the shop catalog**

The implementer should request frontend-design to produce:
- A hero section for the shop (something like "OneSign – Lynx merch. Order branded NFC cards, review boards, and more.")
- A category filter row (chips / tabs — `nfc_card`, `review_board`, `table_talker`, `window_decal`, `badge`, `other`)
- Product cards in a responsive grid (image-heavy, with name, category, GBP price, subtle hover state)
- Tailwind-only (no new UI libs). Match the existing app's minimalist feel but with more visual polish than the admin side.

The data contract: an array of `{ id, slug, name, description, category, base_price_pence, primary_image_url }` fetched server-side.

- [ ] **Step 2: Baseline product card component**

Create `src/components/shop/product-card.tsx` (to be replaced / enhanced by frontend-design output):

```tsx
import Link from 'next/link';
import type { ShopProductCategory } from '@/types/shop';
import { SHOP_CATEGORY_LABELS } from '@/types/shop';

export interface ProductCardProps {
  slug: string;
  name: string;
  category: ShopProductCategory;
  base_price_pence: number;
  primary_image_url: string | null;
}

function formatGBP(pence: number): string {
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP',
  }).format(pence / 100);
}

export function ProductCard(props: ProductCardProps) {
  return (
    <Link
      href={`/app/shop/${props.slug}`}
      className="group block bg-white border rounded-lg overflow-hidden hover:shadow-md transition-shadow"
    >
      <div className="aspect-square bg-gray-100 overflow-hidden">
        {props.primary_image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={props.primary_image_url}
            alt={props.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-300 text-xs">
            No image
          </div>
        )}
      </div>
      <div className="p-4">
        <p className="text-xs uppercase tracking-wide text-gray-500">
          {SHOP_CATEGORY_LABELS[props.category]}
        </p>
        <h3 className="font-medium mt-1 truncate">{props.name}</h3>
        <p className="text-sm font-semibold mt-2">
          {formatGBP(props.base_price_pence)}
        </p>
      </div>
    </Link>
  );
}
```

- [ ] **Step 3: Baseline shop page**

Create `src/app/app/shop/page.tsx`:

```tsx
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { ProductCard } from '@/components/shop/product-card';
import type { ShopProductRecord } from '@/types/shop';

export default async function ShopPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/auth/login?next=/app/shop');

  const { data } = await supabase
    .from('shop_products')
    .select(
      'id, slug, name, description, category, base_price_pence, primary_image_url'
    )
    .eq('is_active', true)
    .is('deleted_at', null)
    .order('created_at', { ascending: false });

  const products = (data ?? []) as Array<
    Pick<
      ShopProductRecord,
      | 'id'
      | 'slug'
      | 'name'
      | 'description'
      | 'category'
      | 'base_price_pence'
      | 'primary_image_url'
    >
  >;

  return (
    <main className="min-h-screen bg-white">
      {/* Hero */}
      <section className="border-b bg-gradient-to-b from-gray-50 to-white">
        <div className="max-w-6xl mx-auto px-6 py-16">
          <p className="text-xs uppercase tracking-widest text-gray-500 mb-3">
            OneSign · Lynx merch
          </p>
          <h1 className="text-4xl md:text-5xl font-semibold tracking-tight max-w-2xl">
            Branded physical things that point at your pages.
          </h1>
          <p className="text-gray-600 mt-4 max-w-xl">
            Pre-programmed NFC cards, etched review boards, table talkers — all
            pre-printed with your QR and ready to place.
          </p>
        </div>
      </section>

      {/* Grid */}
      <section className="max-w-6xl mx-auto px-6 py-12">
        {products.length === 0 ? (
          <div className="text-center py-16 text-gray-500 text-sm">
            No products in the shop yet. Check back soon.
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {products.map((p) => (
              <ProductCard
                key={p.id}
                slug={p.slug}
                name={p.name}
                category={p.category}
                base_price_pence={p.base_price_pence}
                primary_image_url={p.primary_image_url}
              />
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
```

- [ ] **Step 4: Add Shop link to app sidebar**

Read `src/components/layout/app-sidebar.tsx`. Find the existing nav items array. Add a new entry for "Shop" pointing to `/app/shop`, using the `ShoppingBag` icon from `lucide-react` (add it to the existing lucide imports). Insert it after "Team" so the order is Dashboard → Bio Pages → Team → Shop → (etc).

- [ ] **Step 5: Typecheck + tests**

```
npm run type-check
npm run test:run
```
Expected: clean.

- [ ] **Step 6: Commit**

```bash
git add src/app/app/shop/page.tsx src/components/shop/product-card.tsx src/components/layout/app-sidebar.tsx
git commit -m "feat: /app/shop aesthetic catalog + sidebar link"
```

---

### Task 10: `/app/shop/[slug]` product detail

**Files:**
- Create: `src/app/app/shop/[slug]/page.tsx`
- Create: `src/components/shop/product-hero.tsx`
- Create: `src/components/shop/coming-soon-cta.tsx`

Product detail page. Again: **invoke `frontend-design` skill** for the hero/layout. Baseline below.

The "Buy" CTA renders disabled with "Checkout coming soon" copy. Checkout lands in the follow-up Stripe plan.

- [ ] **Step 1: ComingSoonCta component**

Create `src/components/shop/coming-soon-cta.tsx`:

```tsx
export function ComingSoonCta({ pricePence }: { pricePence: number }) {
  const price = new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP',
  }).format(pricePence / 100);
  return (
    <div className="border rounded-lg p-4 bg-gray-50">
      <div className="text-2xl font-semibold">{price}</div>
      <button
        type="button"
        disabled
        className="mt-3 w-full bg-gray-300 text-white py-3 rounded text-sm font-medium cursor-not-allowed"
      >
        Checkout coming soon
      </button>
      <p className="text-xs text-gray-500 mt-2 text-center">
        Payments go live with the next release. Want a test order? Email{' '}
        <a href="mailto:hello@onesignanddigital.com" className="underline">
          hello@onesignanddigital.com
        </a>
        .
      </p>
    </div>
  );
}
```

- [ ] **Step 2: Invoke frontend-design for the hero**

The implementer should request frontend-design to produce a `<ProductHero />` component that takes `{ name, description, category, gallery, primary_image_url }` and renders a two-column (image gallery + details) or immersive stacked layout. Tailwind only.

- [ ] **Step 3: Baseline ProductHero**

Create `src/components/shop/product-hero.tsx`:

```tsx
import type { ShopProductCategory } from '@/types/shop';
import { SHOP_CATEGORY_LABELS } from '@/types/shop';

export interface ProductHeroProps {
  name: string;
  description: string | null;
  category: ShopProductCategory;
  primary_image_url: string | null;
  children?: React.ReactNode;
}

export function ProductHero(props: ProductHeroProps) {
  return (
    <div className="grid md:grid-cols-2 gap-10 max-w-6xl mx-auto px-6 py-12">
      <div className="aspect-square bg-gray-50 rounded-lg overflow-hidden border">
        {props.primary_image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={props.primary_image_url}
            alt={props.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-300">
            No image
          </div>
        )}
      </div>
      <div>
        <p className="text-xs uppercase tracking-widest text-gray-500 mb-3">
          {SHOP_CATEGORY_LABELS[props.category]}
        </p>
        <h1 className="text-3xl md:text-4xl font-semibold tracking-tight">
          {props.name}
        </h1>
        {props.description && (
          <p className="text-gray-600 mt-4 whitespace-pre-line">
            {props.description}
          </p>
        )}
        <div className="mt-8">{props.children}</div>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Product detail page**

Create `src/app/app/shop/[slug]/page.tsx`:

```tsx
import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { ProductHero } from '@/components/shop/product-hero';
import { ComingSoonCta } from '@/components/shop/coming-soon-cta';

interface Props {
  params: Promise<{ slug: string }>;
}

export default async function ShopProductDetailPage({ params }: Props) {
  const { slug } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/auth/login?next=/app/shop/${slug}`);

  const { data: product } = await supabase
    .from('shop_products')
    .select(
      'id, slug, name, description, category, base_price_pence, primary_image_url, gallery_image_urls'
    )
    .eq('slug', slug)
    .eq('is_active', true)
    .is('deleted_at', null)
    .single();

  if (!product) notFound();

  return (
    <main className="min-h-screen bg-white">
      <div className="max-w-6xl mx-auto px-6 pt-6">
        <Link
          href="/app/shop"
          className="text-sm text-gray-500 hover:underline"
        >
          ← Back to shop
        </Link>
      </div>
      <ProductHero
        name={product.name}
        description={product.description}
        category={product.category}
        primary_image_url={product.primary_image_url}
      >
        <ComingSoonCta pricePence={product.base_price_pence} />
      </ProductHero>
    </main>
  );
}
```

- [ ] **Step 5: Typecheck + tests**

```
npm run type-check
npm run test:run
```
Expected: clean.

- [ ] **Step 6: Commit**

```bash
git add "src/app/app/shop/[slug]/page.tsx" src/components/shop/product-hero.tsx src/components/shop/coming-soon-cta.tsx
git commit -m "feat: /app/shop/[slug] product detail with coming-soon CTA"
```

---

## Part 5 — Runbook + deploy

### Task 11: Append Shopfront section to the runbook

**Files:**
- Modify: `docs/superpowers/runbooks/phase-0-migration.md`

- [ ] **Step 1: Append**

Append at the end:

```markdown

---

# Shopfront (Foundation + Admin + Browse)

Ships a browsable catalog and admin product CRUD. Checkout is deferred to
the follow-up Stripe plan — the "Buy" button renders disabled with a
"coming soon" copy.

## Pre-flight

1. `npm run test:run` — all pass.
2. `npm run type-check` — clean.
3. `npm run migration:schema-lint` — passes.
4. Super-admin dashboard live in production (required for product CRUD UI).
5. No new env vars required in this release.

## Execution

1. Apply `supabase/migrations/00024_shopfront.sql` in the Supabase SQL
   editor.

2. Verify the storage bucket and tables exist:

   ```sql
   SELECT id, public FROM storage.buckets WHERE id = 'shop-product-media';
   -- expect 1 row with public = true

   SELECT tablename FROM pg_tables
   WHERE tablename LIKE 'shop\_%' ESCAPE '\';
   -- expect 5 rows: shop_products, shop_product_variants,
   -- shop_product_customizations, shop_orders, shop_order_items
   ```

3. Deploy the app (Vercel auto-deploys on merge).

4. Seed at least one product via `/admin/shop/products/new` — fill the
   form, paste a product image URL (any test image from imgur/unsplash is
   fine for now), save, toggle is_active on, and confirm it appears in the
   customer view at `/app/shop`.

5. Smoke test:
   - Sign in as an org owner (non-admin). Visit `/app/shop` → hero + grid
     render. Click a product → detail page renders with "Checkout coming
     soon" button disabled.
   - Sign in as tom@onesignanddigital.com (platform admin). Visit
     `/admin/shop/products` → list view with your seeded product. Click
     into it → edit form. Edit the name → save → list updates. Delete →
     product disappears from `/app/shop`.

## Rollback

```sql
DROP TABLE IF EXISTS shop_order_items;
DROP TABLE IF EXISTS shop_orders;
DROP TABLE IF EXISTS shop_product_customizations;
DROP TABLE IF EXISTS shop_product_variants;
DROP TABLE IF EXISTS shop_products;
DROP TYPE IF EXISTS shop_customization_field_type;
DROP TYPE IF EXISTS shop_order_status;
DROP TYPE IF EXISTS shop_product_category;

-- Remove the bucket (careful — this deletes all uploaded media):
-- DELETE FROM storage.objects WHERE bucket_id = 'shop-product-media';
-- DELETE FROM storage.buckets WHERE id = 'shop-product-media';
```

App rollback: revert the deploy.

## Completion log

### Production, YYYY-MM-DD HH:MM TZ
- Migration applied:
- Smoke test:
- First product seeded:
- Anomalies:
- Signed off by:
```

- [ ] **Step 2: Commit**

```bash
git add docs/superpowers/runbooks/phase-0-migration.md
git commit -m "docs: add shopfront section to migration runbook"
```

---

### Task 12 (MANUAL): Deploy + seed first product

Operator-only.

- [ ] Apply migration 00024 in production.
- [ ] Confirm Vercel deploys the merged branch.
- [ ] Visit `/admin/shop/products/new` and seed one test product.
- [ ] Visit `/app/shop` and confirm it's visible.
- [ ] Log a production entry in the runbook.

---

## Completion criteria

This plan is complete when:

1. Migration 00024 applied in production.
2. Admin can CRUD products via `/admin/shop/products`.
3. Authenticated users can browse `/app/shop` and see products.
4. Product detail page shows "Checkout coming soon" disabled CTA.
5. Runbook has a production entry.

**Follow-up plan** (Stripe Checkout + orders + fulfilment) becomes the next
work item. The schema is ready (orders/order_items tables are live), the
customer-facing UI is ready to receive a real Buy button, and the admin UI
has space for an /admin/shop/orders tab.
