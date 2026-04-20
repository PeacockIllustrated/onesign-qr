# Phase 0 Migration Runbook

This runbook covers the safe execution of Phase 0 migrations (introducing the
B2B organisation model). It is the operator's source of truth during each
migration window. Read top-to-bottom before starting.

## Who owns this document

- **Primary operator:** person running the migration.
- **Reviewer:** a second engineer who has read the runbook before the window.
- **Escalation:** rollback authority rests with the primary operator; they do
  not need further approval to execute a rollback mid-migration.

## The invariant

Printed production QR codes must keep resolving to their current
`destination_url` at every moment during migration. The `/r/{slug}` handler
bypasses RLS via the admin Supabase client, so RLS changes are safe. Schema
changes are dangerous only if they touch the columns `slug`,
`destination_url`, `is_active`, `analytics_enabled`, `mode` on `qr_codes` —
and the CI schema-lint check blocks PRs that do this.

## Pre-flight checklist (Phase 0.A)

### CI gates (must be green on the branch being deployed)

1. `npm run test:run` — all unit tests pass.
2. `npm run type-check` — TypeScript compiles without errors.
3. `npm run migration:schema-lint` — migration directory passes schema-lint.
4. `npm run lint` — linter passes.

All items must be checked before the migration is applied to production.

- [ ] Supabase PITR is active on the project (Supabase Dashboard →
      Database → Backups). Confirm retention ≥7 days.
- [ ] A full database backup has been taken **today**. Record the
      backup identifier here before proceeding:
      `BACKUP_ID: _______________`
- [ ] The migration has been applied to the staging Supabase project
      end-to-end. `row-count-diff` showed zero deltas on staging.
      `slug-integrity-diff` showed zero deltas on staging.
- [ ] The redirect handler regression tests pass on the current branch:
      `npm run test:run -- src/__tests__/app/r/slug-route.test.ts`
- [ ] The schema-lint check passes on the current branch:
      `npm run migration:schema-lint`
- [ ] A reviewer who is not the primary operator has read this runbook
      and the migration SQL.
- [ ] The migration window is scheduled during the lowest-traffic window
      (default: Sunday 03:00 BST). The operator is rested and focused.
- [ ] Customer-facing communication (if any) has gone out at least
      48 hours in advance.
- [ ] The rollback command below is pasted into a second terminal, ready
      to execute, and has been mentally rehearsed.

## Execution (Phase 0.A)

Phase 0.A is purely additive. The redirect handler is unaffected by
definition. The risk is only to the migration itself succeeding. Steps:

1. Open two terminals. Terminal A: admin console / Supabase SQL editor.
   Terminal B: a shell with production env vars loaded.

2. In Terminal B, capture pre-migration snapshots:

   ```
   npm run migration:snapshot -- /tmp/phase-0a-slug-before.json
   tsx scripts/migration-safety/row-count-snapshot.ts /tmp/phase-0a-rows-before.json
   ```

   Record the row counts in your notes.

3. In Terminal A, open `supabase/migrations/00015_organizations_and_org_id_columns.sql`
   and paste the contents into the Supabase SQL editor. Execute.

4. If the SQL editor reports any error: **STOP. DO NOT CONTINUE. DO NOT
   RETRY.** Jump to the Rollback section below and execute it verbatim.
   Rollback is trivial for Phase 0.A because nothing existing was changed.

5. In Terminal B, capture post-migration snapshots:

   ```
   npm run migration:snapshot -- /tmp/phase-0a-slug-after.json
   tsx scripts/migration-safety/row-count-snapshot.ts /tmp/phase-0a-rows-after.json
   ```

6. Run the diffs. Both must pass cleanly:

   ```
   npm run migration:diff -- /tmp/phase-0a-slug-before.json /tmp/phase-0a-slug-after.json
   tsx scripts/migration-safety/row-count-diff.ts /tmp/phase-0a-rows-before.json /tmp/phase-0a-rows-after.json
   ```

   Expected: both exit 0 with no deltas.

7. Verify new tables exist and are empty:

   ```sql
   SELECT COUNT(*) FROM organizations;           -- expect 0
   SELECT COUNT(*) FROM organization_members;    -- expect 0
   SELECT COUNT(*) FROM organization_invites;    -- expect 0
   SELECT COUNT(*) FROM platform_admins;         -- expect 0
   ```

