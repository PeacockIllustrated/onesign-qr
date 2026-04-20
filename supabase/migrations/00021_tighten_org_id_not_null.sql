-- Migration: Tighten org_id to NOT NULL on bio_link_pages and qr_codes
--
-- Phase 0.C.2.c of the B2B organisation model rollout. Final invariant
-- lock-in: every row in bio_link_pages and qr_codes must have a non-null
-- org_id.
--
-- Pre-flight query (run before this migration):
--   SELECT COUNT(*) FROM bio_link_pages WHERE org_id IS NULL;  -- expect 0
--   SELECT COUNT(*) FROM qr_codes WHERE org_id IS NULL;        -- expect 0
--
-- If either returns non-zero, DO NOT proceed with this migration.
-- Investigate the rows with NULL org_id first. Common causes:
--   - Row with NULL owner_id that Phase 0.B backfill skipped (orphaned).
--   - Row inserted between Phase 0.B backfill and Phase 0.B API updates.
--
-- Rollback: see docs/superpowers/runbooks/phase-0-migration.md

BEGIN;

ALTER TABLE bio_link_pages ALTER COLUMN org_id SET NOT NULL;
ALTER TABLE qr_codes ALTER COLUMN org_id SET NOT NULL;

COMMIT;
