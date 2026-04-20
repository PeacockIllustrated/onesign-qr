# Phase 0.C.2 — Data-Table RLS Rewrite + NOT NULL Tightening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the 31 owner-scoped RLS policies across all data tables (bio_* and qr_* families) with org-scoped equivalents using the `is_member_of_org(org_id)` helper shipped in Phase 0.C.1, then tighten `org_id` to `NOT NULL` on `bio_link_pages` and `qr_codes`. After this phase, data access is governed by organisation membership — not by direct ownership — which activates the full multi-user team experience unlocked by invites (shipping later).

**Architecture:** Three sequential SQL migrations, each applied independently during its own window with snapshot/diff verification between applies. Child-table policies (bio_link_items, qr_styles, etc.) use `EXISTS` subqueries through their parent table (bio_link_pages, qr_codes), replacing the old `parent.owner_id = auth.uid()` with `is_member_of_org(parent.org_id)`. Redirect handler at `/r/[slug]` is unaffected because it uses the admin Supabase client which bypasses RLS entirely.

**Tech Stack:** Supabase (PostgreSQL), plain SQL migrations. No application code changes (the API routes already populate `org_id` on inserts — Phase 0.B).

**Prerequisites (must be true before starting):**
- Phase 0.C.1 (migration 00018) applied in production, verified. RLS is enabled on all four organisation tables, helper functions (`is_platform_admin`, `is_member_of_org`, `role_in_org`) exist, at least one platform admin row exists.
- All existing rows on `bio_link_pages` and `qr_codes` have `org_id` populated (Phase 0.B invariant).

**Scope boundary:**
- ✅ **In scope:** Migration 00019 (qr_* tables), Migration 00020 (bio_* tables), Migration 00021 (NOT NULL), runbook sections with per-migration rollback, manual operator tasks.
- ❌ **Out of scope:** Invite flow (separate plan). Super-admin dashboard (separate plan). Any application code changes beyond the storage-bucket policy update. `UNIQUE(owner_id)` drop on bio_link_pages — already handled by `00015_multi_bio_pages.sql`.

**Reference spec:** `docs/superpowers/specs/2026-04-17-onesign-lynx-h1-h2-design.md` — Section 6 (Migration protocol, Phase 0.C subsection).

---

## File structure

**Created:**
- `supabase/migrations/00019_rewrite_rls_on_qr_tables.sql` — drops + recreates policies on qr_codes, qr_styles, qr_assets, qr_scan_events, qr_audit_log (12 policies total).
- `supabase/migrations/00020_rewrite_rls_on_bio_tables.sql` — drops + recreates policies on bio_link_pages, bio_link_items, bio_link_view_events, bio_link_click_events, bio_link_audit_log, bio_blocks, bio_block_click_events, bio_form_submissions (19 policies total).
- `supabase/migrations/00021_tighten_org_id_not_null.sql` — adds NOT NULL constraint to `bio_link_pages.org_id` and `qr_codes.org_id`.

**Modified:**
- `docs/superpowers/runbooks/phase-0-migration.md` — append sections for 0.C.2.a, 0.C.2.b, 0.C.2.c with pre-flight, execution, verification queries, and rollback SQL for each.

