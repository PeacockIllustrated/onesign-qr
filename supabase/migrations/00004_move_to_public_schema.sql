-- Migration: Move QR tables from qr_code schema to public schema
-- This is needed because Supabase REST API only exposes public schema by default
-- We prefix tables with qr_ to keep them organized

-- =============================================================================
-- ENUMS (in public schema)
-- =============================================================================

-- QR mode enum
DO $$ BEGIN
  CREATE TYPE qr_mode AS ENUM ('managed', 'direct');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Error correction level enum
DO $$ BEGIN
  CREATE TYPE qr_error_correction_level AS ENUM ('L', 'M', 'Q', 'H');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Module shape enum
DO $$ BEGIN
  CREATE TYPE qr_module_shape AS ENUM ('square', 'rounded', 'dots', 'diamond');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Eye shape enum
DO $$ BEGIN
  CREATE TYPE qr_eye_shape AS ENUM ('square', 'rounded', 'circle');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Asset format enum
DO $$ BEGIN
  CREATE TYPE qr_asset_format AS ENUM ('svg', 'png', 'pdf');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Device type enum for analytics
DO $$ BEGIN
  CREATE TYPE qr_device_type AS ENUM ('mobile', 'tablet', 'desktop', 'unknown');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Audit action enum
DO $$ BEGIN
  CREATE TYPE qr_audit_action AS ENUM (
    'created',
    'updated',
    'destination_changed',
    'style_changed',
    'deactivated',
    'reactivated',
    'deleted'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- =============================================================================
-- TABLES (in public schema with qr_ prefix)
-- =============================================================================

-- Main QR codes table
CREATE TABLE IF NOT EXISTS qr_codes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Core fields
  name TEXT NOT NULL,
  mode qr_mode NOT NULL DEFAULT 'managed',
  slug TEXT UNIQUE,
  destination_url TEXT NOT NULL,

  -- Status
  is_active BOOLEAN NOT NULL DEFAULT true,
  analytics_enabled BOOLEAN NOT NULL DEFAULT true,

  -- Metadata
  total_scans INTEGER NOT NULL DEFAULT 0,
  last_scanned_at TIMESTAMPTZ,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Constraints
  CONSTRAINT qr_slug_required_for_managed CHECK (
    mode = 'direct' OR (mode = 'managed' AND slug IS NOT NULL)
  ),
  CONSTRAINT qr_slug_format CHECK (
    slug IS NULL OR slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'
  ),
  CONSTRAINT qr_name_not_empty CHECK (char_length(name) > 0),
  CONSTRAINT qr_destination_url_not_empty CHECK (char_length(destination_url) > 0)
);

-- QR style configuration
CREATE TABLE IF NOT EXISTS qr_styles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  qr_id UUID NOT NULL REFERENCES qr_codes(id) ON DELETE CASCADE,

  -- Colors (hex format)
  foreground_color TEXT NOT NULL DEFAULT '#000000',
  background_color TEXT NOT NULL DEFAULT '#FFFFFF',

  -- Error correction
  error_correction qr_error_correction_level NOT NULL DEFAULT 'M',

  -- Layout
  quiet_zone INTEGER NOT NULL DEFAULT 4 CHECK (quiet_zone BETWEEN 2 AND 10),

  -- Shapes
  module_shape qr_module_shape NOT NULL DEFAULT 'square',
  eye_shape qr_eye_shape NOT NULL DEFAULT 'square',

  -- Logo
  logo_storage_path TEXT,
  logo_size_ratio DECIMAL(3,2) DEFAULT 0.20 CHECK (logo_size_ratio BETWEEN 0.10 AND 0.30),

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- One style per QR
  CONSTRAINT qr_one_style_per_qr UNIQUE (qr_id),

  -- Color format validation
  CONSTRAINT qr_foreground_color_format CHECK (foreground_color ~ '^#[0-9A-Fa-f]{6}$'),
  CONSTRAINT qr_background_color_format CHECK (background_color ~ '^#[0-9A-Fa-f]{6}$')
);

-- Generated QR assets
CREATE TABLE IF NOT EXISTS qr_assets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  qr_id UUID NOT NULL REFERENCES qr_codes(id) ON DELETE CASCADE,

  -- Asset info
  format qr_asset_format NOT NULL,
  storage_path TEXT NOT NULL,
  size_bytes INTEGER,
  width INTEGER, -- For PNG assets

  -- Version tracking (hash of style config for cache invalidation)
  style_hash TEXT NOT NULL,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Unique constraint per format and size
  CONSTRAINT qr_unique_asset UNIQUE (qr_id, format, width)
);

