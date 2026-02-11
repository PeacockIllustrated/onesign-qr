-- Migration: Bio-Link Pages
-- Adds bio-link page support — a customizable landing page with profile info
-- and a list of clickable links, accessible at /p/{slug}.

-- =============================================================================
-- ENUMS
-- =============================================================================

-- Bio-link page theme
DO $$ BEGIN
  CREATE TYPE bio_link_theme AS ENUM (
    'minimal',
    'midnight',
    'gradient-sunset',
    'gradient-ocean',
    'neon'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Bio-link button style
DO $$ BEGIN
  CREATE TYPE bio_link_button_style AS ENUM ('filled', 'outline', 'shadow');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Bio-link audit action
DO $$ BEGIN
  CREATE TYPE bio_link_audit_action AS ENUM (
    'created',
    'updated',
    'link_added',
    'link_updated',
    'link_removed',
    'link_reordered',
    'theme_changed',
    'deactivated',
    'reactivated',
    'deleted'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- =============================================================================
-- TABLES
-- =============================================================================

-- Bio-link pages (one per user)
CREATE TABLE IF NOT EXISTS bio_link_pages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Core fields
  title TEXT NOT NULL,
  bio TEXT,
  slug TEXT NOT NULL UNIQUE,

  -- Profile image (Supabase Storage path)
  avatar_storage_path TEXT,

  -- Appearance
  theme bio_link_theme NOT NULL DEFAULT 'minimal',
  custom_bg_color TEXT,
  custom_text_color TEXT,
  custom_accent_color TEXT,
  button_style bio_link_button_style NOT NULL DEFAULT 'filled',

  -- Status
  is_active BOOLEAN NOT NULL DEFAULT true,
  analytics_enabled BOOLEAN NOT NULL DEFAULT true,

  -- Counters (incremented by trigger)
  total_views INTEGER NOT NULL DEFAULT 0,
  last_viewed_at TIMESTAMPTZ,

  -- QR integration (nullable — page can exist without QR)
  qr_code_id UUID REFERENCES qr_codes(id) ON DELETE SET NULL,

  -- Soft delete
  deleted_at TIMESTAMPTZ DEFAULT NULL,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Constraints
  CONSTRAINT bio_one_page_per_user UNIQUE (owner_id),
  CONSTRAINT bio_title_not_empty CHECK (char_length(title) > 0),
  CONSTRAINT bio_title_max_length CHECK (char_length(title) <= 100),
  CONSTRAINT bio_bio_max_length CHECK (bio IS NULL OR char_length(bio) <= 300),
  CONSTRAINT bio_slug_format CHECK (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  CONSTRAINT bio_slug_length CHECK (char_length(slug) BETWEEN 3 AND 40),
  CONSTRAINT bio_custom_bg_format CHECK (
    custom_bg_color IS NULL OR custom_bg_color ~ '^#[0-9A-Fa-f]{6}$'
  ),
  CONSTRAINT bio_custom_text_format CHECK (
    custom_text_color IS NULL OR custom_text_color ~ '^#[0-9A-Fa-f]{6}$'
  ),
  CONSTRAINT bio_custom_accent_format CHECK (
    custom_accent_color IS NULL OR custom_accent_color ~ '^#[0-9A-Fa-f]{6}$'
  )
);

-- Bio-link items (ordered links within a page)
CREATE TABLE IF NOT EXISTS bio_link_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  page_id UUID NOT NULL REFERENCES bio_link_pages(id) ON DELETE CASCADE,

  -- Link content
  title TEXT NOT NULL,
  url TEXT NOT NULL,
  icon TEXT,

  -- Ordering and visibility
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_enabled BOOLEAN NOT NULL DEFAULT true,

  -- Analytics
  total_clicks INTEGER NOT NULL DEFAULT 0,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Constraints
  CONSTRAINT bio_item_title_not_empty CHECK (char_length(title) > 0),
  CONSTRAINT bio_item_title_max_length CHECK (char_length(title) <= 100),
  CONSTRAINT bio_item_url_not_empty CHECK (char_length(url) > 0),
  CONSTRAINT bio_item_url_max_length CHECK (char_length(url) <= 2048)
);

-- Bio-link view events (page view analytics)
CREATE TABLE IF NOT EXISTS bio_link_view_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  page_id UUID NOT NULL REFERENCES bio_link_pages(id) ON DELETE CASCADE,

  viewed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Anonymized analytics (same fields as qr_scan_events)
  country_code TEXT,
  region TEXT,
  device_type qr_device_type DEFAULT 'unknown',
  os_family TEXT,
  browser_family TEXT,
  referrer_domain TEXT,
  ip_hash TEXT
);

