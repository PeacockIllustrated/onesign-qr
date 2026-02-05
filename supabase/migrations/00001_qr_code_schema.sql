-- Migration: Create qr_code schema and tables
-- This schema contains all QR-related tables, keeping them organized
-- within the shared OneSign Supabase project

-- Create the qr_code schema
CREATE SCHEMA IF NOT EXISTS qr_code;

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================================================
-- ENUMS
-- =============================================================================

-- QR mode enum
CREATE TYPE qr_code.qr_mode AS ENUM ('managed', 'direct');

-- Error correction level enum
CREATE TYPE qr_code.error_correction_level AS ENUM ('L', 'M', 'Q', 'H');

-- Module shape enum
CREATE TYPE qr_code.module_shape AS ENUM ('square', 'rounded', 'dots', 'diamond');

-- Eye shape enum
CREATE TYPE qr_code.eye_shape AS ENUM ('square', 'rounded', 'circle');

-- Asset format enum
CREATE TYPE qr_code.asset_format AS ENUM ('svg', 'png', 'pdf');

-- Device type enum for analytics
CREATE TYPE qr_code.device_type AS ENUM ('mobile', 'tablet', 'desktop', 'unknown');

-- Audit action enum
CREATE TYPE qr_code.audit_action AS ENUM (
  'created',
  'updated',
  'destination_changed',
  'style_changed',
  'deactivated',
  'reactivated',
  'deleted'
);

-- =============================================================================
-- TABLES
-- =============================================================================

-- Main QR codes table
CREATE TABLE qr_code.codes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Core fields
  name TEXT NOT NULL,
  mode qr_code.qr_mode NOT NULL DEFAULT 'managed',
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
  CONSTRAINT slug_required_for_managed CHECK (
    mode = 'direct' OR (mode = 'managed' AND slug IS NOT NULL)
  ),
  CONSTRAINT slug_format CHECK (
    slug IS NULL OR slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'
  ),
  CONSTRAINT name_not_empty CHECK (char_length(name) > 0),
  CONSTRAINT destination_url_not_empty CHECK (char_length(destination_url) > 0)
);

-- QR style configuration
CREATE TABLE qr_code.styles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  qr_id UUID NOT NULL REFERENCES qr_code.codes(id) ON DELETE CASCADE,

  -- Colors (hex format)
  foreground_color TEXT NOT NULL DEFAULT '#000000',
  background_color TEXT NOT NULL DEFAULT '#FFFFFF',

  -- Error correction
  error_correction qr_code.error_correction_level NOT NULL DEFAULT 'M',

  -- Layout
  quiet_zone INTEGER NOT NULL DEFAULT 4 CHECK (quiet_zone BETWEEN 2 AND 10),

  -- Shapes
  module_shape qr_code.module_shape NOT NULL DEFAULT 'square',
  eye_shape qr_code.eye_shape NOT NULL DEFAULT 'square',

  -- Logo
  logo_storage_path TEXT,
  logo_size_ratio DECIMAL(3,2) DEFAULT 0.20 CHECK (logo_size_ratio BETWEEN 0.10 AND 0.30),

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- One style per QR
  CONSTRAINT one_style_per_qr UNIQUE (qr_id),

  -- Color format validation
  CONSTRAINT foreground_color_format CHECK (foreground_color ~ '^#[0-9A-Fa-f]{6}$'),
  CONSTRAINT background_color_format CHECK (background_color ~ '^#[0-9A-Fa-f]{6}$')
);

-- Generated QR assets
CREATE TABLE qr_code.assets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  qr_id UUID NOT NULL REFERENCES qr_code.codes(id) ON DELETE CASCADE,

  -- Asset info
  format qr_code.asset_format NOT NULL,
  storage_path TEXT NOT NULL,
  size_bytes INTEGER,
  width INTEGER, -- For PNG assets

  -- Version tracking (hash of style config for cache invalidation)
  style_hash TEXT NOT NULL,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Unique constraint per format and size
  CONSTRAINT unique_asset UNIQUE (qr_id, format, width)
);