-- Scan events for analytics
CREATE TABLE IF NOT EXISTS qr_scan_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  qr_id UUID NOT NULL REFERENCES qr_codes(id) ON DELETE CASCADE,

  -- Timestamp
  scanned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Anonymized location (country/region level only)
  country_code TEXT,
  region TEXT,

  -- Device info (generalized)
  device_type qr_device_type DEFAULT 'unknown',
  os_family TEXT,
  browser_family TEXT,

  -- Referrer context (domain only, not full URL)
  referrer_domain TEXT,

  -- Hashed IP for deduplication only (not for identification)
  ip_hash TEXT
);

-- Audit log for QR changes
CREATE TABLE IF NOT EXISTS qr_audit_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  qr_id UUID NOT NULL REFERENCES qr_codes(id) ON DELETE CASCADE,
  actor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,

  -- Action details
  action qr_audit_action NOT NULL,

  -- Change details (JSON for flexibility)
  previous_value JSONB,
  new_value JSONB,

  -- Metadata
  ip_address INET,
  user_agent TEXT,

  -- Timestamp
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================================================
-- INDEXES
-- =============================================================================

-- QR codes indexes
CREATE INDEX IF NOT EXISTS idx_qr_codes_owner ON qr_codes(owner_id);
CREATE INDEX IF NOT EXISTS idx_qr_codes_slug ON qr_codes(slug) WHERE slug IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_qr_codes_active ON qr_codes(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_qr_codes_created ON qr_codes(created_at DESC);

-- Scan events indexes (for analytics queries)
CREATE INDEX IF NOT EXISTS idx_qr_scan_events_qr ON qr_scan_events(qr_id);
CREATE INDEX IF NOT EXISTS idx_qr_scan_events_time ON qr_scan_events(scanned_at DESC);
CREATE INDEX IF NOT EXISTS idx_qr_scan_events_qr_time ON qr_scan_events(qr_id, scanned_at DESC);

-- Audit log indexes
CREATE INDEX IF NOT EXISTS idx_qr_audit_log_qr ON qr_audit_log(qr_id);
CREATE INDEX IF NOT EXISTS idx_qr_audit_log_time ON qr_audit_log(created_at DESC);

-- =============================================================================
-- FUNCTIONS
-- =============================================================================

-- Function to generate unique slug
CREATE OR REPLACE FUNCTION generate_qr_unique_slug(length INTEGER DEFAULT 8)
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
    -- Generate random slug
    new_slug := '';
    FOR i IN 1..length LOOP
      new_slug := new_slug || substr(chars, floor(random() * char_length(chars) + 1)::INTEGER, 1);
    END LOOP;

    -- Check uniqueness
    SELECT EXISTS (
      SELECT 1 FROM qr_codes WHERE slug = new_slug
    ) INTO slug_exists;

    EXIT WHEN NOT slug_exists;
  END LOOP;

  RETURN new_slug;
END;
$$;

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_qr_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Function to increment scan count
CREATE OR REPLACE FUNCTION increment_qr_scan_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE qr_codes
  SET
    total_scans = total_scans + 1,
    last_scanned_at = NOW()
  WHERE id = NEW.qr_id;
  RETURN NEW;
END;
$$;

-- Function to create default style for new QR
CREATE OR REPLACE FUNCTION create_qr_default_style()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  INSERT INTO qr_styles (qr_id)
  VALUES (NEW.id);
  RETURN NEW;
END;
$$;

-- =============================================================================
-- TRIGGERS
-- =============================================================================

-- Drop existing triggers if they exist
DROP TRIGGER IF EXISTS trigger_qr_codes_updated_at ON qr_codes;
DROP TRIGGER IF EXISTS trigger_qr_styles_updated_at ON qr_styles;
DROP TRIGGER IF EXISTS trigger_qr_increment_scan_count ON qr_scan_events;
DROP TRIGGER IF EXISTS trigger_qr_create_default_style ON qr_codes;

-- Update updated_at on codes
CREATE TRIGGER trigger_qr_codes_updated_at
  BEFORE UPDATE ON qr_codes
  FOR EACH ROW
  EXECUTE FUNCTION update_qr_updated_at();

-- Update updated_at on styles
CREATE TRIGGER trigger_qr_styles_updated_at
  BEFORE UPDATE ON qr_styles
  FOR EACH ROW
  EXECUTE FUNCTION update_qr_updated_at();

-- Increment scan count on new scan event
CREATE TRIGGER trigger_qr_increment_scan_count
  AFTER INSERT ON qr_scan_events
  FOR EACH ROW
  EXECUTE FUNCTION increment_qr_scan_count();

-- Create default style when QR is created
CREATE TRIGGER trigger_qr_create_default_style
  AFTER INSERT ON qr_codes
  FOR EACH ROW
  EXECUTE FUNCTION create_qr_default_style();

-- =============================================================================
-- ROW LEVEL SECURITY
-- =============================================================================

-- Enable RLS on all tables
ALTER TABLE qr_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE qr_styles ENABLE ROW LEVEL SECURITY;
ALTER TABLE qr_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE qr_scan_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE qr_audit_log ENABLE ROW LEVEL SECURITY;

-- QR Codes policies
DROP POLICY IF EXISTS "Users can view own QR codes" ON qr_codes;
CREATE POLICY "Users can view own QR codes"
  ON qr_codes FOR SELECT
  TO authenticated
  USING (owner_id = auth.uid());

DROP POLICY IF EXISTS "Users can create QR codes" ON qr_codes;
CREATE POLICY "Users can create QR codes"
  ON qr_codes FOR INSERT
  TO authenticated
  WITH CHECK (owner_id = auth.uid());

DROP POLICY IF EXISTS "Users can update own QR codes" ON qr_codes;
CREATE POLICY "Users can update own QR codes"
  ON qr_codes FOR UPDATE
  TO authenticated
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

DROP POLICY IF EXISTS "Users can delete own QR codes" ON qr_codes;
CREATE POLICY "Users can delete own QR codes"
  ON qr_codes FOR DELETE
  TO authenticated
  USING (owner_id = auth.uid());

-- Public read access to active managed QR codes for redirect
DROP POLICY IF EXISTS "Public can read active managed QR slugs" ON qr_codes;
CREATE POLICY "Public can read active managed QR slugs"
  ON qr_codes FOR SELECT
  TO anon
  USING (is_active = true AND mode = 'managed' AND slug IS NOT NULL);

-- QR Styles policies
DROP POLICY IF EXISTS "Users can view own QR styles" ON qr_styles;
CREATE POLICY "Users can view own QR styles"
  ON qr_styles FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM qr_codes
      WHERE qr_codes.id = qr_styles.qr_id
      AND qr_codes.owner_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can update own QR styles" ON qr_styles;
CREATE POLICY "Users can update own QR styles"
  ON qr_styles FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM qr_codes
      WHERE qr_codes.id = qr_styles.qr_id
      AND qr_codes.owner_id = auth.uid()
    )
  );