-- Bio-link click events (per-link click analytics)
CREATE TABLE IF NOT EXISTS bio_link_click_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  item_id UUID NOT NULL REFERENCES bio_link_items(id) ON DELETE CASCADE,
  page_id UUID NOT NULL REFERENCES bio_link_pages(id) ON DELETE CASCADE,

  clicked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Anonymized analytics
  country_code TEXT,
  device_type qr_device_type DEFAULT 'unknown',
  ip_hash TEXT
);

-- Bio-link audit log
CREATE TABLE IF NOT EXISTS bio_link_audit_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  page_id UUID NOT NULL REFERENCES bio_link_pages(id) ON DELETE CASCADE,
  actor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,

  action bio_link_audit_action NOT NULL,

  previous_value JSONB,
  new_value JSONB,

  ip_address INET,
  user_agent TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================================================
-- INDEXES
-- =============================================================================

CREATE INDEX IF NOT EXISTS idx_bio_pages_owner ON bio_link_pages(owner_id);
CREATE INDEX IF NOT EXISTS idx_bio_pages_slug ON bio_link_pages(slug);
CREATE INDEX IF NOT EXISTS idx_bio_pages_active ON bio_link_pages(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_bio_pages_qr ON bio_link_pages(qr_code_id) WHERE qr_code_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_bio_pages_not_deleted ON bio_link_pages(owner_id) WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_bio_items_page ON bio_link_items(page_id);
CREATE INDEX IF NOT EXISTS idx_bio_items_page_order ON bio_link_items(page_id, sort_order);

CREATE INDEX IF NOT EXISTS idx_bio_view_events_page ON bio_link_view_events(page_id);
CREATE INDEX IF NOT EXISTS idx_bio_view_events_time ON bio_link_view_events(viewed_at DESC);
CREATE INDEX IF NOT EXISTS idx_bio_view_events_page_time ON bio_link_view_events(page_id, viewed_at DESC);

CREATE INDEX IF NOT EXISTS idx_bio_click_events_item ON bio_link_click_events(item_id);
CREATE INDEX IF NOT EXISTS idx_bio_click_events_page ON bio_link_click_events(page_id);
CREATE INDEX IF NOT EXISTS idx_bio_click_events_time ON bio_link_click_events(clicked_at DESC);

CREATE INDEX IF NOT EXISTS idx_bio_audit_page ON bio_link_audit_log(page_id);
CREATE INDEX IF NOT EXISTS idx_bio_audit_time ON bio_link_audit_log(created_at DESC);

-- =============================================================================
-- FUNCTIONS
-- =============================================================================

-- Generate unique slug for bio pages (separate namespace from QR slugs)
CREATE OR REPLACE FUNCTION generate_bio_unique_slug(length INTEGER DEFAULT 8)
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  new_slug TEXT;
  slug_exists BOOLEAN;
  chars TEXT := 'abcdefghijklmnopqrstuvwxyz0123456789';
  i INTEGER;
BEGIN
  LOOP
    new_slug := '';
    FOR i IN 1..length LOOP
      new_slug := new_slug || substr(chars, floor(random() * char_length(chars) + 1)::INTEGER, 1);
    END LOOP;

    SELECT EXISTS (
      SELECT 1 FROM bio_link_pages WHERE slug = new_slug
    ) INTO slug_exists;

    EXIT WHEN NOT slug_exists;
  END LOOP;

  RETURN new_slug;
END;
$$;

-- Update updated_at on bio tables
CREATE OR REPLACE FUNCTION update_bio_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Increment page view count
CREATE OR REPLACE FUNCTION increment_bio_view_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE bio_link_pages
  SET
    total_views = total_views + 1,
    last_viewed_at = NOW()
  WHERE id = NEW.page_id;
  RETURN NEW;
END;
$$;

-- Increment link click count
CREATE OR REPLACE FUNCTION increment_bio_click_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE bio_link_items
  SET total_clicks = total_clicks + 1
  WHERE id = NEW.item_id;
  RETURN NEW;
END;
$$;

-- =============================================================================
-- TRIGGERS
-- =============================================================================

DROP TRIGGER IF EXISTS trigger_bio_pages_updated_at ON bio_link_pages;
CREATE TRIGGER trigger_bio_pages_updated_at
  BEFORE UPDATE ON bio_link_pages
  FOR EACH ROW
  EXECUTE FUNCTION update_bio_updated_at();

DROP TRIGGER IF EXISTS trigger_bio_items_updated_at ON bio_link_items;
CREATE TRIGGER trigger_bio_items_updated_at
  BEFORE UPDATE ON bio_link_items
  FOR EACH ROW
  EXECUTE FUNCTION update_bio_updated_at();

DROP TRIGGER IF EXISTS trigger_bio_increment_view_count ON bio_link_view_events;
CREATE TRIGGER trigger_bio_increment_view_count
  AFTER INSERT ON bio_link_view_events
  FOR EACH ROW
  EXECUTE FUNCTION increment_bio_view_count();

DROP TRIGGER IF EXISTS trigger_bio_increment_click_count ON bio_link_click_events;
CREATE TRIGGER trigger_bio_increment_click_count
  AFTER INSERT ON bio_link_click_events
  FOR EACH ROW
  EXECUTE FUNCTION increment_bio_click_count();

-- =============================================================================
-- ROW LEVEL SECURITY
-- =============================================================================

ALTER TABLE bio_link_pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE bio_link_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE bio_link_view_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE bio_link_click_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE bio_link_audit_log ENABLE ROW LEVEL SECURITY;

-- Bio pages: owners can CRUD their own
CREATE POLICY "Users can view own bio pages"
  ON bio_link_pages FOR SELECT
  TO authenticated
  USING (owner_id = auth.uid());

CREATE POLICY "Users can create bio pages"
  ON bio_link_pages FOR INSERT
  TO authenticated
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Users can update own bio pages"
  ON bio_link_pages FOR UPDATE
  TO authenticated
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Users can delete own bio pages"
  ON bio_link_pages FOR DELETE
  TO authenticated
  USING (owner_id = auth.uid());

-- Bio pages: public read of active pages for /p/{slug}
CREATE POLICY "Public can read active bio pages"
  ON bio_link_pages FOR SELECT
  TO anon
  USING (is_active = true AND deleted_at IS NULL);

-- Bio items: owners via parent page
CREATE POLICY "Users can view own bio items"
  ON bio_link_items FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM bio_link_pages
      WHERE bio_link_pages.id = bio_link_items.page_id
      AND bio_link_pages.owner_id = auth.uid()
    )
  );

