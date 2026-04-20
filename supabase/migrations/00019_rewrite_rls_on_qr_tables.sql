-- Migration: Rewrite RLS on qr_* tables (owner-scoped → org-scoped)
--
-- Phase 0.C.2.a of the B2B organisation model rollout. This migration
-- rewrites the 12 owner-scoped policies on qr_codes, qr_styles, qr_assets,
-- qr_scan_events, qr_audit_log to use is_member_of_org(org_id) — the
-- SECURITY DEFINER helper shipped in 00018.
--
-- Public-read policies ("Public can read active managed QR slugs") are NOT
-- touched — they don't reference ownership.
--
-- The redirect handler at /r/[slug] is unaffected: it uses the admin
-- Supabase client which bypasses RLS entirely.
--
-- Rollback: see docs/superpowers/runbooks/phase-0-migration.md

BEGIN;

-- =============================================================================
-- qr_codes
-- =============================================================================

DROP POLICY IF EXISTS "Users can view own QR codes" ON qr_codes;
DROP POLICY IF EXISTS "Users can create QR codes" ON qr_codes;
DROP POLICY IF EXISTS "Users can update own QR codes" ON qr_codes;
DROP POLICY IF EXISTS "Users can delete own QR codes" ON qr_codes;

CREATE POLICY "Users can view own QR codes"
  ON qr_codes FOR SELECT
  TO authenticated
  USING (is_member_of_org(org_id));

CREATE POLICY "Users can create QR codes"
  ON qr_codes FOR INSERT
  TO authenticated
  WITH CHECK (is_member_of_org(org_id));

CREATE POLICY "Users can update own QR codes"
  ON qr_codes FOR UPDATE
  TO authenticated
  USING (is_member_of_org(org_id))
  WITH CHECK (is_member_of_org(org_id));

CREATE POLICY "Users can delete own QR codes"
  ON qr_codes FOR DELETE
  TO authenticated
  USING (is_member_of_org(org_id));

-- =============================================================================
-- qr_styles (child of qr_codes via qr_id)
-- =============================================================================

DROP POLICY IF EXISTS "Users can view own QR styles" ON qr_styles;
DROP POLICY IF EXISTS "Users can insert own QR styles" ON qr_styles;
DROP POLICY IF EXISTS "Users can update own QR styles" ON qr_styles;

CREATE POLICY "Users can view own QR styles"
  ON qr_styles FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM qr_codes
      WHERE qr_codes.id = qr_styles.qr_id
        AND is_member_of_org(qr_codes.org_id)
    )
  );

CREATE POLICY "Users can insert own QR styles"
  ON qr_styles FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM qr_codes
      WHERE qr_codes.id = qr_styles.qr_id
        AND is_member_of_org(qr_codes.org_id)
    )
  );

CREATE POLICY "Users can update own QR styles"
  ON qr_styles FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM qr_codes
      WHERE qr_codes.id = qr_styles.qr_id
        AND is_member_of_org(qr_codes.org_id)
    )
  );

-- =============================================================================
-- qr_assets (child of qr_codes via qr_id)
-- =============================================================================

DROP POLICY IF EXISTS "Users can view own QR assets" ON qr_assets;
DROP POLICY IF EXISTS "Users can insert own QR assets" ON qr_assets;
DROP POLICY IF EXISTS "Users can delete own QR assets" ON qr_assets;

CREATE POLICY "Users can view own QR assets"
  ON qr_assets FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM qr_codes
      WHERE qr_codes.id = qr_assets.qr_id
        AND is_member_of_org(qr_codes.org_id)
    )
  );

CREATE POLICY "Users can insert own QR assets"
  ON qr_assets FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM qr_codes
      WHERE qr_codes.id = qr_assets.qr_id
        AND is_member_of_org(qr_codes.org_id)
    )
  );

CREATE POLICY "Users can delete own QR assets"
  ON qr_assets FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM qr_codes
      WHERE qr_codes.id = qr_assets.qr_id
        AND is_member_of_org(qr_codes.org_id)
    )
  );

-- =============================================================================
-- qr_scan_events (child of qr_codes via qr_id)
-- =============================================================================

DROP POLICY IF EXISTS "Users can view own scan events" ON qr_scan_events;

CREATE POLICY "Users can view own scan events"
  ON qr_scan_events FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM qr_codes
      WHERE qr_codes.id = qr_scan_events.qr_id
        AND is_member_of_org(qr_codes.org_id)
    )
  );

-- =============================================================================
-- qr_audit_log (child of qr_codes via qr_id)
-- =============================================================================

DROP POLICY IF EXISTS "Users can view own audit logs" ON qr_audit_log;

CREATE POLICY "Users can view own audit logs"
  ON qr_audit_log FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM qr_codes
      WHERE qr_codes.id = qr_audit_log.qr_id
        AND is_member_of_org(qr_codes.org_id)
    )
  );

COMMIT;