-- QR Assets policies
DROP POLICY IF EXISTS "Users can view own QR assets" ON qr_assets;
CREATE POLICY "Users can view own QR assets"
  ON qr_assets FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM qr_codes
      WHERE qr_codes.id = qr_assets.qr_id
      AND qr_codes.owner_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can insert own QR assets" ON qr_assets;
CREATE POLICY "Users can insert own QR assets"
  ON qr_assets FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM qr_codes
      WHERE qr_codes.id = qr_assets.qr_id
      AND qr_codes.owner_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can delete own QR assets" ON qr_assets;
CREATE POLICY "Users can delete own QR assets"
  ON qr_assets FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM qr_codes
      WHERE qr_codes.id = qr_assets.qr_id
      AND qr_codes.owner_id = auth.uid()
    )
  );

-- Scan events - users can view their own
DROP POLICY IF EXISTS "Users can view own scan events" ON qr_scan_events;
CREATE POLICY "Users can view own scan events"
  ON qr_scan_events FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM qr_codes
      WHERE qr_codes.id = qr_scan_events.qr_id
      AND qr_codes.owner_id = auth.uid()
    )
  );

-- Audit log - users can view their own
DROP POLICY IF EXISTS "Users can view own audit logs" ON qr_audit_log;
CREATE POLICY "Users can view own audit logs"
  ON qr_audit_log FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM qr_codes
      WHERE qr_codes.id = qr_audit_log.qr_id
      AND qr_codes.owner_id = auth.uid()
    )
  );
