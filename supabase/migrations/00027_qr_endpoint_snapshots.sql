-- Migration: QR endpoint snapshots — safety net against accidental data loss
--
-- Printed/distributed QR codes encode `/r/{slug}` URLs that depend on the
-- qr_codes.slug → destination_url mapping. If that mapping is ever lost
-- (corruption, accidental delete, bad migration) those physical codes break
-- silently. This migration adds:
--
--   - qr_endpoint_snapshots: timestamped, append-only copy of the critical
--     fields (slug, destination_url, mode, is_active, org_id, owner) per QR
--   - snapshot_qr_endpoints(label TEXT): callable function that writes a
--     fresh snapshot. Call manually before risky operations or on a schedule.
--
-- RLS: org members can read their own snapshots; platform admins can read all.
-- INSERT happens only via the SECURITY DEFINER function — direct INSERTs
-- are blocked so the data path stays controlled.

BEGIN;

CREATE TABLE IF NOT EXISTS qr_endpoint_snapshots (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  snapshot_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  snapshot_label TEXT NOT NULL,                  -- e.g. 'initial-2026-05-13' or 'pre-migration-00028'

  -- Foreign keys are intentionally NOT enforced — the whole point is for the
  -- snapshot to survive if the source row is later deleted.
  qr_id UUID NOT NULL,
  org_id UUID,
  owner_id UUID,

  -- Critical fields needed to reverse-engineer a broken QR back to a working
  -- redirect. If any printed code is encoded with /r/{slug}, the row below is
  -- sufficient to reconstruct the original behaviour.
  name TEXT,
  mode TEXT NOT NULL,
  slug TEXT,
  carrier TEXT,
  destination_url TEXT NOT NULL,
  is_active BOOLEAN,
  analytics_enabled BOOLEAN,
  total_scans INT,
  qr_created_at TIMESTAMPTZ,
  qr_deleted_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_qr_endpoint_snapshots_label
  ON qr_endpoint_snapshots(snapshot_label, snapshot_at DESC);
CREATE INDEX IF NOT EXISTS idx_qr_endpoint_snapshots_qr
  ON qr_endpoint_snapshots(qr_id, snapshot_at DESC);
CREATE INDEX IF NOT EXISTS idx_qr_endpoint_snapshots_org
  ON qr_endpoint_snapshots(org_id, snapshot_at DESC);
CREATE INDEX IF NOT EXISTS idx_qr_endpoint_snapshots_slug
  ON qr_endpoint_snapshots(slug) WHERE slug IS NOT NULL;

ALTER TABLE qr_endpoint_snapshots ENABLE ROW LEVEL SECURITY;

-- Org members can read their own snapshots.
CREATE POLICY "qr_endpoint_snapshots_select_member"
  ON qr_endpoint_snapshots FOR SELECT
  TO authenticated
  USING (org_id IS NOT NULL AND is_member_of_org(org_id));

-- Platform admins can read all snapshots.
CREATE POLICY "qr_endpoint_snapshots_select_admin"
  ON qr_endpoint_snapshots FOR SELECT
  TO authenticated
  USING (is_platform_admin());

-- No direct INSERT/UPDATE/DELETE policies — the table is append-only via the
-- SECURITY DEFINER function below.

-- =============================================================================
-- FUNCTION: snapshot_qr_endpoints(label TEXT)
-- =============================================================================

CREATE OR REPLACE FUNCTION snapshot_qr_endpoints(label TEXT)
RETURNS TABLE(rows_snapshotted INT, snapshot_label TEXT, snapshot_at TIMESTAMPTZ)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  ts TIMESTAMPTZ := now();
  count_inserted INT;
BEGIN
  IF label IS NULL OR char_length(trim(label)) = 0 THEN
    RAISE EXCEPTION 'snapshot label is required';
  END IF;

  INSERT INTO qr_endpoint_snapshots (
    snapshot_at, snapshot_label,
    qr_id, org_id, owner_id,
    name, mode, slug, carrier, destination_url,
    is_active, analytics_enabled, total_scans,
    qr_created_at, qr_deleted_at
  )
  SELECT
    ts, label,
    id, org_id, owner_id,
    name, mode::text, slug, carrier::text, destination_url,
    is_active, analytics_enabled, total_scans,
    created_at, deleted_at
  FROM qr_codes;

  GET DIAGNOSTICS count_inserted = ROW_COUNT;

  RETURN QUERY SELECT count_inserted, label, ts;
END;
$$;

-- Restrict execution to platform admins (callable from server-side admin
-- tooling; ordinary user routes don't need this).
REVOKE EXECUTE ON FUNCTION snapshot_qr_endpoints(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION snapshot_qr_endpoints(TEXT) TO authenticated;

-- =============================================================================
-- VIEW: v_qr_endpoint_latest — most recent snapshot per QR
-- =============================================================================

CREATE OR REPLACE VIEW v_qr_endpoint_latest AS
SELECT DISTINCT ON (qr_id)
  qr_id, org_id, owner_id,
  name, mode, slug, carrier, destination_url,
  is_active, total_scans,
  snapshot_at, snapshot_label
FROM qr_endpoint_snapshots
ORDER BY qr_id, snapshot_at DESC;

COMMENT ON TABLE qr_endpoint_snapshots IS
  'Append-only safety snapshots of qr_codes. Call snapshot_qr_endpoints(label) to capture current state.';
COMMENT ON FUNCTION snapshot_qr_endpoints(TEXT) IS
  'Captures a timestamped snapshot of all qr_codes rows into qr_endpoint_snapshots.';
COMMENT ON VIEW v_qr_endpoint_latest IS
  'Most recent snapshot per QR — for quick lookup of the canonical slug → destination_url mapping.';

COMMIT;