CREATE POLICY "Users can create bio items"
  ON bio_link_items FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM bio_link_pages
      WHERE bio_link_pages.id = bio_link_items.page_id
      AND bio_link_pages.owner_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own bio items"
  ON bio_link_items FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM bio_link_pages
      WHERE bio_link_pages.id = bio_link_items.page_id
      AND bio_link_pages.owner_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own bio items"
  ON bio_link_items FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM bio_link_pages
      WHERE bio_link_pages.id = bio_link_items.page_id
      AND bio_link_pages.owner_id = auth.uid()
    )
  );

-- Bio items: public read of enabled items on active pages
CREATE POLICY "Public can read enabled bio items"
  ON bio_link_items FOR SELECT
  TO anon
  USING (
    is_enabled = true AND
    EXISTS (
      SELECT 1 FROM bio_link_pages
      WHERE bio_link_pages.id = bio_link_items.page_id
      AND bio_link_pages.is_active = true
      AND bio_link_pages.deleted_at IS NULL
    )
  );

-- View events: owners can read their own
CREATE POLICY "Users can view own bio view events"
  ON bio_link_view_events FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM bio_link_pages
      WHERE bio_link_pages.id = bio_link_view_events.page_id
      AND bio_link_pages.owner_id = auth.uid()
    )
  );

-- Click events: owners can read their own
CREATE POLICY "Users can view own bio click events"
  ON bio_link_click_events FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM bio_link_pages
      WHERE bio_link_pages.id = bio_link_click_events.page_id
      AND bio_link_pages.owner_id = auth.uid()
    )
  );

-- Audit log: owners can read their own
CREATE POLICY "Users can view own bio audit logs"
  ON bio_link_audit_log FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM bio_link_pages
      WHERE bio_link_pages.id = bio_link_audit_log.page_id
      AND bio_link_pages.owner_id = auth.uid()
    )
  );

-- =============================================================================
-- STORAGE BUCKET (for avatars)
-- =============================================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'bio-avatars', 'bio-avatars', true,
  2097152,  -- 2MB
  ARRAY['image/png', 'image/jpeg', 'image/webp']
) ON CONFLICT (id) DO NOTHING;

-- Storage policies: public read, owner write (path: {user_id}/{filename})
CREATE POLICY "Public can view bio avatars"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'bio-avatars');

CREATE POLICY "Users can upload own bio avatars"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'bio-avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update own bio avatars"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'bio-avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete own bio avatars"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'bio-avatars' AND auth.uid()::text = (storage.foldername(name))[1]);