-- Scan events for analytics
CREATE TABLE qr_code.scan_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  qr_id UUID NOT NULL REFERENCES qr_code.codes(id) ON DELETE CASCADE,

  -- Timestamp
  scanned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Anonymized location (country/region level only)
  country_code TEXT,
  region TEXT,

  -- Device info (generalized)
  device_type qr_code.device_type DEFAULT 'unknown',
  os_family TEXT,
  browser_family TEXT,

  -- Referrer context (domain only, not full URL)
  referrer_domain TEXT,

  -- Hashed IP for deduplication only (not for identification)
  ip_hash TEXT
);

-- Audit log for QR changes
CREATE TABLE qr_code.audit_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  qr_id UUID NOT NULL REFERENCES qr_code.codes(id) ON DELETE CASCADE,
  actor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,

  -- Action details
  action qr_code.audit_action NOT NULL,

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
CREATE INDEX idx_qr_codes_owner ON qr_code.codes(owner_id);
CREATE INDEX idx_qr_codes_slug ON qr_code.codes(slug) WHERE slug IS NOT NULL;
CREATE INDEX idx_qr_codes_active ON qr_code.codes(is_active) WHERE is_active = true;
CREATE INDEX idx_qr_codes_created ON qr_code.codes(created_at DESC);

-- Scan events indexes (for analytics queries)
CREATE INDEX idx_scan_events_qr ON qr_code.scan_events(qr_id);
CREATE INDEX idx_scan_events_time ON qr_code.scan_events(scanned_at DESC);
CREATE INDEX idx_scan_events_qr_time ON qr_code.scan_events(qr_id, scanned_at DESC);

-- Audit log indexes
CREATE INDEX idx_audit_log_qr ON qr_code.audit_log(qr_id);
CREATE INDEX idx_audit_log_time ON qr_code.audit_log(created_at DESC);

-- =============================================================================
-- FUNCTIONS
-- =============================================================================

-- Function to generate unique slug
CREATE OR REPLACE FUNCTION qr_code.generate_unique_slug(length INTEGER DEFAULT 8)
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
      new_slug := new_slug || substr(chars, floor(random() * length(chars) + 1)::INTEGER, 1);
    END LOOP;

    -- Check uniqueness
    SELECT EXISTS (
      SELECT 1 FROM qr_code.codes WHERE slug = new_slug
    ) INTO slug_exists;

    EXIT WHEN NOT slug_exists;
  END LOOP;

  RETURN new_slug;
END;
$$;

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION qr_code.update_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Function to increment scan count
CREATE OR REPLACE FUNCTION qr_code.increment_scan_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE qr_code.codes
  SET
    total_scans = total_scans + 1,
    last_scanned_at = NOW()
  WHERE id = NEW.qr_id;
  RETURN NEW;
END;
$$;

-- Function to create default style for new QR
CREATE OR REPLACE FUNCTION qr_code.create_default_style()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  INSERT INTO qr_code.styles (qr_id)
  VALUES (NEW.id);
  RETURN NEW;
END;
$$;

-- =============================================================================
-- TRIGGERS
-- =============================================================================

-- Update updated_at on codes
CREATE TRIGGER trigger_codes_updated_at
  BEFORE UPDATE ON qr_code.codes
  FOR EACH ROW
  EXECUTE FUNCTION qr_code.update_updated_at();

-- Update updated_at on styles
CREATE TRIGGER trigger_styles_updated_at
  BEFORE UPDATE ON qr_code.styles
  FOR EACH ROW
  EXECUTE FUNCTION qr_code.update_updated_at();

-- Increment scan count on new scan event
CREATE TRIGGER trigger_increment_scan_count
  AFTER INSERT ON qr_code.scan_events
  FOR EACH ROW
  EXECUTE FUNCTION qr_code.increment_scan_count();

-- Create default style when QR is created
CREATE TRIGGER trigger_create_default_style
  AFTER INSERT ON qr_code.codes
  FOR EACH ROW
  EXECUTE FUNCTION qr_code.create_default_style();
