# Phase 0.B — Backfill + Signup Trigger Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Populate `org_id` on every existing row in `bio_link_pages` and `qr_codes` by creating one personal organisation per existing `auth.users` row, and install a Postgres trigger so every future `auth.users` insert automatically creates a personal org. Also update the four API insert sites so newly-created bio pages and QR codes set `org_id` alongside `owner_id`.

**Architecture:** A single SQL migration (`00017_backfill_personal_orgs.sql`) handles the backfill (idempotently — `WHERE org_id IS NULL` on existing rows, `ON CONFLICT DO NOTHING` on the member insert) and installs an `AFTER INSERT` trigger on `auth.users`. Application code gets a tiny helper (`getPersonalOrgId`) used by the four API routes that insert bio pages or QR codes. `org_id` stays **nullable** throughout Phase 0.B — Phase 0.C tightens it to `NOT NULL` once RLS is in place.

The DB-trigger approach for auto-creating personal orgs on new signups is chosen deliberately over modifying the signup code path: the trigger catches **every** `auth.users` insert (password, magic link, future OAuth, admin-created users, password-reset-with-create) and runs atomically with user creation. Application-layer signup code can't regress it.

**Tech Stack:** Supabase (PostgreSQL + Auth), Next.js 16 App Router, TypeScript, Vitest, Zod. Migrations are plain SQL in `supabase/migrations/`. Existing patterns from [00016_organizations_and_org_id_columns.sql](supabase/migrations/00016_organizations_and_org_id_columns.sql) apply.

**Prerequisites (must be true before starting):**
- Phase 0.A complete in production (migration 00016 applied, new tables exist empty, `org_id` columns exist NULL). Confirmed 2026-04-17.
- Schema-lint CI check from Phase 0.A is active.

**Scope boundary (read before starting):**
- ✅ **In scope:** backfill of existing rows, Postgres trigger for new signups, `getPersonalOrgId` helper, four API route updates, runbook Phase 0.B section, staging rehearsal notes, production migration apply.
- ❌ **Out of scope (Phase 0.C):** any RLS policy changes, `NOT NULL` constraint on `org_id`, active-org session cookie, org switcher UI, ability for a user to belong to >1 org, invite flow.
- ❌ **Already done by remote (do not touch):** drop of `UNIQUE(owner_id)` constraint on `bio_link_pages` (handled by `00015_multi_bio_pages.sql`).

**Reference spec:** `docs/superpowers/specs/2026-04-17-onesign-lynx-h1-h2-design.md` — Section 2 (Foundation) and Section 6 (Migration protocol, Phase 0.B subsection).

---

## File structure

**Created:**
- `src/lib/org/get-personal-org.ts` — a small helper that looks up the one `organization_members` row for a user and returns its `org_id`.
- `src/__tests__/lib/org/get-personal-org.test.ts` — unit tests for the helper.
- `supabase/migrations/00017_backfill_personal_orgs.sql` — backfill + auto-create trigger.

**Modified:**
- `src/app/api/qr/route.ts` — POST handler populates `org_id` on new QR insert.
- `src/app/api/bio/route.ts` — POST handler populates `org_id` on both the bio page insert AND the auto-QR insert inside the same handler.
- `src/app/api/bio/[id]/qr/route.ts` — POST handler populates `org_id` on new QR insert.
- `docs/superpowers/runbooks/phase-0-migration.md` — append a Phase 0.B execution section.

**Not touched (intentionally):**
- The existing `owner_id` columns and assignments. They stay populated throughout Phase 0.B as a safety belt.
- RLS policies, which are all still owner-based. Phase 0.C will rewrite them.
- Any other API route.

---

## Part 1 — Helper module and tests

### Task 1: `getPersonalOrgId` helper with TDD

**Files:**
- Create: `src/lib/org/get-personal-org.ts`
- Create: `src/__tests__/lib/org/get-personal-org.test.ts`