8. Verify the new `org_id` columns exist and are all NULL (no unintended
   backfill happened):

   ```sql
   SELECT COUNT(*) FILTER (WHERE org_id IS NOT NULL) FROM bio_link_pages;
   -- expect 0
   SELECT COUNT(*) FILTER (WHERE org_id IS NOT NULL) FROM qr_codes;
   -- expect 0
   ```

9. Hit a known-good production QR redirect manually to confirm it still
   resolves to the correct destination. Log the HTTP status and Location
   header.

10. Write a short completion note in this runbook (append below) with:
    timestamp, backup ID, row count deltas, any anomalies observed.

## Rollback (Phase 0.A)

Phase 0.A rollback is clean because everything added is new. Execute the
following SQL in the Supabase SQL editor:

```sql
BEGIN;

ALTER TABLE IF EXISTS qr_codes DROP COLUMN IF EXISTS org_id;
ALTER TABLE IF EXISTS bio_link_pages DROP COLUMN IF EXISTS org_id;

DROP TABLE IF EXISTS platform_admins;
DROP TABLE IF EXISTS organization_invites;
DROP TABLE IF EXISTS organization_members;
DROP TABLE IF EXISTS organizations;

DO $$ BEGIN
  DROP TYPE IF EXISTS member_role;
  DROP TYPE IF EXISTS organization_plan;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

COMMIT;
```

After rollback: re-run the slug-integrity and row-count diffs to confirm the
database is back at the before-snapshot state.

## Completion log

<!-- Append an entry per run. -->

### Staging rehearsal, YYYY-MM-DD HH:MM TZ
- Backup ID:
- Row count deltas:
- Slug integrity diff:
- Anomalies:
- Signed off by:

### Production, YYYY-MM-DD HH:MM TZ
- Backup ID:
- Row count deltas:
- Slug integrity diff:
- Anomalies:
- Signed off by:

---

# Phase 0.B — Backfill Personal Orgs

Phase 0.B populates `org_id` on every existing row and installs a Postgres
trigger that auto-creates a personal organisation for every future
`auth.users` insert. Phase 0.B is **not purely additive** — it writes to
`organizations`, `organization_members`, `bio_link_pages.org_id`, and
`qr_codes.org_id`. The redirect handler remains unaffected because none of
its columns are touched.

## Pre-flight checklist (Phase 0.B)

### CI gates (must be green on the branch being deployed)

1. `npm run test:run` — all unit tests pass.
2. `npm run type-check` — TypeScript compiles without errors.
3. `npm run migration:schema-lint` — migration directory passes schema-lint.
4. `npm run lint` — linter passes.

### Operational pre-flight

- [ ] Phase 0.A (migration 00016) is confirmed applied in production with all
      six "expect 0" queries from the Phase 0.A runbook returning 0.
- [ ] A full database backup has been taken **today**. Record the backup
      identifier: `BACKUP_ID: _______________`
- [ ] Supabase PITR remains active (Supabase Dashboard → Database → Backups).
- [ ] The migration has been applied end-to-end on a staging project and the
      verification queries below all passed.
- [ ] A reviewer other than the primary operator has read this section and
      the migration SQL.
- [ ] Rollback SQL (below) is pasted into a second terminal, ready to execute.

## Execution (Phase 0.B)

1. In Terminal B, capture pre-migration snapshots:

   ```
   npm run migration:snapshot -- /tmp/phase-0b-slug-before.json
   tsx scripts/migration-safety/row-count-snapshot.ts /tmp/phase-0b-rows-before.json
   ```

2. In Terminal A (Supabase SQL editor), paste the contents of
   `supabase/migrations/00017_backfill_personal_orgs.sql`. Execute.

3. If the SQL editor reports any error: **STOP. DO NOT CONTINUE.** Run the
   rollback SQL below.

4. Capture post-migration snapshots and run the diffs:

   ```
   npm run migration:snapshot -- /tmp/phase-0b-slug-after.json
   tsx scripts/migration-safety/row-count-snapshot.ts /tmp/phase-0b-rows-after.json
   npm run migration:diff -- /tmp/phase-0b-slug-before.json /tmp/phase-0b-slug-after.json
   tsx scripts/migration-safety/row-count-diff.ts /tmp/phase-0b-rows-before.json /tmp/phase-0b-rows-after.json
   ```

   Expected:
   - Slug integrity: zero deltas. The redirect-critical columns did not change.
   - Row counts: `organizations` and `organization_members` each show a count
     equal to the number of `auth.users` rows. All other table counts are
     unchanged. (If your row-count diff tool treats this as a mismatch, that is
     correct — note the deltas in the completion log below and confirm they
     match `SELECT COUNT(*) FROM auth.users`.)

