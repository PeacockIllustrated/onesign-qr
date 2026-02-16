-- Migration: Bio Grid Blocks
-- Transforms the bio-link page from a flat list of links into a customizable
-- grid canvas with diverse widget block types (link, heading, text, image,
-- social icons, divider, spacer, spotify embed, youtube embed, map).

-- =============================================================================
-- ENUMS
-- =============================================================================

DO $$ BEGIN
  CREATE TYPE bio_block_type AS ENUM (
    'link',
    'heading',
    'text',
    'image',
    'social_icons',
    'divider',
    'spacer',
    'spotify_embed',
    'youtube_embed',
    'map'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- =============================================================================
-- ALTER bio_link_pages: add layout_mode + grid_config
-- =============================================================================

ALTER TABLE bio_link_pages
  ADD COLUMN IF NOT EXISTS layout_mode TEXT NOT NULL DEFAULT 'grid';

DO $$ BEGIN
  ALTER TABLE bio_link_pages
    ADD CONSTRAINT bio_layout_mode_values CHECK (layout_mode IN ('list', 'grid'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE bio_link_pages
  ADD COLUMN IF NOT EXISTS grid_config JSONB DEFAULT NULL;

-- =============================================================================
-- TABLE: bio_blocks
-- =============================================================================

CREATE TABLE IF NOT EXISTS bio_blocks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  page_id UUID NOT NULL REFERENCES bio_link_pages(id) ON DELETE CASCADE,

  -- Block type
  block_type bio_block_type NOT NULL DEFAULT 'link',

  -- Grid placement (4-column grid)
  grid_col INTEGER NOT NULL DEFAULT 0,
  grid_row INTEGER NOT NULL DEFAULT 0,
  grid_col_span INTEGER NOT NULL DEFAULT 4,
  grid_row_span INTEGER NOT NULL DEFAULT 1,

  -- Content (JSON blob — shape depends on block_type, validated at app layer)
  content JSONB NOT NULL DEFAULT '{}',

  -- Visibility and ordering
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_enabled BOOLEAN NOT NULL DEFAULT true,

  -- Analytics
  total_clicks INTEGER NOT NULL DEFAULT 0,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Constraints
  CONSTRAINT bio_block_col_range CHECK (grid_col BETWEEN 0 AND 3),
  CONSTRAINT bio_block_col_span_range CHECK (grid_col_span BETWEEN 1 AND 4),
  CONSTRAINT bio_block_row_span_range CHECK (grid_row_span BETWEEN 1 AND 4),
  CONSTRAINT bio_block_col_fits CHECK (grid_col + grid_col_span <= 4),
  CONSTRAINT bio_block_row_nonneg CHECK (grid_row >= 0)
);

-- =============================================================================
-- TABLE: bio_block_click_events (analytics)
-- =============================================================================

CREATE TABLE IF NOT EXISTS bio_block_click_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  block_id UUID NOT NULL REFERENCES bio_blocks(id) ON DELETE CASCADE,
  page_id UUID NOT NULL REFERENCES bio_link_pages(id) ON DELETE CASCADE,

  clicked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Anonymized analytics
  country_code TEXT,
  device_type qr_device_type DEFAULT 'unknown',
  ip_hash TEXT
);

-- =============================================================================
-- INDEXES
-- =============================================================================

CREATE INDEX IF NOT EXISTS idx_bio_blocks_page ON bio_blocks(page_id);
CREATE INDEX IF NOT EXISTS idx_bio_blocks_page_grid ON bio_blocks(page_id, grid_row, grid_col);
CREATE INDEX IF NOT EXISTS idx_bio_blocks_page_order ON bio_blocks(page_id, sort_order);

CREATE INDEX IF NOT EXISTS idx_bio_block_click_events_block ON bio_block_click_events(block_id);
CREATE INDEX IF NOT EXISTS idx_bio_block_click_events_page ON bio_block_click_events(page_id);
CREATE INDEX IF NOT EXISTS idx_bio_block_click_events_time ON bio_block_click_events(clicked_at DESC);

-- =============================================================================
-- TRIGGERS
-- =============================================================================

-- Updated_at trigger for bio_blocks (reuses existing function)
DROP TRIGGER IF EXISTS trigger_bio_blocks_updated_at ON bio_blocks;
CREATE TRIGGER trigger_bio_blocks_updated_at
  BEFORE UPDATE ON bio_blocks
  FOR EACH ROW
  EXECUTE FUNCTION update_bio_updated_at();

-- Increment block click count
CREATE OR REPLACE FUNCTION increment_bio_block_click_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE bio_blocks
  SET total_clicks = total_clicks + 1
  WHERE id = NEW.block_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_bio_increment_block_click_count ON bio_block_click_events;
CREATE TRIGGER trigger_bio_increment_block_click_count
  AFTER INSERT ON bio_block_click_events
  FOR EACH ROW
  EXECUTE FUNCTION increment_bio_block_click_count();

-- =============================================================================
-- ROW LEVEL SECURITY
-- =============================================================================

ALTER TABLE bio_blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE bio_block_click_events ENABLE ROW LEVEL SECURITY;

-- Bio blocks: owners via parent page
CREATE POLICY "Users can view own bio blocks"
  ON bio_blocks FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM bio_link_pages
      WHERE bio_link_pages.id = bio_blocks.page_id
      AND bio_link_pages.owner_id = auth.uid()
    )
  );

