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
