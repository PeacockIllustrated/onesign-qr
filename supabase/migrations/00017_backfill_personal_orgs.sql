-- Migration: Backfill personal organisations and auto-create-on-signup trigger
--
-- Phase 0.B of the B2B organisation model rollout. This migration:
--   1. Creates one personal organisation per existing auth.users row.
--   2. Populates bio_link_pages.org_id and qr_codes.org_id from the owner's
--      personal org (only where org_id IS NULL — idempotent).
--   3. Installs an AFTER INSERT trigger on auth.users that auto-creates a
--      personal organisation for every new user going forward.
--
-- Does NOT:
--   - Enable RLS on any of the organisation tables (Phase 0.C).
--   - Drop any column or constraint.
--   - Touch the redirect-critical columns on qr_codes (slug, destination_url,
--     is_active, analytics_enabled, mode).
--
-- Rollback: see docs/superpowers/runbooks/phase-0-migration.md

BEGIN;

-- =============================================================================
-- HELPER: generate_unique_org_slug
--
-- Returns a URL-safe slug derived from the input, guaranteed unique among
-- active (non-soft-deleted) organisations by appending -1, -2, ... on
-- collision. Lowercases, replaces non-alphanumeric runs with a single
-- hyphen, and trims leading/trailing hyphens. If the resulting base is
-- empty (e.g. pathological email), defaults to 'user'.
-- =============================================================================

CREATE OR REPLACE FUNCTION generate_unique_org_slug(base_input TEXT)
RETURNS TEXT AS $$
DECLARE
  base_slug TEXT;
  final_slug TEXT;
  suffix INT := 0;
BEGIN
  base_slug := lower(regexp_replace(coalesce(base_input, ''), '[^a-zA-Z0-9]+', '-', 'g'));
  base_slug := trim(both '-' from base_slug);
  IF base_slug = '' THEN
    base_slug := 'user';
  END IF;

  final_slug := base_slug;
  WHILE EXISTS (
    SELECT 1 FROM organizations
    WHERE slug = final_slug AND deleted_at IS NULL
  ) LOOP
    suffix := suffix + 1;
    final_slug := base_slug || '-' || suffix::text;
  END LOOP;

  RETURN final_slug;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- BACKFILL: create personal orgs for existing users without one
-- =============================================================================

DO $$
DECLARE
  u RECORD;
  new_org_id UUID;
  email_prefix TEXT;
  org_name TEXT;
  org_slug TEXT;