This helper returns the `org_id` of the one org a user belongs to. In Phase 0.B every user belongs to exactly one org (their personal). Phase 0.C introduces multi-org membership via invite flow — at that point, this helper will be replaced by an "active org" lookup. For now, it's a single-query helper that's easy to swap later.

- [ ] **Step 1: Write the failing test file**

```typescript
// src/__tests__/lib/org/get-personal-org.test.ts
import { describe, it, expect, vi } from 'vitest';
import { getPersonalOrgId } from '@/lib/org/get-personal-org';

type MaybeRow = { org_id: string } | null;

function mockSupabaseReturning(data: MaybeRow, error: unknown = null) {
  const single = vi.fn().mockResolvedValue({ data, error });
  const eq = vi.fn().mockReturnValue({ single });
  const select = vi.fn().mockReturnValue({ eq });
  const from = vi.fn().mockReturnValue({ select });
  // Typed as `any` at the call site — the real signature is SupabaseClient,
  // which we don't want to import into a unit test.
  return { from } as unknown as {
    from: ReturnType<typeof vi.fn>;
  };
}

describe('getPersonalOrgId', () => {
  it('returns the org_id when the user has exactly one membership', async () => {
    const client = mockSupabaseReturning({ org_id: 'org-123' });
    const orgId = await getPersonalOrgId(client as never, 'user-1');
    expect(orgId).toBe('org-123');
  });

  it('throws when no membership exists for the user', async () => {
    const client = mockSupabaseReturning(null, {
      code: 'PGRST116',
      message: 'not found',
    });
    await expect(
      getPersonalOrgId(client as never, 'user-1')
    ).rejects.toThrow(/no organisation/i);
  });

  it('throws when the query errors for an unrelated reason', async () => {
    const client = mockSupabaseReturning(null, {
      code: 'XX000',
      message: 'internal error',
    });
    await expect(
      getPersonalOrgId(client as never, 'user-1')
    ).rejects.toThrow(/internal error/i);
  });

  it('queries organization_members filtered by user_id', async () => {
    const client = mockSupabaseReturning({ org_id: 'org-1' });
    await getPersonalOrgId(client as never, 'user-abc');

    expect(client.from).toHaveBeenCalledWith('organization_members');
    const selectCall = client.from.mock.results[0].value.select;
    expect(selectCall).toHaveBeenCalledWith('org_id');
    const eqCall = selectCall.mock.results[0].value.eq;
    expect(eqCall).toHaveBeenCalledWith('user_id', 'user-abc');
  });
});
```

- [ ] **Step 2: Run tests to verify failure**

Run: `npm run test:run -- src/__tests__/lib/org/get-personal-org.test.ts`
Expected: FAIL — module `@/lib/org/get-personal-org` not found.

- [ ] **Step 3: Write the helper**

```typescript
// src/lib/org/get-personal-org.ts
import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Returns the org_id of the one organisation the user belongs to.
 *
 * Phase 0.B invariant: every user belongs to exactly one organisation (their
 * personal org, auto-created by the Postgres trigger on auth.users insert or
 * by the backfill migration). Calling this on a user without any membership
 * is a bug — we throw rather than return null so callers get a clear signal.
 *
 * Phase 0.C will replace this with an active-org lookup once users can
 * belong to multiple orgs via the invite flow.
 */
export async function getPersonalOrgId(
  client: SupabaseClient,
  userId: string
): Promise<string> {
  const { data, error } = await client
    .from('organization_members')
    .select('org_id')
    .eq('user_id', userId)
    .single();

  if (error) {
    if ((error as { code?: string }).code === 'PGRST116') {
      throw new Error(
        `No organisation found for user ${userId}. ` +
          `Expected a personal org to exist — signup trigger may have failed.`
      );
    }
    throw new Error(
      `Failed to look up organisation for user ${userId}: ${(error as { message?: string }).message ?? 'unknown error'}`
    );
  }

  if (!data) {
    throw new Error(
      `No organisation found for user ${userId}. ` +
        `Expected a personal org to exist — signup trigger may have failed.`
    );
  }

  return data.org_id;
}
```