5. Run the verification queries:

   ```sql
   -- All existing rows must now have org_id populated.
   SELECT COUNT(*) FROM bio_link_pages WHERE org_id IS NULL;  -- expect 0
   SELECT COUNT(*) FROM qr_codes WHERE org_id IS NULL;        -- expect 0

   -- One personal org per user.
   SELECT COUNT(*) FROM auth.users;
   SELECT COUNT(DISTINCT user_id) FROM organization_members;
   -- The above two counts must be equal.

   -- No user is in more than one org (Phase 0.B invariant).
   SELECT COUNT(*) FROM (
     SELECT user_id FROM organization_members GROUP BY user_id HAVING COUNT(*) > 1
   ) t;  -- expect 0

   -- Every org has exactly one owner.
   SELECT COUNT(*) FROM organizations o
   WHERE NOT EXISTS (
     SELECT 1 FROM organization_members m
     WHERE m.org_id = o.id AND m.role = 'owner'
   );  -- expect 0
   ```

   All five queries must return the expected values. If any do not, run the
   rollback SQL below and investigate.

6. Confirm the trigger is installed and works. Create a temporary test user
   in the Supabase Dashboard → Authentication → Users → Add User. Then:

   ```sql
   SELECT org_id, role FROM organization_members
   WHERE user_id = (SELECT id FROM auth.users WHERE email = '<test-user-email>');
   ```

   Expected: one row with `role = 'owner'`. If no row, the trigger did not
   fire — investigate before delete-testing. Once confirmed, delete the test
   user from the Supabase Dashboard.

7. Hit one known-good production QR in a browser and confirm the 307 redirect
   still works. Log the HTTP status.

8. Append a completion note in the log below.

## Rollback (Phase 0.B)

Rollback restores the pre-0.B state: drops the trigger, removes generated
personal orgs, and NULLs the `org_id` values we backfilled. The original
`owner_id` columns are untouched throughout, so bio pages and QR codes keep
working via the existing owner-based RLS.

```sql
BEGIN;

-- Drop the trigger first so new signups don't re-create orgs mid-rollback.
DROP TRIGGER IF EXISTS trg_auto_create_personal_org ON auth.users;
DROP FUNCTION IF EXISTS auto_create_personal_org();

-- NULL out the backfilled org_id values.
UPDATE bio_link_pages SET org_id = NULL WHERE org_id IS NOT NULL;
UPDATE qr_codes SET org_id = NULL WHERE org_id IS NOT NULL;

-- Remove the generated memberships and orgs. (Safe because Phase 0.B is the
-- first and only source of rows in these tables.)
DELETE FROM organization_members;
DELETE FROM organizations;

-- Keep the helper function — it's pure and harmless. If you must remove it:
-- DROP FUNCTION IF EXISTS generate_unique_org_slug(TEXT);

COMMIT;
```

After rollback: re-run the verification queries above — all should return 0
(or match the Phase 0.A post-migration state).

## Phase 0.B Completion log

<!-- Append an entry per run. -->

### Staging rehearsal, YYYY-MM-DD HH:MM TZ
- Backup ID:
- Row count deltas (expected: orgs/members +N where N = auth.users count):
- Slug integrity diff:
- Trigger test result:
- Anomalies:
- Signed off by:

### Production, YYYY-MM-DD HH:MM TZ
- Backup ID:
- Row count deltas:
- Slug integrity diff:
- Trigger test result:
- Anomalies:
- Signed off by:

---

# Phase 0.C.1 — Organisation Table RLS + Active-Org Session

Phase 0.C.1 enables row-level security on the four organisation tables
(previously RLS-disabled for Phase 0.B backfill access) and ships the
application-layer plumbing for multi-org membership (session cookie,
switcher UI). This phase does NOT touch RLS on data tables (bio_link_pages,
qr_codes, children) — that's Phase 0.C.2. The redirect handler continues
to use the admin client and is unaffected.

## Pre-flight checklist (Phase 0.C.1)

### CI gates (must be green on the branch being deployed)