CREATE POLICY "Users can create bio blocks"
  ON bio_blocks FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM bio_link_pages
      WHERE bio_link_pages.id = bio_blocks.page_id
      AND bio_link_pages.owner_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own bio blocks"
  ON bio_blocks FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM bio_link_pages
      WHERE bio_link_pages.id = bio_blocks.page_id
      AND bio_link_pages.owner_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own bio blocks"
  ON bio_blocks FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM bio_link_pages
      WHERE bio_link_pages.id = bio_blocks.page_id
      AND bio_link_pages.owner_id = auth.uid()
    )
  );

-- Bio blocks: public read of enabled blocks on active pages
CREATE POLICY "Public can read enabled bio blocks"
  ON bio_blocks FOR SELECT
  TO anon
  USING (
    is_enabled = true AND
    EXISTS (
      SELECT 1 FROM bio_link_pages
      WHERE bio_link_pages.id = bio_blocks.page_id
      AND bio_link_pages.is_active = true
      AND bio_link_pages.deleted_at IS NULL
    )
  );

-- Block click events: owners can read their own
CREATE POLICY "Users can view own bio block click events"
  ON bio_block_click_events FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM bio_link_pages
      WHERE bio_link_pages.id = bio_block_click_events.page_id
      AND bio_link_pages.owner_id = auth.uid()
    )
  );

-- =============================================================================
-- AUTO-MIGRATION: Convert existing bio_link_items → bio_blocks
-- =============================================================================

-- Function to migrate a single page's items to blocks
CREATE OR REPLACE FUNCTION migrate_bio_items_to_blocks(p_page_id UUID)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  item RECORD;
  row_idx INTEGER := 0;
BEGIN
  FOR item IN
    SELECT * FROM bio_link_items
    WHERE page_id = p_page_id
    ORDER BY sort_order ASC
  LOOP
    INSERT INTO bio_blocks (
      page_id, block_type,
      grid_col, grid_row, grid_col_span, grid_row_span,
      content, sort_order, is_enabled, total_clicks
    )
    VALUES (
      p_page_id,
      'link',
      0,         -- full-width start
      row_idx,   -- sequential rows
      4,         -- full-width span
      1,         -- single row height
      jsonb_build_object(
        'title', item.title,
        'url', item.url,
        'icon', item.icon,
        'icon_type', item.icon_type,
        'icon_url', item.icon_url,
        'icon_bg_color', item.icon_bg_color,
        'show_icon', COALESCE(item.show_icon, true)
      ),
      item.sort_order,
      item.is_enabled,
      item.total_clicks
    );
    row_idx := row_idx + 1;
  END LOOP;
END;
$$;

-- Run auto-migration for all existing pages
DO $$
DECLARE
  page_record RECORD;
BEGIN
  FOR page_record IN
    SELECT id FROM bio_link_pages WHERE deleted_at IS NULL
  LOOP
    PERFORM migrate_bio_items_to_blocks(page_record.id);
  END LOOP;
END;
$$;
