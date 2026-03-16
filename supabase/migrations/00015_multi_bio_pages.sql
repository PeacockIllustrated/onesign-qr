-- Allow multiple bio pages per user (max enforced at app level).
-- Only one page can be active (live) at a time per user.

-- 1. Drop the one-page-per-user unique constraint
ALTER TABLE bio_link_pages DROP CONSTRAINT IF EXISTS bio_one_page_per_user;

-- 2. Add a partial unique index: only one active (non-deleted) page per user
CREATE UNIQUE INDEX bio_one_active_page_per_user
  ON bio_link_pages (owner_id)
  WHERE is_active = true AND deleted_at IS NULL;