1. `npm run test:run` — all unit tests pass.
2. `npm run type-check` — TypeScript compiles without errors.
3. `npm run migration:schema-lint` — migration directory passes schema-lint.
4. `npm run lint` — linter passes.

### Operational pre-flight

- [ ] Phase 0.B (migration 00017) confirmed applied in production with all
      verification queries green.
- [ ] Full database backup taken today. `BACKUP_ID: _______________`
- [ ] Supabase PITR active.
- [ ] Application deploy of the Phase 0.C.1 branch is READY but NOT yet
      live. Migration applies first; app deploy follows within minutes.
- [ ] One platform admin row exists in production (or will be inserted
      via service_role during this window). Without this, no one will be
      able to manage platform-level state after RLS is enabled on
      `platform_admins`. To insert (via Supabase SQL editor as service
      role):
      ```sql
      INSERT INTO platform_admins (user_id, granted_by, notes)
      VALUES (
        (SELECT id FROM auth.users WHERE email = '<your-admin-email>'),
        NULL,
        'Initial platform admin'
      );
      ```
- [ ] Rollback SQL (below) ready in a second terminal.

## Execution (Phase 0.C.1)

1. Capture pre-migration snapshots:

   ```
   npm run migration:snapshot -- /tmp/phase-0c1-slug-before.json
   tsx scripts/migration-safety/row-count-snapshot.ts /tmp/phase-0c1-rows-before.json
   ```

2. Apply `supabase/migrations/00018_enable_rls_on_org_tables.sql` in the
   Supabase SQL editor.

3. If any error: STOP. Run the rollback SQL below.

4. Capture post-migration snapshots + diffs:

   ```
   npm run migration:snapshot -- /tmp/phase-0c1-slug-after.json
   tsx scripts/migration-safety/row-count-snapshot.ts /tmp/phase-0c1-rows-after.json
   npm run migration:diff -- /tmp/phase-0c1-slug-before.json /tmp/phase-0c1-slug-after.json
   tsx scripts/migration-safety/row-count-diff.ts /tmp/phase-0c1-rows-before.json /tmp/phase-0c1-rows-after.json
   ```

   Expected: zero deltas on both. This migration adds policies, doesn't
   change row data.

5. Verify the helper functions and policies exist:

   ```sql
   SELECT proname FROM pg_proc WHERE proname IN (
     'is_platform_admin', 'is_member_of_org', 'role_in_org'
   );
   -- expect 3 rows

   SELECT tablename, policyname FROM pg_policies
   WHERE tablename IN (
     'organizations', 'organization_members', 'organization_invites', 'platform_admins'
   )
   ORDER BY tablename, policyname;
   -- expect multiple policies across all four tables
   ```

6. Verify RLS is actually enabled:

   ```sql
   SELECT relname, relrowsecurity FROM pg_class
   WHERE relname IN (
     'organizations', 'organization_members', 'organization_invites', 'platform_admins'
   );
   -- all four relrowsecurity should be true
   ```

7. Smoke-test with two test accounts (or one test + one real):

   - Sign in as user A. Visit `/app`. The org switcher should render
     showing user A's personal org. The `lynx_active_org` cookie should
     be set.
   - Check dev tools → Application → Cookies → confirm cookie is
     HTTP-only, SameSite=Lax, value is a UUID.
   - Hit a known-good production QR in a browser → confirm 307 redirect
     still works (redirect handler bypasses RLS, unaffected).

8. Deploy the application code to the same environment (Vercel auto-deploy
   on branch merge is typical).

9. Append a completion note in the log below.

## Rollback (Phase 0.C.1)

Rollback disables RLS on the four tables and drops the policies. This
restores the Phase 0.B state where those tables are RLS-free. The helper
functions can stay — they're harmless when no policy references them.

