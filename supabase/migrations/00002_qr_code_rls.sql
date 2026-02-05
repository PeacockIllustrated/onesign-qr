-- Migration: Row Level Security policies for qr_code schema
-- These policies ensure users can only access their own data

-- =============================================================================
-- ENABLE RLS ON ALL TABLES
-- =============================================================================

ALTER TABLE qr_code.codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE qr_code.styles ENABLE ROW LEVEL SECURITY;
ALTER TABLE qr_code.assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE qr_code.scan_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE qr_code.audit_log ENABLE ROW LEVEL SECURITY;

-- =============================================================================
-- QR CODES POLICIES
-- =============================================================================

-- Users can view their own QR codes
CREATE POLICY "codes_select_own"
  ON qr_code.codes
  FOR SELECT
  USING (auth.uid() = owner_id);

-- Users can insert their own QR codes
CREATE POLICY "codes_insert_own"
  ON qr_code.codes
  FOR INSERT
  WITH CHECK (auth.uid() = owner_id);

-- Users can update their own QR codes
CREATE POLICY "codes_update_own"
  ON qr_code.codes
  FOR UPDATE
  USING (auth.uid() = owner_id);

-- Users can delete their own QR codes
CREATE POLICY "codes_delete_own"
  ON qr_code.codes
  FOR DELETE
  USING (auth.uid() = owner_id);

-- Public policy: Allow slug lookup for redirects (no auth required)
-- This is a separate policy that allows reading only active managed QRs by slug
CREATE POLICY "codes_select_by_slug_public"
  ON qr_code.codes
  FOR SELECT
  USING (
    slug IS NOT NULL
    AND is_active = true
    AND mode = 'managed'
  );

-- =============================================================================
-- QR STYLES POLICIES
-- =============================================================================

-- Users can view styles for their own QR codes
CREATE POLICY "styles_select_own"
  ON qr_code.styles
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM qr_code.codes
      WHERE qr_code.codes.id = qr_code.styles.qr_id
      AND qr_code.codes.owner_id = auth.uid()
    )
  );

-- Users can insert styles for their own QR codes
CREATE POLICY "styles_insert_own"
  ON qr_code.styles
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM qr_code.codes
      WHERE qr_code.codes.id = qr_code.styles.qr_id
      AND qr_code.codes.owner_id = auth.uid()
    )
  );

-- Users can update styles for their own QR codes
CREATE POLICY "styles_update_own"
  ON qr_code.styles
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM qr_code.codes
      WHERE qr_code.codes.id = qr_code.styles.qr_id
      AND qr_code.codes.owner_id = auth.uid()
    )
  );

-- =============================================================================
-- QR ASSETS POLICIES
-- =============================================================================

-- Users can view assets for their own QR codes
CREATE POLICY "assets_select_own"
  ON qr_code.assets
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM qr_code.codes
      WHERE qr_code.codes.id = qr_code.assets.qr_id
      AND qr_code.codes.owner_id = auth.uid()
    )
  );

-- Assets are managed by service role only (server-side generation)
-- No insert/update/delete policies for regular users

-- =============================================================================
-- SCAN EVENTS POLICIES
-- =============================================================================

-- Users can view scan events for their own QR codes (if analytics enabled)
CREATE POLICY "scan_events_select_own"
  ON qr_code.scan_events
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM qr_code.codes
      WHERE qr_code.codes.id = qr_code.scan_events.qr_id
      AND qr_code.codes.owner_id = auth.uid()
      AND qr_code.codes.analytics_enabled = true
    )
  );

-- Scan events are inserted by service role only (from redirect handler)
-- No insert policy for regular users

-- =============================================================================
-- AUDIT LOG POLICIES
-- =============================================================================

-- Users can view audit logs for their own QR codes
CREATE POLICY "audit_log_select_own"
  ON qr_code.audit_log
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM qr_code.codes
      WHERE qr_code.codes.id = qr_code.audit_log.qr_id
      AND qr_code.codes.owner_id = auth.uid()
    )
  );

-- Audit logs are managed by triggers/service role only
-- No insert/update/delete policies for regular users

-- =============================================================================
-- GRANT PERMISSIONS
-- =============================================================================

-- Grant usage on schema to authenticated users
GRANT USAGE ON SCHEMA qr_code TO authenticated;

-- Grant select on all tables to authenticated (RLS will filter)
GRANT SELECT ON ALL TABLES IN SCHEMA qr_code TO authenticated;

-- Grant insert/update/delete on codes and styles to authenticated
GRANT INSERT, UPDATE, DELETE ON qr_code.codes TO authenticated;
GRANT INSERT, UPDATE ON qr_code.styles TO authenticated;

-- Grant usage on sequences
GRANT USAGE ON ALL SEQUENCES IN SCHEMA qr_code TO authenticated;

-- Service role has full access (for server-side operations)
GRANT ALL ON SCHEMA qr_code TO service_role;
GRANT ALL ON ALL TABLES IN SCHEMA qr_code TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA qr_code TO service_role;
