-- Migration: Rewrite RLS on bio_* tables (owner-scoped → org-scoped)
--
-- Phase 0.C.2.b of the B2B organisation model rollout. This migration
-- rewrites the 19 owner-scoped policies on bio_link_pages, bio_link_items,
-- bio_link_view_events, bio_link_click_events, bio_link_audit_log,
-- bio_blocks, bio_block_click_events, bio_form_submissions to use
-- is_member_of_org(org_id) — the SECURITY DEFINER helper shipped in 00018.
--
-- Public-read policies are NOT touched.
--
-- Rollback: see docs/superpowers/runbooks/phase-0-migration.md

BEGIN;

-- =============================================================================
-- bio_link_pages
-- =============================================================================

DROP POLICY IF EXISTS "Users can view own bio pages" ON bio_link_pages;
DROP POLICY IF EXISTS "Users can create bio pages" ON bio_link_pages;
DROP POLICY IF EXISTS "Users can update own bio pages" ON bio_link_pages;
DROP POLICY IF EXISTS "Users can delete own bio pages" ON bio_link_pages;

CREATE POLICY "Users can view own bio pages"
  ON bio_link_pages FOR SELECT
  TO authenticated
  USING (is_member_of_org(org_id));

CREATE POLICY "Users can create bio pages"
  ON bio_link_pages FOR INSERT
  TO authenticated
  WITH CHECK (is_member_of_org(org_id));

CREATE POLICY "Users can update own bio pages"
  ON bio_link_pages FOR UPDATE
  TO authenticated
  USING (is_member_of_org(org_id))
  WITH CHECK (is_member_of_org(org_id));

CREATE POLICY "Users can delete own bio pages"
  ON bio_link_pages FOR DELETE
  TO authenticated
  USING (is_member_of_org(org_id));

-- =============================================================================
-- bio_link_items (child of bio_link_pages via page_id)
-- =============================================================================

DROP POLICY IF EXISTS "Users can view own bio items" ON bio_link_items;
DROP POLICY IF EXISTS "Users can create bio items" ON bio_link_items;
DROP POLICY IF EXISTS "Users can update own bio items" ON bio_link_items;
DROP POLICY IF EXISTS "Users can delete own bio items" ON bio_link_items;

CREATE POLICY "Users can view own bio items"
  ON bio_link_items FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM bio_link_pages
      WHERE bio_link_pages.id = bio_link_items.page_id
        AND is_member_of_org(bio_link_pages.org_id)
    )
  );

CREATE POLICY "Users can create bio items"
  ON bio_link_items FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM bio_link_pages
      WHERE bio_link_pages.id = bio_link_items.page_id
        AND is_member_of_org(bio_link_pages.org_id)
    )
  );

CREATE POLICY "Users can update own bio items"
  ON bio_link_items FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM bio_link_pages
      WHERE bio_link_pages.id = bio_link_items.page_id
        AND is_member_of_org(bio_link_pages.org_id)
    )
  );

CREATE POLICY "Users can delete own bio items"
  ON bio_link_items FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM bio_link_pages
      WHERE bio_link_pages.id = bio_link_items.page_id
        AND is_member_of_org(bio_link_pages.org_id)
    )
  );

-- =============================================================================
-- bio_link_view_events (child of bio_link_pages via page_id)
-- =============================================================================

DROP POLICY IF EXISTS "Users can view own bio view events" ON bio_link_view_events;

CREATE POLICY "Users can view own bio view events"
  ON bio_link_view_events FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM bio_link_pages
      WHERE bio_link_pages.id = bio_link_view_events.page_id
        AND is_member_of_org(bio_link_pages.org_id)
    )
  );

-- =============================================================================
-- bio_link_click_events (child of bio_link_pages via page_id)
-- =============================================================================

DROP POLICY IF EXISTS "Users can view own bio click events" ON bio_link_click_events;

CREATE POLICY "Users can view own bio click events"
  ON bio_link_click_events FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM bio_link_pages
      WHERE bio_link_pages.id = bio_link_click_events.page_id
        AND is_member_of_org(bio_link_pages.org_id)
    )
  );

-- =============================================================================
-- bio_link_audit_log (child of bio_link_pages via page_id)
-- =============================================================================

DROP POLICY IF EXISTS "Users can view own bio audit logs" ON bio_link_audit_log;

CREATE POLICY "Users can view own bio audit logs"
  ON bio_link_audit_log FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM bio_link_pages
      WHERE bio_link_pages.id = bio_link_audit_log.page_id
        AND is_member_of_org(bio_link_pages.org_id)
    )
  );

-- =============================================================================
-- bio_blocks (child of bio_link_pages via page_id)
-- =============================================================================

DROP POLICY IF EXISTS "Users can view own bio blocks" ON bio_blocks;
DROP POLICY IF EXISTS "Users can create bio blocks" ON bio_blocks;
DROP POLICY IF EXISTS "Users can update own bio blocks" ON bio_blocks;
DROP POLICY IF EXISTS "Users can delete own bio blocks" ON bio_blocks;

CREATE POLICY "Users can view own bio blocks"
  ON bio_blocks FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM bio_link_pages
      WHERE bio_link_pages.id = bio_blocks.page_id
        AND is_member_of_org(bio_link_pages.org_id)
    )
  );

CREATE POLICY "Users can create bio blocks"
  ON bio_blocks FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM bio_link_pages
      WHERE bio_link_pages.id = bio_blocks.page_id
        AND is_member_of_org(bio_link_pages.org_id)
    )
  );

CREATE POLICY "Users can update own bio blocks"
  ON bio_blocks FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM bio_link_pages
      WHERE bio_link_pages.id = bio_blocks.page_id
        AND is_member_of_org(bio_link_pages.org_id)
    )
  );

CREATE POLICY "Users can delete own bio blocks"
  ON bio_blocks FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM bio_link_pages
      WHERE bio_link_pages.id = bio_blocks.page_id
        AND is_member_of_org(bio_link_pages.org_id)
    )
  );

-- =============================================================================
-- bio_block_click_events (child of bio_link_pages via page_id)
-- =============================================================================

DROP POLICY IF EXISTS "Users can view own bio block click events" ON bio_block_click_events;

CREATE POLICY "Users can view own bio block click events"
  ON bio_block_click_events FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM bio_link_pages
      WHERE bio_link_pages.id = bio_block_click_events.page_id
        AND is_member_of_org(bio_link_pages.org_id)
    )
  );

-- =============================================================================
-- bio_form_submissions (child of bio_link_pages via page_id)
-- =============================================================================

DROP POLICY IF EXISTS "bio_form_submissions_select_own" ON bio_form_submissions;
DROP POLICY IF EXISTS "bio_form_submissions_update_own" ON bio_form_submissions;
DROP POLICY IF EXISTS "bio_form_submissions_delete_own" ON bio_form_submissions;

CREATE POLICY "bio_form_submissions_select_own"
  ON bio_form_submissions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM bio_link_pages
      WHERE bio_link_pages.id = bio_form_submissions.page_id
        AND is_member_of_org(bio_link_pages.org_id)
    )
  );

CREATE POLICY "bio_form_submissions_update_own"
  ON bio_form_submissions FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM bio_link_pages
      WHERE bio_link_pages.id = bio_form_submissions.page_id
        AND is_member_of_org(bio_link_pages.org_id)
    )
  );

CREATE POLICY "bio_form_submissions_delete_own"
  ON bio_form_submissions FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM bio_link_pages
      WHERE bio_link_pages.id = bio_form_submissions.page_id
        AND is_member_of_org(bio_link_pages.org_id)
    )
  );

COMMIT;