BEGIN
  FOR u IN
    SELECT id, email
    FROM auth.users
    WHERE NOT EXISTS (
      SELECT 1 FROM organization_members WHERE organization_members.user_id = auth.users.id
    )
  LOOP
    email_prefix := coalesce(split_part(u.email, '@', 1), '');
    IF email_prefix = '' THEN
      email_prefix := 'user';
    END IF;

    org_name := email_prefix || '''s workspace';

    -- Retry loop: on unique_violation for slug (concurrent signup took it),
    -- regenerate and try again up to 3 times before giving up.
    DECLARE
      attempt INT := 0;
    BEGIN
      LOOP
        org_slug := generate_unique_org_slug(email_prefix);
        BEGIN
          INSERT INTO organizations (name, slug, plan)
          VALUES (org_name, org_slug, 'free')
          RETURNING id INTO new_org_id;
          EXIT;
        EXCEPTION WHEN unique_violation THEN
          attempt := attempt + 1;
          IF attempt >= 3 THEN
            RAISE;
          END IF;
        END;
      END LOOP;
    END;

    INSERT INTO organization_members (org_id, user_id, role)
    VALUES (new_org_id, u.id, 'owner');
  END LOOP;
END $$;

-- =============================================================================
-- INVARIANT CHECK: each user must have at most one membership before we
-- populate org_id on data rows. If this raises, the backfill or a prior
-- partial run created duplicates — investigate before continuing.
-- =============================================================================

DO $$
DECLARE
  dup_count INT;
BEGIN
  SELECT COUNT(*) INTO dup_count FROM (
    SELECT user_id FROM organization_members GROUP BY user_id HAVING COUNT(*) > 1
  ) t;
  IF dup_count > 0 THEN
    RAISE EXCEPTION 'Invariant violation: % user(s) have duplicate memberships. Aborting migration.', dup_count;
  END IF;
END $$;

-- =============================================================================
-- BACKFILL: populate org_id on existing bio_link_pages and qr_codes rows
--
-- Only touches rows where org_id IS NULL. Safe to re-run.
-- =============================================================================

UPDATE bio_link_pages AS p
SET org_id = (
  SELECT m.org_id
  FROM organization_members m
  WHERE m.user_id = p.owner_id
  LIMIT 1
)
WHERE p.org_id IS NULL
  AND p.owner_id IS NOT NULL;

UPDATE qr_codes AS q
SET org_id = (
  SELECT m.org_id
  FROM organization_members m
  WHERE m.user_id = q.owner_id
  LIMIT 1
)
WHERE q.org_id IS NULL
  AND q.owner_id IS NOT NULL;

-- =============================================================================
-- TRIGGER: auto-create personal org on auth.users insert
--
-- Runs AFTER INSERT so NEW.id is guaranteed to exist in auth.users before we
-- reference it via organization_members.user_id (FK). SECURITY DEFINER is
-- required because the trigger runs in the context of the inserter (which may
-- be an unauthenticated magic-link flow), but needs to INSERT into
-- organizations and organization_members.
--
-- Idempotency: the trigger uses the same NOT EXISTS guard as the backfill
-- block, so if it ever fires twice for the same user (e.g. manual INSERT then
-- trigger), no duplicate is created.
-- =============================================================================

CREATE OR REPLACE FUNCTION auto_create_personal_org()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  new_org_id UUID;
  email_prefix TEXT;
  org_name TEXT;
  org_slug TEXT;
BEGIN
  -- Skip if this user somehow already has a membership.
  IF EXISTS (
    SELECT 1 FROM organization_members WHERE user_id = NEW.id
  ) THEN
    RETURN NEW;
  END IF;

  email_prefix := coalesce(split_part(NEW.email, '@', 1), '');
  IF email_prefix = '' THEN
    email_prefix := 'user';
  END IF;

  org_name := email_prefix || '''s workspace';

  -- Retry loop: on unique_violation for slug (concurrent signup took it),
  -- regenerate and try again up to 3 times before giving up.
  DECLARE
    attempt INT := 0;
  BEGIN
    LOOP
      org_slug := generate_unique_org_slug(email_prefix);
      BEGIN
        INSERT INTO organizations (name, slug, plan)
        VALUES (org_name, org_slug, 'free')
        RETURNING id INTO new_org_id;
        EXIT;
      EXCEPTION WHEN unique_violation THEN
        attempt := attempt + 1;
        IF attempt >= 3 THEN
          RAISE;
        END IF;
      END;
    END LOOP;
  END;

  INSERT INTO organization_members (org_id, user_id, role)
  VALUES (new_org_id, NEW.id, 'owner');

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_auto_create_personal_org ON auth.users;
CREATE TRIGGER trg_auto_create_personal_org
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION auto_create_personal_org();

-- =============================================================================
-- BACKFILL PASS 2: create personal orgs for any signups that slipped through
-- the race window between END LOOP and CREATE TRIGGER above
-- =============================================================================

DO $$
DECLARE
  u RECORD;
  new_org_id UUID;
  email_prefix TEXT;
  org_name TEXT;
  org_slug TEXT;
BEGIN
  FOR u IN
    SELECT id, email
    FROM auth.users
    WHERE NOT EXISTS (
      SELECT 1 FROM organization_members WHERE organization_members.user_id = auth.users.id
    )
  LOOP
    email_prefix := coalesce(split_part(u.email, '@', 1), '');
    IF email_prefix = '' THEN
      email_prefix := 'user';
    END IF;

    org_name := email_prefix || '''s workspace';

    -- Retry loop: on unique_violation for slug (concurrent signup took it),
    -- regenerate and try again up to 3 times before giving up.
    DECLARE
      attempt INT := 0;
    BEGIN
      LOOP
        org_slug := generate_unique_org_slug(email_prefix);
        BEGIN
          INSERT INTO organizations (name, slug, plan)
          VALUES (org_name, org_slug, 'free')
          RETURNING id INTO new_org_id;
          EXIT;
        EXCEPTION WHEN unique_violation THEN
          attempt := attempt + 1;
          IF attempt >= 3 THEN
            RAISE;
          END IF;
        END;
      END LOOP;
    END;

    INSERT INTO organization_members (org_id, user_id, role)
    VALUES (new_org_id, u.id, 'owner');
  END LOOP;
END $$;

COMMIT;
