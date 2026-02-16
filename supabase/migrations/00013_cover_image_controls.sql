-- Migration: Cover Image Controls
-- Adds aspect ratio and vertical position controls for cover images
-- on Split and Cover card layouts.

-- =============================================================================
-- NEW COLUMNS (all nullable = use app-layer defaults)
-- =============================================================================

ALTER TABLE bio_link_pages ADD COLUMN IF NOT EXISTS cover_aspect_ratio TEXT DEFAULT NULL;
ALTER TABLE bio_link_pages ADD COLUMN IF NOT EXISTS cover_position_y INTEGER DEFAULT NULL;

-- =============================================================================
-- CONSTRAINTS
-- =============================================================================

ALTER TABLE bio_link_pages ADD CONSTRAINT bio_cover_aspect_ratio_values
  CHECK (cover_aspect_ratio IS NULL OR cover_aspect_ratio IN ('3:1', '16:9', '2:1', '4:3'));

ALTER TABLE bio_link_pages ADD CONSTRAINT bio_cover_position_y_range
  CHECK (cover_position_y IS NULL OR (cover_position_y >= 0 AND cover_position_y <= 100));

-- =============================================================================
-- COMMENTS
-- =============================================================================

COMMENT ON COLUMN bio_link_pages.cover_aspect_ratio IS 'Cover image aspect ratio (null = 3:1)';
COMMENT ON COLUMN bio_link_pages.cover_position_y IS 'Cover image vertical focal point 0-100% (null = 50 center)';
