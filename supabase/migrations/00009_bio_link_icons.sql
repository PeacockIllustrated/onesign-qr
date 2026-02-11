-- =============================================================================
-- Migration: 00009_bio_link_icons
-- Description: Add icon system to bio link items
--   - icon_type: 'emoji' | 'image' | 'favicon' | null (null = no icon)
--   - icon_url: URL for image/favicon icons (nullable)
--   - show_icon: whether to display the icon (default true)
-- =============================================================================

-- Add icon_type column (nullable, enum-like via CHECK)
ALTER TABLE bio_link_items
  ADD COLUMN IF NOT EXISTS icon_type TEXT DEFAULT NULL;

ALTER TABLE bio_link_items
  ADD CONSTRAINT bio_link_icon_type_values
    CHECK (icon_type IS NULL OR icon_type IN ('emoji', 'image', 'favicon'));

-- Add icon_url for image/favicon URLs
ALTER TABLE bio_link_items
  ADD COLUMN IF NOT EXISTS icon_url TEXT DEFAULT NULL;

-- Add show_icon toggle (defaults to true)
ALTER TABLE bio_link_items
  ADD COLUMN IF NOT EXISTS show_icon BOOLEAN NOT NULL DEFAULT true;

-- Backfill existing rows: if icon is non-null, set icon_type to 'emoji'
UPDATE bio_link_items
  SET icon_type = 'emoji'
  WHERE icon IS NOT NULL AND icon != '' AND icon_type IS NULL;
