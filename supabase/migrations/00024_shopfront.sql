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

DROP POLICY IF EXISTS "shop_product_media_public_select" ON storage.objects;
CREATE POLICY "shop_product_media_public_select"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'shop-product-media');

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