- [ ] **Step 4: Run tests to verify pass**

Run: `npm run test:run -- src/__tests__/lib/org/get-personal-org.test.ts`
Expected: all 4 tests PASS.

- [ ] **Step 5: Run the whole suite**

Run: `npm run test:run`
Expected: 142 tests pass (138 existing + 4 new).

- [ ] **Step 6: Typecheck**

Run: `npm run type-check`
Expected: exit 0.

- [ ] **Step 7: Commit**

```bash
git add src/lib/org/get-personal-org.ts src/__tests__/lib/org/get-personal-org.test.ts
git commit -m "feat: add getPersonalOrgId helper with unit tests"
```

---

## Part 2 — Backfill migration

### Task 2: Write migration 00017 (backfill + signup trigger)

**Files:**
- Create: `supabase/migrations/00017_backfill_personal_orgs.sql`

The migration does four things in one transactional script:

1. **Helper function `generate_unique_org_slug(base TEXT)`** — returns a unique slug derived from the input, appending `-N` on collision with an active org.
2. **Backfill existing users** — for every `auth.users` row without an `organization_members` entry, create an `organizations` row (name = `"<email prefix>'s workspace"`, plan = `free`) and an `organization_members` row with `role = 'owner'`.
3. **Populate `org_id` on existing data** — set `bio_link_pages.org_id` and `qr_codes.org_id` from the owner's newly-created (or already-existing) personal org, only where `org_id IS NULL`.
4. **Install trigger `trg_auto_create_personal_org`** — fires `AFTER INSERT ON auth.users` and creates the personal org + membership for the new user.

The migration is idempotent. If it's re-run, all INSERTs and UPDATEs no-op because of the `WHERE NOT EXISTS` / `WHERE org_id IS NULL` guards.

- [ ] **Step 1: Create the migration file**

```sql
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
    org_slug := generate_unique_org_slug(email_prefix);

    INSERT INTO organizations (name, slug, plan)
    VALUES (org_name, org_slug, 'free')
    RETURNING id INTO new_org_id;

    INSERT INTO organization_members (org_id, user_id, role)
    VALUES (new_org_id, u.id, 'owner');
  END LOOP;
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
  org_slug := generate_unique_org_slug(email_prefix);

  INSERT INTO organizations (name, slug, plan)
  VALUES (org_name, org_slug, 'free')
  RETURNING id INTO new_org_id;

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
```

- [ ] **Step 2: Run schema-lint to confirm the migration does not touch redirect-critical columns**

Run: `npm run migration:schema-lint`
Expected: `Migration schema-lint passed.`

If it fails, the migration has accidentally touched a protected column — stop and fix.

- [ ] **Step 3: Run the full test suite (sanity — no code changed yet)**