**Not touched:**
- Any public-read policy (they don't check ownership, stay unchanged).
- `00003_qr_code_storage.sql`'s `qr_assets_select_own` storage policy — it references the old `qr_code.codes` schema which was migrated to `public.qr_codes` in 00004 but the policy may be stale. Investigating / fixing storage policies is explicitly OUT OF SCOPE for 0.C.2 to keep this plan focused. Flag as a follow-up.
- Any application code — inserts already populate `org_id` (Phase 0.B).

---

## Translation pattern

Every policy follows one of two mechanical translations:

### Direct ownership (applies to root tables: bio_link_pages, qr_codes)

Before:
```sql
USING (owner_id = auth.uid())
-- or
WITH CHECK (owner_id = auth.uid())
```

After:
```sql
USING (is_member_of_org(org_id))
-- or
WITH CHECK (is_member_of_org(org_id))
```

### EXISTS via parent (applies to child tables: qr_styles, qr_assets, qr_scan_events, qr_audit_log, bio_link_items, bio_link_view_events, bio_link_click_events, bio_link_audit_log, bio_blocks, bio_block_click_events, bio_form_submissions)

Before:
```sql
USING (
  EXISTS (
    SELECT 1 FROM <parent_table>
    WHERE <parent_table>.id = <child_table>.<join_col>
      AND <parent_table>.owner_id = auth.uid()
  )
)
```

After:
```sql
USING (
  EXISTS (
    SELECT 1 FROM <parent_table>
    WHERE <parent_table>.id = <child_table>.<join_col>
      AND is_member_of_org(<parent_table>.org_id)
  )
)
```

Each migration's SQL is spelled out verbatim below — no guessing required.

---

## Part 1 — Migration 00019 (qr_* tables RLS rewrite)

### Task 1: Write migration 00019

**Files:**
- Create: `supabase/migrations/00019_rewrite_rls_on_qr_tables.sql`

All 12 qr_* policies dropped and recreated with org-scoped equivalents. Public-read policies are preserved (not dropped, not re-created — left alone).

- [ ] **Step 1: Create the migration file**

Create `supabase/migrations/00019_rewrite_rls_on_qr_tables.sql` with this EXACT content:

```sql
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
```

- [ ] **Step 2: Run schema-lint**

Run: `npm run migration:schema-lint`
Expected: `Migration schema-lint passed.`

- [ ] **Step 3: Run the test suite**

Run: `npm run test:run`
Expected: 157 tests pass.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/00019_rewrite_rls_on_qr_tables.sql
git commit -m "feat: migration 00019 rewrites RLS on qr_* tables (org-scoped)"
```

---

## Part 2 — Migration 00020 (bio_* tables RLS rewrite)

### Task 2: Write migration 00020

**Files:**
- Create: `supabase/migrations/00020_rewrite_rls_on_bio_tables.sql`

All 19 bio_* policies dropped and recreated with org-scoped equivalents. Public-read policies preserved.

- [ ] **Step 1: Create the migration file**

Create `supabase/migrations/00020_rewrite_rls_on_bio_tables.sql` with this EXACT content:

```sql
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
```

- [ ] **Step 2: Run schema-lint**

Run: `npm run migration:schema-lint`
Expected: `Migration schema-lint passed.`

- [ ] **Step 3: Run the test suite**

Run: `npm run test:run`
Expected: 157 tests pass.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/00020_rewrite_rls_on_bio_tables.sql
git commit -m "feat: migration 00020 rewrites RLS on bio_* tables (org-scoped)"
```

---

## Part 3 — Migration 00021 (NOT NULL tightening on org_id)

### Task 3: Write migration 00021

**Files:**
- Create: `supabase/migrations/00021_tighten_org_id_not_null.sql`

Adds `NOT NULL` to `bio_link_pages.org_id` and `qr_codes.org_id`. This is the final foundation invariant lock-in. Phase 0.B + 0.B's auto-create trigger guarantee every row has a non-null `org_id`; Phase 0.C.2.a/b ensure all new inserts go through policies that require `is_member_of_org(org_id)` (which fails on NULL). Tightening the schema now makes future bugs — code paths that forget to set `org_id` — loud instead of silent.

Pre-flight query in the runbook confirms zero NULL rows before the ALTER runs.

- [ ] **Step 1: Create the migration file**

Create `supabase/migrations/00021_tighten_org_id_not_null.sql`:

```sql
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
```

- [ ] **Step 2: Run schema-lint**

Run: `npm run migration:schema-lint`
Expected: `Migration schema-lint passed.`

The schema-lint protects the 5 redirect-critical columns on `qr_codes` (slug, destination_url, is_active, analytics_enabled, mode). `org_id` is not one of them, so the ALTER passes.

- [ ] **Step 3: Run the test suite**

Run: `npm run test:run`
Expected: 157 tests pass.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/00021_tighten_org_id_not_null.sql
git commit -m "feat: migration 00021 tightens org_id to NOT NULL on bio_link_pages and qr_codes"
```

---

## Part 4 — Runbook updates

### Task 4: Append Phase 0.C.2 sections to the runbook

**Files:**
- Modify: `docs/superpowers/runbooks/phase-0-migration.md`

Three sub-sections (0.C.2.a, 0.C.2.b, 0.C.2.c) — one per migration — each with pre-flight, execution, verification, rollback, and completion log template.

- [ ] **Step 1: Read the current runbook**

Confirm the file ends with the Phase 0.C.1 completion log.

- [ ] **Step 2: Append the three Phase 0.C.2 sections**

Append this EXACT content at the end of the file:

```markdown

---

# Phase 0.C.2 — Data-Table RLS Rewrite + NOT NULL Tightening

Phase 0.C.2 is the highest-risk phase of the foundation work. It rewrites
RLS on every data table (bio_* and qr_* families) from owner-scoped to
org-scoped, and then tightens `org_id` to `NOT NULL`. Three separate
migrations, each with its own window.

## Phase 0.C.2.a — qr_* tables (migration 00019)

### Pre-flight checklist

1. `npm run test:run` — all tests pass (157).
2. `npm run type-check` — clean.
3. `npm run migration:schema-lint` — passes.
4. Phase 0.C.1 (migration 00018) confirmed live and working in production.
5. Full DB backup taken today. `BACKUP_ID: _______________`
6. A second engineer has read the migration SQL.
7. Rollback SQL pasted into a second terminal.

### Execution

1. Pre-migration snapshots:

   ```
   npm run migration:snapshot -- /tmp/phase-0c2a-slug-before.json
   tsx scripts/migration-safety/row-count-snapshot.ts /tmp/phase-0c2a-rows-before.json
   ```

2. Apply `supabase/migrations/00019_rewrite_rls_on_qr_tables.sql` in the
   Supabase SQL editor.

3. If any error: STOP. Run the 0.C.2.a rollback SQL below.

4. Post-migration snapshots + diffs:

   ```
   npm run migration:snapshot -- /tmp/phase-0c2a-slug-after.json
   tsx scripts/migration-safety/row-count-snapshot.ts /tmp/phase-0c2a-rows-after.json
   npm run migration:diff -- /tmp/phase-0c2a-slug-before.json /tmp/phase-0c2a-slug-after.json
   tsx scripts/migration-safety/row-count-diff.ts /tmp/phase-0c2a-rows-before.json /tmp/phase-0c2a-rows-after.json
   ```

   Expected: zero deltas on both. This is a policy-only migration — no data
   changes.

5. Verify the new policies exist:

   ```sql
   SELECT tablename, policyname FROM pg_policies
   WHERE tablename IN ('qr_codes', 'qr_styles', 'qr_assets', 'qr_scan_events', 'qr_audit_log')
   ORDER BY tablename, policyname;
   ```

   Expected tables and counts:
   - qr_codes: 4 user policies + 1 public = 5
   - qr_styles: 3
   - qr_assets: 3
   - qr_scan_events: 1
   - qr_audit_log: 1

6. Functional smoke test:

   - Log in as a normal user → visit `/app` → the QR codes list must show
     your QR codes exactly as before.
   - Click into one QR code → detail page loads with styling, analytics.
   - Hit a known-good production QR URL in a browser (anonymous) → 307
     redirect still works.
   - Create a new QR code from the UI → it appears in the list.

7. Append a completion note below.

### Rollback (Phase 0.C.2.a)

Restores the owner-scoped policies. Safe because `owner_id` column is still
populated on every row.

```sql
BEGIN;

-- qr_codes
DROP POLICY IF EXISTS "Users can view own QR codes" ON qr_codes;
DROP POLICY IF EXISTS "Users can create QR codes" ON qr_codes;
DROP POLICY IF EXISTS "Users can update own QR codes" ON qr_codes;
DROP POLICY IF EXISTS "Users can delete own QR codes" ON qr_codes;

CREATE POLICY "Users can view own QR codes"
  ON qr_codes FOR SELECT TO authenticated
  USING (owner_id = auth.uid());
CREATE POLICY "Users can create QR codes"
  ON qr_codes FOR INSERT TO authenticated
  WITH CHECK (owner_id = auth.uid());
CREATE POLICY "Users can update own QR codes"
  ON qr_codes FOR UPDATE TO authenticated
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());
CREATE POLICY "Users can delete own QR codes"
  ON qr_codes FOR DELETE TO authenticated
  USING (owner_id = auth.uid());

-- qr_styles
DROP POLICY IF EXISTS "Users can view own QR styles" ON qr_styles;
DROP POLICY IF EXISTS "Users can insert own QR styles" ON qr_styles;
DROP POLICY IF EXISTS "Users can update own QR styles" ON qr_styles;

CREATE POLICY "Users can view own QR styles"
  ON qr_styles FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM qr_codes
    WHERE qr_codes.id = qr_styles.qr_id AND qr_codes.owner_id = auth.uid()
  ));
CREATE POLICY "Users can insert own QR styles"
  ON qr_styles FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM qr_codes
    WHERE qr_codes.id = qr_styles.qr_id AND qr_codes.owner_id = auth.uid()
  ));
CREATE POLICY "Users can update own QR styles"
  ON qr_styles FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM qr_codes
    WHERE qr_codes.id = qr_styles.qr_id AND qr_codes.owner_id = auth.uid()
  ));

-- qr_assets
DROP POLICY IF EXISTS "Users can view own QR assets" ON qr_assets;
DROP POLICY IF EXISTS "Users can insert own QR assets" ON qr_assets;
DROP POLICY IF EXISTS "Users can delete own QR assets" ON qr_assets;

CREATE POLICY "Users can view own QR assets"
  ON qr_assets FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM qr_codes
    WHERE qr_codes.id = qr_assets.qr_id AND qr_codes.owner_id = auth.uid()
  ));
CREATE POLICY "Users can insert own QR assets"
  ON qr_assets FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM qr_codes
    WHERE qr_codes.id = qr_assets.qr_id AND qr_codes.owner_id = auth.uid()
  ));
CREATE POLICY "Users can delete own QR assets"
  ON qr_assets FOR DELETE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM qr_codes
    WHERE qr_codes.id = qr_assets.qr_id AND qr_codes.owner_id = auth.uid()
  ));

-- qr_scan_events
DROP POLICY IF EXISTS "Users can view own scan events" ON qr_scan_events;
CREATE POLICY "Users can view own scan events"
  ON qr_scan_events FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM qr_codes
    WHERE qr_codes.id = qr_scan_events.qr_id AND qr_codes.owner_id = auth.uid()
  ));

-- qr_audit_log
DROP POLICY IF EXISTS "Users can view own audit logs" ON qr_audit_log;
CREATE POLICY "Users can view own audit logs"
  ON qr_audit_log FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM qr_codes
    WHERE qr_codes.id = qr_audit_log.qr_id AND qr_codes.owner_id = auth.uid()
  ));

COMMIT;
```

### Phase 0.C.2.a Completion log

<!-- Append an entry per run. -->

### Production, YYYY-MM-DD HH:MM TZ
- Backup ID:
- Policies verified (qr_*):
- Smoke test:
- QR redirect spot check:
- Anomalies:
- Signed off by:

## Phase 0.C.2.b — bio_* tables (migration 00020)

### Pre-flight checklist

1. Phase 0.C.2.a (00019) has been live in production for at least 1 hour
   with no customer reports of broken access. Wait longer if in doubt —
   this is not a race.
2. CI gates green (same as 0.C.2.a).
3. Full DB backup today. `BACKUP_ID: _______________`
4. Rollback SQL ready.

### Execution

1. Pre-migration snapshots:

   ```
   npm run migration:snapshot -- /tmp/phase-0c2b-slug-before.json
   tsx scripts/migration-safety/row-count-snapshot.ts /tmp/phase-0c2b-rows-before.json
   ```

2. Apply `supabase/migrations/00020_rewrite_rls_on_bio_tables.sql`.

3. If any error: STOP. Run the 0.C.2.b rollback SQL below.

4. Post-migration diffs — same commands as 0.C.2.a but with 0c2b paths.

5. Verify policies:

   ```sql
   SELECT tablename, policyname FROM pg_policies
   WHERE tablename IN (
     'bio_link_pages', 'bio_link_items', 'bio_link_view_events',
     'bio_link_click_events', 'bio_link_audit_log', 'bio_blocks',
     'bio_block_click_events', 'bio_form_submissions'
   )
   ORDER BY tablename, policyname;
   ```

   Expected counts:
   - bio_link_pages: 4 user + 1 public = 5
   - bio_link_items: 4 user + 1 public = 5
   - bio_link_view_events: 1
   - bio_link_click_events: 1
   - bio_link_audit_log: 1
   - bio_blocks: 4 user + 1 public = 5
   - bio_block_click_events: 1
   - bio_form_submissions: 3

6. Functional smoke test:

   - Log in as normal user → `/app/bio` → page list shows your pages.
   - Click into a bio page → edit it → save a change → confirm persisted.
   - Visit a public bio page URL (`/p/<slug>`) in an incognito window → it
     renders correctly (public-read policies unchanged).
   - Submit a contact form on a public bio page → owner should receive
     email + see submission in inbox.

7. Append a completion note below.

### Rollback (Phase 0.C.2.b)

Restores the owner-scoped policies on bio_* tables. Safe because `owner_id`
still populated.

```sql
BEGIN;

-- bio_link_pages
DROP POLICY IF EXISTS "Users can view own bio pages" ON bio_link_pages;
DROP POLICY IF EXISTS "Users can create bio pages" ON bio_link_pages;
DROP POLICY IF EXISTS "Users can update own bio pages" ON bio_link_pages;
DROP POLICY IF EXISTS "Users can delete own bio pages" ON bio_link_pages;

CREATE POLICY "Users can view own bio pages"
  ON bio_link_pages FOR SELECT TO authenticated
  USING (owner_id = auth.uid());
CREATE POLICY "Users can create bio pages"
  ON bio_link_pages FOR INSERT TO authenticated
  WITH CHECK (owner_id = auth.uid());
CREATE POLICY "Users can update own bio pages"
  ON bio_link_pages FOR UPDATE TO authenticated
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());
CREATE POLICY "Users can delete own bio pages"
  ON bio_link_pages FOR DELETE TO authenticated
  USING (owner_id = auth.uid());

-- bio_link_items
DROP POLICY IF EXISTS "Users can view own bio items" ON bio_link_items;
DROP POLICY IF EXISTS "Users can create bio items" ON bio_link_items;
DROP POLICY IF EXISTS "Users can update own bio items" ON bio_link_items;
DROP POLICY IF EXISTS "Users can delete own bio items" ON bio_link_items;

CREATE POLICY "Users can view own bio items"
  ON bio_link_items FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM bio_link_pages
    WHERE bio_link_pages.id = bio_link_items.page_id
      AND bio_link_pages.owner_id = auth.uid()
  ));
CREATE POLICY "Users can create bio items"
  ON bio_link_items FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM bio_link_pages
    WHERE bio_link_pages.id = bio_link_items.page_id
      AND bio_link_pages.owner_id = auth.uid()
  ));
CREATE POLICY "Users can update own bio items"
  ON bio_link_items FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM bio_link_pages
    WHERE bio_link_pages.id = bio_link_items.page_id
      AND bio_link_pages.owner_id = auth.uid()
  ));
CREATE POLICY "Users can delete own bio items"
  ON bio_link_items FOR DELETE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM bio_link_pages
    WHERE bio_link_pages.id = bio_link_items.page_id
      AND bio_link_pages.owner_id = auth.uid()
  ));

-- bio_link_view_events
DROP POLICY IF EXISTS "Users can view own bio view events" ON bio_link_view_events;
CREATE POLICY "Users can view own bio view events"
  ON bio_link_view_events FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM bio_link_pages
    WHERE bio_link_pages.id = bio_link_view_events.page_id
      AND bio_link_pages.owner_id = auth.uid()
  ));

-- bio_link_click_events
DROP POLICY IF EXISTS "Users can view own bio click events" ON bio_link_click_events;
CREATE POLICY "Users can view own bio click events"
  ON bio_link_click_events FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM bio_link_pages
    WHERE bio_link_pages.id = bio_link_click_events.page_id
      AND bio_link_pages.owner_id = auth.uid()
  ));

-- bio_link_audit_log
DROP POLICY IF EXISTS "Users can view own bio audit logs" ON bio_link_audit_log;
CREATE POLICY "Users can view own bio audit logs"
  ON bio_link_audit_log FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM bio_link_pages
    WHERE bio_link_pages.id = bio_link_audit_log.page_id
      AND bio_link_pages.owner_id = auth.uid()
  ));

-- bio_blocks
DROP POLICY IF EXISTS "Users can view own bio blocks" ON bio_blocks;
DROP POLICY IF EXISTS "Users can create bio blocks" ON bio_blocks;
DROP POLICY IF EXISTS "Users can update own bio blocks" ON bio_blocks;
DROP POLICY IF EXISTS "Users can delete own bio blocks" ON bio_blocks;

CREATE POLICY "Users can view own bio blocks"
  ON bio_blocks FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM bio_link_pages
    WHERE bio_link_pages.id = bio_blocks.page_id
      AND bio_link_pages.owner_id = auth.uid()
  ));
CREATE POLICY "Users can create bio blocks"
  ON bio_blocks FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM bio_link_pages
    WHERE bio_link_pages.id = bio_blocks.page_id
      AND bio_link_pages.owner_id = auth.uid()
  ));
CREATE POLICY "Users can update own bio blocks"
  ON bio_blocks FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM bio_link_pages
    WHERE bio_link_pages.id = bio_blocks.page_id
      AND bio_link_pages.owner_id = auth.uid()
  ));
CREATE POLICY "Users can delete own bio blocks"
  ON bio_blocks FOR DELETE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM bio_link_pages
    WHERE bio_link_pages.id = bio_blocks.page_id
      AND bio_link_pages.owner_id = auth.uid()
  ));

-- bio_block_click_events
DROP POLICY IF EXISTS "Users can view own bio block click events" ON bio_block_click_events;
CREATE POLICY "Users can view own bio block click events"
  ON bio_block_click_events FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM bio_link_pages
    WHERE bio_link_pages.id = bio_block_click_events.page_id
      AND bio_link_pages.owner_id = auth.uid()
  ));

-- bio_form_submissions
DROP POLICY IF EXISTS "bio_form_submissions_select_own" ON bio_form_submissions;
DROP POLICY IF EXISTS "bio_form_submissions_update_own" ON bio_form_submissions;
DROP POLICY IF EXISTS "bio_form_submissions_delete_own" ON bio_form_submissions;

CREATE POLICY "bio_form_submissions_select_own"
  ON bio_form_submissions FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM bio_link_pages
    WHERE bio_link_pages.id = bio_form_submissions.page_id
      AND bio_link_pages.owner_id = auth.uid()
  ));
CREATE POLICY "bio_form_submissions_update_own"
  ON bio_form_submissions FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM bio_link_pages
    WHERE bio_link_pages.id = bio_form_submissions.page_id
      AND bio_link_pages.owner_id = auth.uid()
  ));
CREATE POLICY "bio_form_submissions_delete_own"
  ON bio_form_submissions FOR DELETE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM bio_link_pages
    WHERE bio_link_pages.id = bio_form_submissions.page_id
      AND bio_link_pages.owner_id = auth.uid()
  ));

COMMIT;
```

### Phase 0.C.2.b Completion log

### Production, YYYY-MM-DD HH:MM TZ
- Backup ID:
- Policies verified (bio_*):
- Smoke test:
- Public bio page spot check:
- Anomalies:
- Signed off by:

## Phase 0.C.2.c — NOT NULL tightening (migration 00021)

### Pre-flight checklist

1. Phase 0.C.2.b (00020) has been live in production for at least 1 hour
   with no customer reports.
2. CI gates green.
3. **Pre-flight invariant queries** — run these and confirm both return 0:

   ```sql
   SELECT COUNT(*) FROM bio_link_pages WHERE org_id IS NULL;  -- expect 0
   SELECT COUNT(*) FROM qr_codes WHERE org_id IS NULL;        -- expect 0
   ```

   If either returns non-zero, **DO NOT proceed**. Fix the NULL rows first
   (either backfill them manually or delete them if they're genuinely
   orphaned).

4. Full DB backup today. `BACKUP_ID: _______________`

### Execution

1. Pre-migration snapshots (same commands as above with 0c2c paths).
2. Apply `supabase/migrations/00021_tighten_org_id_not_null.sql`.
3. If the ALTER fails, it means the pre-flight query was wrong or data
   changed between the check and the ALTER. Investigate.
4. Post-migration snapshots + diffs (expect zero deltas — no data changes).
5. Verify the NOT NULL constraint landed:

   ```sql
   SELECT column_name, is_nullable FROM information_schema.columns
   WHERE table_name IN ('bio_link_pages', 'qr_codes')
     AND column_name = 'org_id';
   -- Both rows should show is_nullable = 'NO'
   ```

6. Smoke test:
   - Create a new bio page from the UI → still works.
   - Create a new QR code from the UI → still works.
   - Hit a production QR → still 307-redirects.

7. Append a completion note below.

### Rollback (Phase 0.C.2.c)

Trivial — remove the NOT NULL constraint.

```sql
BEGIN;

ALTER TABLE bio_link_pages ALTER COLUMN org_id DROP NOT NULL;
ALTER TABLE qr_codes ALTER COLUMN org_id DROP NOT NULL;

COMMIT;
```

### Phase 0.C.2.c Completion log

### Production, YYYY-MM-DD HH:MM TZ
- Backup ID:
- NOT NULL verified:
- Smoke test:
- Anomalies:
- Signed off by:
```

- [ ] **Step 3: Commit**

```bash
git add docs/superpowers/runbooks/phase-0-migration.md
git commit -m "docs: add Phase 0.C.2 sections to migration runbook"
```

---

## Part 5 — Manual operator tasks

### Task 5 (MANUAL): Apply migration 00019 to production

Operator-only. **Do not execute until** all previous tasks merged to main and Phase 0.C.1 stable for at least 1 hour.

- [ ] Work through the Phase 0.C.2.a execution checklist in the runbook.
- [ ] Wait at least 1 hour before starting Task 6 to let any customer-facing issues surface.
- [ ] Append a Production entry to the Phase 0.C.2.a completion log.
- [ ] Commit the runbook update.

### Task 6 (MANUAL): Apply migration 00020 to production

Operator-only. **Do not execute until** Task 5 stable for at least 1 hour.

- [ ] Work through the Phase 0.C.2.b execution checklist.
- [ ] Wait at least 1 hour before starting Task 7.
- [ ] Append a Production entry.
- [ ] Commit.

### Task 7 (MANUAL): Apply migration 00021 to production

Operator-only. **Do not execute until** Task 6 stable for at least 1 hour AND the pre-flight invariant queries return 0.

- [ ] Run pre-flight queries.
- [ ] Work through the Phase 0.C.2.c execution checklist.
- [ ] Append a Production entry.
- [ ] Commit.

---

## Completion criteria

Phase 0.C.2 is complete when:

1. Migrations 00019, 00020, 00021 all applied to production.
2. All owner-scoped policies on data tables replaced with org-scoped equivalents.
3. `bio_link_pages.org_id` and `qr_codes.org_id` are `NOT NULL` in production.
4. 157 tests still pass on main.
5. Known-good production QRs 307-redirect.
6. Functional smoke tests on both authenticated dashboard and public bio pages pass.
7. Completion log entries filled in for all three sub-phases.

**At this point, the Phase 0 foundation is complete.** Invite flow, super-admin dashboard, shopfront, and all H1/H2 features can now rely on org-scoped security without special-casing.

## Known follow-ups (deliberately out of scope)

- **Storage bucket policy for `qr-assets`** (`00003_qr_code_storage.sql:39`): references the old `qr_code.codes` schema which was migrated to `public.qr_codes` in 00004. The policy is likely stale or a no-op. Investigate and rewrite (or remove) in a dedicated storage-policies cleanup task. Not a security issue because the policy allows access only via EXISTS to a non-existent schema — so nobody has access, which is conservative.
- **`owner_id` columns can be dropped** at some point after Phase 0.C.2 stabilises. Not required for features to work — the column is orphaned but harmless. Defer to a dedicated cleanup migration if/when it's needed for schema tidiness.
