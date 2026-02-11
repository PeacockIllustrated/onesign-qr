-- Migration: Bio Customization V2
-- Expands the bio-link page customization system with new themes, fonts,
-- backgrounds, border radius, and spacing options.

-- =============================================================================
-- EXTEND THEME ENUM
-- =============================================================================

ALTER TYPE bio_link_theme ADD VALUE IF NOT EXISTS 'pastel-dream';
ALTER TYPE bio_link_theme ADD VALUE IF NOT EXISTS 'bold';
ALTER TYPE bio_link_theme ADD VALUE IF NOT EXISTS 'glass';
ALTER TYPE bio_link_theme ADD VALUE IF NOT EXISTS 'retro';
ALTER TYPE bio_link_theme ADD VALUE IF NOT EXISTS 'nature';
ALTER TYPE bio_link_theme ADD VALUE IF NOT EXISTS 'cosmic';
ALTER TYPE bio_link_theme ADD VALUE IF NOT EXISTS 'brutalist';

-- =============================================================================
-- NEW COLUMNS (all nullable = use theme default)
-- =============================================================================

ALTER TABLE bio_link_pages ADD COLUMN IF NOT EXISTS font_title TEXT;
ALTER TABLE bio_link_pages ADD COLUMN IF NOT EXISTS font_body TEXT;
ALTER TABLE bio_link_pages ADD COLUMN IF NOT EXISTS border_radius TEXT;
ALTER TABLE bio_link_pages ADD COLUMN IF NOT EXISTS spacing TEXT DEFAULT NULL;
ALTER TABLE bio_link_pages ADD COLUMN IF NOT EXISTS background_variant TEXT DEFAULT NULL;

-- =============================================================================
-- CONSTRAINTS
-- =============================================================================

ALTER TABLE bio_link_pages ADD CONSTRAINT bio_border_radius_values
  CHECK (border_radius IS NULL OR border_radius IN ('sharp', 'rounded', 'pill', 'soft', 'chunky', 'organic'));

ALTER TABLE bio_link_pages ADD CONSTRAINT bio_spacing_values
  CHECK (spacing IS NULL OR spacing IN ('compact', 'normal', 'spacious'));

ALTER TABLE bio_link_pages ADD CONSTRAINT bio_font_title_length
  CHECK (font_title IS NULL OR char_length(font_title) <= 100);

ALTER TABLE bio_link_pages ADD CONSTRAINT bio_font_body_length
  CHECK (font_body IS NULL OR char_length(font_body) <= 100);

ALTER TABLE bio_link_pages ADD CONSTRAINT bio_bg_variant_length
  CHECK (background_variant IS NULL OR char_length(background_variant) <= 50);

-- =============================================================================
-- COMMENTS
-- =============================================================================

COMMENT ON COLUMN bio_link_pages.font_title IS 'Google Font family for title (null = theme default)';
COMMENT ON COLUMN bio_link_pages.font_body IS 'Google Font family for body text (null = theme default)';
COMMENT ON COLUMN bio_link_pages.border_radius IS 'Border radius preset override (null = theme default)';
COMMENT ON COLUMN bio_link_pages.spacing IS 'Spacing preset override (null = theme default)';
COMMENT ON COLUMN bio_link_pages.background_variant IS 'Background variant key within theme (null = theme default)';