Run: `npm run test:run`
Expected: all tests pass (142).

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/00017_backfill_personal_orgs.sql
git commit -m "feat: add migration 00017 (backfill personal orgs + auto-create trigger)"
```

---

## Part 3 — API route updates

Four insert sites need to populate `org_id`. Each task uses `getPersonalOrgId` from Task 1. The helper throws on missing membership — we let the throw bubble up to the route's existing try/catch, returning a 500. This is the correct behaviour: if a user reaches this code without a personal org, something upstream has broken and we want loud failure, not silent NULL inserts.

### Task 3: Update POST /api/qr to populate `org_id`

**Files:**
- Modify: `src/app/api/qr/route.ts` (around line 76 — the `.insert({ owner_id: user.id, name, ... })` call)

- [ ] **Step 1: Read the current handler**

Read `src/app/api/qr/route.ts` fully. Confirm the POST handler:
  - Obtains `user` via `supabase.auth.getUser()`.
  - Inserts into `qr_codes` with `owner_id: user.id`.
  - Returns the new QR code.

Note the exact indentation style of the insert object so your edit matches.

- [ ] **Step 2: Add the import**

At the top of the file, add this import alongside the existing imports:

```typescript
import { getPersonalOrgId } from '@/lib/org/get-personal-org';
```

- [ ] **Step 3: Look up the org_id before the insert**

Immediately before the existing `.insert({ owner_id: user.id, ... })` call, add:

```typescript
const orgId = await getPersonalOrgId(supabase, user.id);
```

(Indent to match the surrounding block.)

- [ ] **Step 4: Add `org_id: orgId` to the insert payload**

Change the insert payload from:

```typescript
.insert({
  owner_id: user.id,
  name,
  // ...rest of fields
})
```

to:

```typescript
.insert({
  owner_id: user.id,
  org_id: orgId,
  name,
  // ...rest of fields
})
```

- [ ] **Step 5: Typecheck**

Run: `npm run type-check`
Expected: exit 0.

- [ ] **Step 6: Run the whole test suite**

Run: `npm run test:run`
Expected: all tests pass (no regression).

- [ ] **Step 7: Commit**

```bash
git add src/app/api/qr/route.ts
git commit -m "feat: set org_id on new QR codes in POST /api/qr"
```

### Task 4: Update POST /api/bio to populate `org_id` on BOTH insert sites

**Files:**
- Modify: `src/app/api/bio/route.ts` (two insert sites — bio page insert around line 104 and auto-QR insert around line 158)

- [ ] **Step 1: Read the current handler**

Read `src/app/api/bio/route.ts` fully. Confirm both insert sites:
  - Bio page insert (first): `.insert({ owner_id: user.id, title, ... })` into `bio_link_pages`.
  - Auto-QR insert (second, later in same handler): `.insert({ owner_id: user.id, name: \`QR for ${title}\`, ... })` into `qr_codes`.

Both run under the same authenticated user, so one `getPersonalOrgId` lookup near the top of the handler serves both inserts.

- [ ] **Step 2: Add the import**

At the top of the file, add:

```typescript
import { getPersonalOrgId } from '@/lib/org/get-personal-org';
```

- [ ] **Step 3: Look up the org_id once, near the top of the POST handler**

After the `getUser()` auth check succeeds and before any insert, add:

```typescript
const orgId = await getPersonalOrgId(supabase, user.id);
```

(Indent to match the surrounding block. Position it immediately after the user check so both subsequent inserts have access to `orgId`.)

- [ ] **Step 4: Add `org_id: orgId` to the bio page insert**

Change the bio page insert from:

```typescript
.insert({
  owner_id: user.id,
  title,
  // ...
})
```

to:

```typescript
.insert({
  owner_id: user.id,
  org_id: orgId,
  title,
  // ...
})
```

- [ ] **Step 5: Add `org_id: orgId` to the auto-QR insert**

Change the auto-QR insert from:

```typescript
.insert({
  owner_id: user.id,
  name: `QR for ${title}`,
  // ...
})
```

to:

```typescript
.insert({
  owner_id: user.id,
  org_id: orgId,
  name: `QR for ${title}`,
  // ...
})
```

- [ ] **Step 6: Typecheck**

Run: `npm run type-check`
Expected: exit 0.

- [ ] **Step 7: Run the whole test suite**

Run: `npm run test:run`
Expected: all tests pass.

- [ ] **Step 8: Commit**

```bash
git add src/app/api/bio/route.ts
git commit -m "feat: set org_id on new bio pages and auto-QRs in POST /api/bio"
```

### Task 5: Update POST /api/bio/[id]/qr to populate `org_id`

**Files:**
- Modify: `src/app/api/bio/[id]/qr/route.ts` (insert site around line 74)

- [ ] **Step 1: Read the current handler**

Read `src/app/api/bio/[id]/qr/route.ts` fully. Confirm the POST handler inserts into `qr_codes` with `owner_id: user.id, name: \`QR for ${page.title}\`, ...`.

- [ ] **Step 2: Add the import**

At the top of the file, add:

```typescript
import { getPersonalOrgId } from '@/lib/org/get-personal-org';
```

- [ ] **Step 3: Look up the org_id before the insert**

Immediately before the `.insert({ owner_id: user.id, ... })` call:

```typescript
const orgId = await getPersonalOrgId(supabase, user.id);
```

- [ ] **Step 4: Add `org_id: orgId` to the insert payload**

Change:

```typescript
.insert({
  owner_id: user.id,
  name: `QR for ${page.title}`,
  // ...
})
```

to:

```typescript
.insert({
  owner_id: user.id,
  org_id: orgId,
  name: `QR for ${page.title}`,
  // ...
})
```

- [ ] **Step 5: Typecheck**

Run: `npm run type-check`
Expected: exit 0.

- [ ] **Step 6: Run the whole test suite**

Run: `npm run test:run`
Expected: all tests pass.

- [ ] **Step 7: Commit**

```bash
git add src/app/api/bio/[id]/qr/route.ts
git commit -m "feat: set org_id on bio-detail QR creation"
```

---

## Part 4 — Runbook + post-flight

### Task 6: Add Phase 0.B section to the migration runbook

**Files:**
- Modify: `docs/superpowers/runbooks/phase-0-migration.md`

Add a new section AFTER the existing "Completion log" section (append at the end of the file). The section covers pre-flight, execution, verification queries, and rollback for Phase 0.B.

- [ ] **Step 1: Open the runbook and confirm current structure**

Read `docs/superpowers/runbooks/phase-0-migration.md`. The file should end with the "Completion log" template. Your new section goes after that.

- [ ] **Step 2: Append the Phase 0.B section**

Append the following at the end of the file (after the last "Signed off by:" line):

```markdown

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
```

- [ ] **Step 3: Commit**

```bash
git add docs/superpowers/runbooks/phase-0-migration.md
git commit -m "docs: add Phase 0.B section to migration runbook"
```

---

## Part 5 — Manual operator task

### Task 7 (MANUAL): Apply migration 00017 to production

Executed by the primary operator during a scheduled window. This is NOT a subagent task — it requires Supabase Dashboard access and follows the runbook verbatim.

**Do not execute until:**
- All previous tasks are merged to `main`.
- Staging rehearsal completed (or you've consciously decided to skip it given Phase 0.A's experience).
- The pre-flight checklist in the runbook's Phase 0.B section is checked off.

- [ ] **Step 1: Work through the Phase 0.B Execution checklist in the runbook**

Open `docs/superpowers/runbooks/phase-0-migration.md` → "Execution (Phase 0.B)". Complete steps 1–8 on the production Supabase project.

- [ ] **Step 2: Append a "Production" entry to the Phase 0.B completion log**

Fill in timestamp, backup ID, row count deltas, verification query results, trigger test result, anomalies (if any), and sign-off.

- [ ] **Step 3: Commit the runbook update**

```bash
git add docs/superpowers/runbooks/phase-0-migration.md
git commit -m "docs: log Phase 0.B production migration result"
```

---

## Completion criteria

Phase 0.B is complete when all of the following are true in **production**:

1. `SELECT COUNT(*) FROM bio_link_pages WHERE org_id IS NULL` returns 0.
2. `SELECT COUNT(*) FROM qr_codes WHERE org_id IS NULL` returns 0.
3. `SELECT COUNT(*) FROM auth.users` equals `SELECT COUNT(DISTINCT user_id) FROM organization_members`.
4. No user has more than one membership row.
5. Every organisation has exactly one `owner` role member.
6. The `trg_auto_create_personal_org` trigger is installed on `auth.users` and verified working via a temporary test-user creation.
7. Known-good production QRs still redirect with 307 to their expected destinations.
8. The Phase 0.B completion log entry is filled in.

At this point, **Phase 0.C (RLS rewrite + active-org session + org switcher)** becomes unblocked and gets its own plan.