```sql
BEGIN;

ALTER TABLE organizations DISABLE ROW LEVEL SECURITY;
ALTER TABLE organization_members DISABLE ROW LEVEL SECURITY;
ALTER TABLE organization_invites DISABLE ROW LEVEL SECURITY;
ALTER TABLE platform_admins DISABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "organizations_select_member_or_admin" ON organizations;
DROP POLICY IF EXISTS "organizations_insert_platform_admin" ON organizations;
DROP POLICY IF EXISTS "organizations_update_owner_admin" ON organizations;
DROP POLICY IF EXISTS "organizations_delete_owner" ON organizations;

DROP POLICY IF EXISTS "organization_members_select_org_members" ON organization_members;
DROP POLICY IF EXISTS "organization_members_insert_owner_admin" ON organization_members;
DROP POLICY IF EXISTS "organization_members_update_owner_admin" ON organization_members;
DROP POLICY IF EXISTS "organization_members_delete_owner_admin_or_self" ON organization_members;

DROP POLICY IF EXISTS "organization_invites_select_parties" ON organization_invites;
DROP POLICY IF EXISTS "organization_invites_insert_owner_admin" ON organization_invites;
DROP POLICY IF EXISTS "organization_invites_update_invitee_or_admin" ON organization_invites;
DROP POLICY IF EXISTS "organization_invites_delete_creator_or_admin" ON organization_invites;

DROP POLICY IF EXISTS "platform_admins_select_self" ON platform_admins;
DROP POLICY IF EXISTS "platform_admins_insert_self" ON platform_admins;
DROP POLICY IF EXISTS "platform_admins_update_self" ON platform_admins;
DROP POLICY IF EXISTS "platform_admins_delete_self" ON platform_admins;

-- Keep the helper functions — they're pure, harmless, and Phase 0.C.2 uses them.
-- If truly needed to remove:
-- DROP FUNCTION IF EXISTS is_platform_admin();
-- DROP FUNCTION IF EXISTS is_member_of_org(UUID);
-- DROP FUNCTION IF EXISTS role_in_org(UUID);

COMMIT;
```

After rollback: the app still works because the Phase 0.B state is restored.
Users can still log in, bio pages still work, QR redirects still work.

## Phase 0.C.1 Completion log

<!-- Append an entry per run. -->

### Staging rehearsal, YYYY-MM-DD HH:MM TZ
- Backup ID:
- Policies verified:
- RLS enabled verified:
- Smoke test (2 users):
- Anomalies:
- Signed off by:

### Production, YYYY-MM-DD HH:MM TZ
- Backup ID:
- Policies verified:
- RLS enabled verified:
- Smoke test:
- QR redirect spot check:
- Anomalies:
- Signed off by:

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

---

# Invite Flow

Not part of Phase 0 foundation — this is the first feature phase that
depends on the foundation. Ships one small DB migration + app code.

## Pre-flight

1. `npm run test:run` — all tests pass.
2. `npm run type-check` — clean.
3. `npm run migration:schema-lint` — passes.
4. Phase 0.C.2 complete (NOT NULL constraint on org_id active).
5. `RESEND_API_KEY` set in production env vars.

## Execution

1. Apply `supabase/migrations/00022_invite_pending_unique.sql` in the
   Supabase SQL editor.

2. Verify the index exists:

   ```sql
   SELECT indexname FROM pg_indexes
   WHERE tablename = 'organization_invites'
     AND indexname = 'idx_invites_unique_pending';
   -- expect 1 row
   ```

3. Deploy the application code (Vercel auto-deploys on merge).

4. Smoke test:
   - Sign in as an owner or admin.
   - Navigate to `/app/settings/team`.
   - Send an invite to a test email address you control.
   - Confirm the invite appears in the pending list.
   - Check the recipient inbox — the email should arrive within a minute.
   - Click the accept link, sign in/up, click Accept.
   - Confirm the accept redirects to `/app` with the new org active.

## Rollback

```sql
DROP INDEX IF EXISTS idx_invites_unique_pending;
```

No app rollback SQL — reverting the deploy removes the UI. DB invites table
is unchanged by this feature.

## Completion log

### Production, YYYY-MM-DD HH:MM TZ
- Index verified:
- Invite email round-trip:
- Anomalies:
- Signed off by:

---

# Super-Admin Dashboard

Ships the `/admin` area: platform-admin-gated dashboard with step-up auth,
audit log, org/user directories, and read-only view-as preview. Unblocks
the Shopfront plan.

## Pre-flight

1. `npm run test:run` — all pass.
2. `npm run type-check` — clean.
3. `npm run migration:schema-lint` — passes.
4. **New env var required:** `ADMIN_SESSION_SECRET` must be set in Vercel
   production env. Generate with:
   ```
   openssl rand -base64 48
   ```
   Paste the result into Vercel → Settings → Environment Variables → Production.
   Must be at least 32 characters.
