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

3. In Terminal A, open `supabase/migrations/00016_organizations_and_org_id_columns.sql`
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

---

## Pre-flight checklist (Phase 0.B)

Phase 0.B is a data-only migration: it creates one personal organisation per
`auth.users` row, inserts the owner membership, and populates `org_id` on
`bio_link_pages` and `qr_codes`. No schema changes. The migration is
idempotent — safe to re-run. It is executed inside a single transaction;
any assertion failure rolls the whole thing back.

- [ ] Phase 0.A has been complete in production for ≥24 hours with no
      redirect regressions and no user-facing incidents.
- [ ] Supabase PITR is active; retention ≥7 days.
- [ ] A fresh backup has been taken **today**.
      `BACKUP_ID: _______________`
- [ ] Phase 0.B has been rehearsed end-to-end against staging:
      migration + `backfill-verify` + slug-integrity + row-count diffs all
      pass with zero deltas on owned tables, and
      `COUNT(organizations)` equals `COUNT(auth.users)` post-migration.
- [ ] The CI gates listed in the Phase 0.A section are still green on the
      branch being deployed.
- [ ] `scripts/migration-safety/rollback-0b.sql` has been reviewed and
      pasted into a second terminal ready to execute.
- [ ] A reviewer who is not the primary operator has read this runbook
      section and the migration SQL.
- [ ] Migration window scheduled in the lowest-traffic slot with on-call
      awake.

## Execution (Phase 0.B)

1. In Terminal B, capture pre-migration snapshots:

   ```
   npm run migration:snapshot -- /tmp/phase-0b-slug-before.json
   npm run migration:rowcount-snapshot -- /tmp/phase-0b-rows-before.json
   ```

2. Record the pre-migration parity numbers:

   ```sql
   SELECT COUNT(*) FROM auth.users;                     -- note this
   SELECT COUNT(*) FROM organizations;                  -- expect 0
   SELECT COUNT(*) FROM organization_members;           -- expect 0
   SELECT COUNT(*) FILTER (WHERE org_id IS NULL) FROM bio_link_pages;
   SELECT COUNT(*) FILTER (WHERE org_id IS NULL) FROM qr_codes;
   ```

3. In Terminal A, paste the full contents of
   `supabase/migrations/00017_backfill_personal_orgs.sql` into the Supabase
   SQL editor. Execute.

4. If the editor reports any error: **STOP. DO NOT RE-RUN.** The
   transaction has already rolled back; nothing changed. Investigate before
   proceeding. If the fault is transient (network), you may re-run.
   Otherwise, file an incident and pause.

5. Capture post-migration snapshots:

   ```
   npm run migration:snapshot -- /tmp/phase-0b-slug-after.json
   npm run migration:rowcount-snapshot -- /tmp/phase-0b-rows-after.json
   ```

6. Run the diffs:

   ```
   npm run migration:diff -- /tmp/phase-0b-slug-before.json /tmp/phase-0b-slug-after.json
   npm run migration:rowcount-diff -- /tmp/phase-0b-rows-before.json /tmp/phase-0b-rows-after.json
   ```

   Slug integrity must be clean. Row counts on owned tables
   (`bio_link_pages`, `qr_codes`, and every `bio_*`) must not have changed.

7. Run the automated post-condition check:

   ```
   npm run migration:backfill-verify
   ```

   Expected: `Backfill verification passed.` (exit 0).

8. Manual parity check:

   ```sql
   SELECT COUNT(*) FROM auth.users;                     -- A
   SELECT COUNT(*) FROM organizations
     WHERE slug LIKE 'personal-%' AND deleted_at IS NULL; -- B
   SELECT COUNT(DISTINCT user_id) FROM organization_members
     JOIN organizations o ON o.id = organization_members.org_id
     WHERE role = 'owner'
       AND o.slug LIKE 'personal-%'
       AND o.deleted_at IS NULL;                         -- C

   -- A must equal B must equal C.

   SELECT COUNT(*) FILTER (WHERE org_id IS NULL) FROM bio_link_pages;
   SELECT COUNT(*) FILTER (WHERE org_id IS NULL) FROM qr_codes;
   -- Both expect 0.
   ```

9. Hit at least three known-good production QRs manually. Log HTTP status
   and Location header. All must return 307 to the expected destination.

10. Append a Phase 0.B entry to the Completion log.

## Rollback (Phase 0.B)

**Only safe if no user-visible writes to organizations or memberships have
happened since the backfill.** If a real org has been created (slug not
starting with `personal-`) do not run this automatic rollback; instead,
open a hotfix SQL that targets only the rows you need to revert.

```
-- In Supabase SQL editor
-- Paste the contents of scripts/migration-safety/rollback-0b.sql
```

After rollback: re-run the slug-integrity diff and confirm zero deltas
from the pre-Phase-0.B snapshot.

---

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

### Phase 0.B staging rehearsal, YYYY-MM-DD HH:MM TZ
- Backup ID:
- auth.users count:
- organizations personal-* count after:
- Slug integrity diff:
- Row count deltas on owned tables:
- Anomalies:
- Signed off by:

### Phase 0.B production, YYYY-MM-DD HH:MM TZ
- Backup ID:
- auth.users count:
- organizations personal-* count after:
- Slug integrity diff:
- Row count deltas on owned tables:
- Anomalies:
- Signed off by:
