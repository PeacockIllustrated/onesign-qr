# Phase 0.B — Backfill Personal Orgs Implementation Plan

**Date:** 2026-04-18
**Depends on:** Phase 0.A (merged + deployed to staging and production)
**Blocks:** Phase 0.C (RLS rewrite + active-org session)

**Goal:** Populate `organizations`, `organization_members`, and the newly
added `org_id` columns on `bio_link_pages` and `qr_codes` so that every
existing `auth.users` row has a personal organisation it owns, and every
owned row is linked to the correct org. **No schema changes. No RLS changes.
No behaviour change for any existing user.**

## Scope

✅ **In scope**
- Migration `00017_backfill_personal_orgs.sql` (one SQL file, one transaction).
- A read-only verification script (`backfill-verify.ts`) runnable against any
  environment to assert post-conditions.
- Paired rollback script (`rollback-0b.sql`).
- A staging rehearsal + a production execution entry in the runbook.

❌ **Out of scope**
- RLS policy rewrite (Phase 0.C).
- Dropping the `UNIQUE(owner_id)` constraint on `bio_link_pages` (Phase 0.C).
- Active-org session cookie / org switcher / invite flow (separate plans).
- Dropping `owner_id` columns (Phase 0.D, ≥30 days after Phase 0.C).

## Design decisions

### Deterministic personal-org slug
Slug is `personal-<first 8 hex chars of user_id with hyphens stripped>`.
This gives every user a guaranteed unique slug without probing the email
namespace (which is not unique in the general case — users can share
prefixes across email domains, or rename their email).

The display name is `"<email prefix>'s workspace"`, falling back to
`"workspace's workspace"` only if the email is empty — which should not
happen in this auth schema but is guarded in the SQL for defensive reasons.

### Idempotency
The migration's first statement filters `auth.users` to those that do not
already own a `personal-*` organisation. Re-running the migration therefore
no-ops once all users have been backfilled. The two `UPDATE ... WHERE org_id
IS NULL` statements are inherently idempotent.

### Assertive verification in the transaction
The migration ends with a `DO` block that raises an exception if any of
three invariants fail:
1. `COUNT(*) FROM bio_link_pages WHERE org_id IS NULL` > 0
2. `COUNT(*) FROM qr_codes WHERE org_id IS NULL` > 0
3. `COUNT(*) FROM auth.users` ≠ `COUNT(DISTINCT user_id)` for personal-org owners

If any check fails, the `COMMIT` never runs and nothing changes in
production. This means the migration is its own verification gate — there
is no "we ran it and hoped" window.

### Separate rollback
`scripts/migration-safety/rollback-0b.sql` deletes personal-* orgs, the
memberships pointing at them, and nulls `org_id` on the two owned tables.
It is safe to run **only if no user-visible writes have happened since**;
the runbook calls this out.

## Files

**Created:**
- `supabase/migrations/00017_backfill_personal_orgs.sql`
- `scripts/migration-safety/rollback-0b.sql`
- `scripts/migration-safety/backfill-verify.ts`

**Modified:**
- `package.json` — adds `migration:backfill-verify`, `migration:rowcount-snapshot`, `migration:rowcount-diff`.
- `docs/superpowers/runbooks/phase-0-migration.md` — adds a Phase 0.B section.

## Execution

All operator steps live in
`docs/superpowers/runbooks/phase-0-migration.md` under "Execution
(Phase 0.B)". The high-level sequence:

1. Capture slug-integrity and row-count snapshots (before).
2. Apply `00017_backfill_personal_orgs.sql` in the Supabase SQL editor.
3. Capture snapshots (after).
4. Run diff scripts — slug integrity must be clean; row counts on owned
   tables must be unchanged; row counts on `organizations` and
   `organization_members` must be ≥ pre-migration user count.
5. Run `npm run migration:backfill-verify` against the migrated environment.
6. Spot-check three production QRs still resolve.

## Completion criteria

1. Migration 00017 applied to production inside a single transaction.
2. `backfill-verify` passes against production.
3. Slug-integrity diff zero.
4. Row-count diff on `qr_codes`, `bio_link_pages`, and all `bio_*` tables is
   zero (backfill must not have created or deleted any owned rows).
5. Row counts on `organizations` and `organization_members` both equal the
   `auth.users` count (no duplicates, no gaps).
6. Manual spot-check: three known-good production QR codes still resolve.
7. Runbook has a completed Phase 0.B production entry.

## Risk matrix

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Slug collision in `organizations` | Very low | Migration fails cleanly | Deterministic `personal-<uid8>` slug; partial unique index `WHERE deleted_at IS NULL` catches duplicates |
| `auth.users` grows mid-migration | Low | A user signs up during the 30-second window | New users signed up after migration will have NULL org_id until next sweep; Phase 0.C deferred until a re-sweep confirms 0 NULLs |
| Long-running transaction locks | Very low | Writes stall during backfill | Migration is three small UPDATEs; expected runtime well under 10s on prod-scale data |
| Redirect handler reads `org_id` | None | — | Handler reads only slug/destination_url/is_active/analytics_enabled/mode; org_id is invisible to it |

## Re-sweep on the day of Phase 0.C

The Phase 0.C plan must begin by re-running migration 00017 (idempotent) and
the verify script, to catch any `auth.users` rows that were created between
Phase 0.B and Phase 0.C.
