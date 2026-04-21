-- Rollback for Phase 0.B backfill (supabase/migrations/00017_backfill_personal_orgs.sql).
--
-- Only safe to run if no user-visible writes have occurred to organizations,
-- organization_members, bio_link_pages.org_id, or qr_codes.org_id since the
-- backfill ran. If any real org has been created (slug not starting with
-- 'personal-') or real members added, do not run this rollback without a
-- manual review — it will leave those rows untouched, but the org_id columns
-- on owned tables will be reset and may break app reads that have already
-- been cut over.
--
-- Effect:
--   - Null out org_id on bio_link_pages and qr_codes.
--   - Delete membership rows that point at personal-* orgs.
--   - Delete the personal-* organizations themselves.
--
-- The owner_id column on every owned table is untouched; it remains the
-- source of truth until Phase 0.D contraction.

BEGIN;

UPDATE qr_codes
SET org_id = NULL
WHERE org_id IN (
  SELECT id FROM organizations
  WHERE slug LIKE 'personal-%' AND deleted_at IS NULL
);

UPDATE bio_link_pages
SET org_id = NULL
WHERE org_id IN (
  SELECT id FROM organizations
  WHERE slug LIKE 'personal-%' AND deleted_at IS NULL
);

DELETE FROM organization_members
WHERE org_id IN (
  SELECT id FROM organizations
  WHERE slug LIKE 'personal-%' AND deleted_at IS NULL
);

DELETE FROM organizations
WHERE slug LIKE 'personal-%' AND deleted_at IS NULL;

-- Sanity: confirm no stray references remain.
DO $$
DECLARE
  stale_pages INT;
  stale_qrs   INT;
BEGIN
  SELECT COUNT(*) INTO stale_pages
  FROM bio_link_pages p
  LEFT JOIN organizations o ON o.id = p.org_id
  WHERE p.org_id IS NOT NULL AND o.id IS NULL;

  SELECT COUNT(*) INTO stale_qrs
  FROM qr_codes q
  LEFT JOIN organizations o ON o.id = q.org_id
  WHERE q.org_id IS NOT NULL AND o.id IS NULL;

  IF stale_pages + stale_qrs > 0 THEN
    RAISE EXCEPTION 'Rollback verification failed: % stale org_id references still exist', stale_pages + stale_qrs;
  END IF;
END $$;

COMMIT;
