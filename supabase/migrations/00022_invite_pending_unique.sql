-- Migration: Prevent duplicate pending invites per (org, email)
--
-- The organization_invites table (from 00016) doesn't constrain multiple
-- pending invites to the same email. UX-wise, sending a second invite to
-- the same email while one is already pending is confusing. This partial
-- unique index rejects duplicates at the DB level — the API layer surfaces
-- a friendly "already invited" error on conflict.
--
-- Rollback: DROP INDEX IF EXISTS idx_invites_unique_pending;

BEGIN;

CREATE UNIQUE INDEX IF NOT EXISTS idx_invites_unique_pending
  ON organization_invites(org_id, lower(email))
  WHERE accepted_at IS NULL;

COMMIT;
