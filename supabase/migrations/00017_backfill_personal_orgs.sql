-- Migration: Backfill personal organizations and populate org_id on owned tables
--
-- Phase 0.B of the B2B organisation model rollout. Data-only; no schema
-- changes. Idempotent: safe to re-run.
--
-- For every row in auth.users without a personal organization, this migration:
--   1. Creates a personal organization with a deterministic slug derived from
--      the user's id (`personal-<first 8 hex chars of user_id>`), guaranteeing
--      uniqueness without needing to probe the email prefix namespace.
--   2. Inserts (org_id, user_id, 'owner') into organization_members.
--   3. Populates org_id on bio_link_pages and qr_codes for every row whose
--      owner_id belongs to a user that now has a personal org (this also
--      covers users whose personal org pre-existed).
--
-- The redirect handler at /r/[slug] is unaffected — it reads only slug,
-- destination_url, is_active, analytics_enabled, mode on qr_codes. None of
-- those are touched.
--
-- All work runs inside a single transaction. On any failure, nothing changes.
--
-- Verification gates (must pass before Phase 0.C):
--   SELECT COUNT(*) FROM auth.users
--     = SELECT COUNT(DISTINCT user_id) FROM organization_members WHERE role='owner'
--   SELECT COUNT(*) FROM bio_link_pages WHERE org_id IS NULL = 0
--   SELECT COUNT(*) FROM qr_codes       WHERE org_id IS NULL = 0
--
-- Rollback: a paired rollback script (scripts/migration-safety/rollback-0b.sql)
-- deletes the generated personal orgs and nulls org_id on the owned tables.
-- Only safe to run if no user-visible org-related writes have happened since.

BEGIN;

-- =============================================================================
-- STEP 1: Create a personal organization for every user that doesn't have one.
--
-- We identify "has a personal org" as: being an owner of any organization whose
-- slug starts with 'personal-'. Using a deterministic slug (`personal-<uid8>`)
-- makes this migration idempotent and avoids the email-prefix collision
-- problem (multiple users at different email domains sharing `alice@...`).
-- =============================================================================

WITH users_needing_orgs AS (
  SELECT
    u.id AS user_id,
    u.email,
    'personal-' || substr(replace(u.id::text, '-', ''), 1, 8) AS candidate_slug,
    COALESCE(
      NULLIF(split_part(u.email, '@', 1), ''),
      'workspace'
    ) AS email_prefix
  FROM auth.users u
  WHERE NOT EXISTS (
    SELECT 1
    FROM organization_members m
    JOIN organizations o ON o.id = m.org_id
    WHERE m.user_id = u.id
      AND m.role = 'owner'
      AND o.slug LIKE 'personal-%'
      AND o.deleted_at IS NULL
  )
),
created_orgs AS (
  INSERT INTO organizations (name, slug, plan)
  SELECT
    email_prefix || '''s workspace',
    candidate_slug,
    'free'::organization_plan
  FROM users_needing_orgs
  RETURNING id, slug
)
INSERT INTO organization_members (org_id, user_id, role)
SELECT co.id, unu.user_id, 'owner'::member_role
FROM created_orgs co
JOIN users_needing_orgs unu ON unu.candidate_slug = co.slug
ON CONFLICT (org_id, user_id) DO NOTHING;

-- =============================================================================
-- STEP 2: Backfill org_id on bio_link_pages from the owner's personal org.
-- =============================================================================

UPDATE bio_link_pages p
SET org_id = m.org_id
FROM organization_members m
JOIN organizations o ON o.id = m.org_id
WHERE p.org_id IS NULL
  AND m.user_id = p.owner_id
  AND m.role = 'owner'
  AND o.slug LIKE 'personal-%'
  AND o.deleted_at IS NULL;

-- =============================================================================
-- STEP 3: Backfill org_id on qr_codes from the owner's personal org.
-- =============================================================================

UPDATE qr_codes q
SET org_id = m.org_id
FROM organization_members m
JOIN organizations o ON o.id = m.org_id
WHERE q.org_id IS NULL
  AND m.user_id = q.owner_id
  AND m.role = 'owner'
  AND o.slug LIKE 'personal-%'
  AND o.deleted_at IS NULL;

-- =============================================================================
-- STEP 4: Assertive in-transaction verification. If any invariant fails, the
-- transaction rolls back and nothing is committed.
-- =============================================================================

DO $$
DECLARE
  unassigned_pages INT;
  unassigned_qrs   INT;
  users_count      INT;
  owners_count     INT;
BEGIN
  SELECT COUNT(*) INTO unassigned_pages FROM bio_link_pages WHERE org_id IS NULL;
  SELECT COUNT(*) INTO unassigned_qrs   FROM qr_codes       WHERE org_id IS NULL;
  SELECT COUNT(*) INTO users_count FROM auth.users;
  SELECT COUNT(DISTINCT m.user_id) INTO owners_count
  FROM organization_members m
  JOIN organizations o ON o.id = m.org_id
  WHERE m.role = 'owner'
    AND o.slug LIKE 'personal-%'
    AND o.deleted_at IS NULL;

  IF unassigned_pages <> 0 THEN
    RAISE EXCEPTION 'Phase 0.B verification failed: % bio_link_pages rows still have NULL org_id', unassigned_pages;
  END IF;

  IF unassigned_qrs <> 0 THEN
    RAISE EXCEPTION 'Phase 0.B verification failed: % qr_codes rows still have NULL org_id', unassigned_qrs;
  END IF;

  IF users_count <> owners_count THEN
    RAISE EXCEPTION 'Phase 0.B verification failed: auth.users=% but personal-org owners=%', users_count, owners_count;
  END IF;
END $$;

COMMIT;