5. Phase 0 foundation complete in production.
6. At least one `platform_admins` row exists.

## Execution

1. Apply `supabase/migrations/00023_platform_audit_log.sql` in the Supabase
   SQL editor.

2. Verify:
   ```sql
   SELECT tablename FROM pg_tables WHERE tablename = 'platform_audit_log';
   -- expect 1 row
   SELECT relrowsecurity FROM pg_class WHERE relname = 'platform_audit_log';
   -- expect true
   ```

3. Deploy the app (Vercel auto-deploys on merge).

4. Smoke test (as the seeded platform admin):
   - Sign in normally at `/auth/login`.
   - Navigate to `/admin` → should redirect to `/admin/login` with a step-up
     password prompt.
   - Enter password → should land at `/admin` home with KPI tiles.
   - Click Organisations → list loads. Click an org → detail loads. Click
     "View as (read-only preview)" → preview renders with a red banner.
   - Click Users → list loads. Click a user → detail loads.
   - Click Audit log → recent admin actions visible including your own
     `admin_session.created`, `admin.view_org`, `admin.view_user`,
     `admin.view_as_preview` entries.
   - Wait 31 minutes (or manually expire the cookie via DevTools → Cookies)
     → next /admin request should redirect to /admin/login.
   - Click "Exit admin" in the admin nav → should clear the cookie and
     return to /app.

## Rollback

```sql
DROP TABLE IF EXISTS platform_audit_log;
```

App rollback: revert the deploy. No other data affected.

## Completion log

### Production, YYYY-MM-DD HH:MM TZ
- `ADMIN_SESSION_SECRET` set:
- Migration 00023 applied:
- Smoke test:
- Anomalies:
- Signed off by:

---

# Shopfront (Foundation + Admin + Browse)

Ships a browsable catalog and admin product CRUD. Checkout is deferred to
the follow-up Stripe plan — the "Buy" button renders disabled with a
"coming soon" copy.

## Pre-flight

1. `npm run test:run` — all pass.
2. `npm run type-check` — clean.
3. `npm run migration:schema-lint` — passes.
4. Super-admin dashboard live in production (required for product CRUD UI).
5. No new env vars required in this release.

## Execution

1. Apply `supabase/migrations/00024_shopfront.sql` in the Supabase SQL
   editor.

2. Verify the storage bucket and tables exist:

   ```sql
   SELECT id, public FROM storage.buckets WHERE id = 'shop-product-media';
   -- expect 1 row with public = true

   SELECT tablename FROM pg_tables
   WHERE tablename LIKE 'shop\_%' ESCAPE '\';
   -- expect 5 rows: shop_products, shop_product_variants,
   -- shop_product_customizations, shop_orders, shop_order_items
   ```

3. Deploy the app (Vercel auto-deploys on merge).

4. Seed at least one product via `/admin/shop/products/new` — fill the
   form, paste a product image URL (any test image from imgur/unsplash is
   fine for now), save, toggle is_active on, and confirm it appears in the
   customer view at `/app/shop`.

5. Smoke test:
   - Sign in as an org owner (non-admin). Visit `/app/shop` → hero + grid
     render. Click a product → detail page renders with "Checkout coming
     soon" button disabled.
   - Sign in as tom@onesignanddigital.com (platform admin). Visit
     `/admin/shop/products` → list view with your seeded product. Click
     into it → edit form. Edit the name → save → list updates. Delete →
     product disappears from `/app/shop`.

## Rollback

```sql
DROP TABLE IF EXISTS shop_order_items;
DROP TABLE IF EXISTS shop_orders;
DROP TABLE IF EXISTS shop_product_customizations;
DROP TABLE IF EXISTS shop_product_variants;
DROP TABLE IF EXISTS shop_products;
DROP TYPE IF EXISTS shop_customization_field_type;
DROP TYPE IF EXISTS shop_order_status;
DROP TYPE IF EXISTS shop_product_category;

-- Remove the bucket (careful — this deletes all uploaded media):
-- DELETE FROM storage.objects WHERE bucket_id = 'shop-product-media';
-- DELETE FROM storage.buckets WHERE id = 'shop-product-media';
```

App rollback: revert the deploy.

## Completion log

### Production, YYYY-MM-DD HH:MM TZ
- Migration applied:
- Smoke test:
- First product seeded:
- Anomalies:
- Signed off by:
