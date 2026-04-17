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
