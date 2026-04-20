# Phase 0.C.1 — Organisation Table RLS + Active-Org Session Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Lock down the four organisation tables (`organizations`, `organization_members`, `organization_invites`, `platform_admins`) with proper row-level security policies, and ship the application-layer plumbing that lets a user have multiple orgs and switch between them (active-org session cookie, `/api/org/switch` endpoint, org switcher UI component).

**Architecture:** Policies on the organisation tables use two helper functions created by this migration: `is_platform_admin()` (SECURITY DEFINER, bypasses RLS on `platform_admins` to avoid infinite recursion) and `is_member_of_org(org_id)` (SECURITY DEFINER, bypasses RLS on `organization_members` same reason). Active-org state lives in a secure HTTP-only cookie, validated server-side against `organization_members` on every request. The switcher API returns the user's orgs and accepts a target org to make active — rejecting if the user isn't a member.

**Tech Stack:** Supabase (PostgreSQL + Auth), Next.js 16 App Router, TypeScript, Vitest, Zod. Cookie library is Next.js built-in `cookies()` from `next/headers`. No new dependencies.

**Prerequisites (must be true before starting):**
- Phase 0.B (migration 00017) applied to production, verified. Every user has exactly one personal org; every bio_link_pages and qr_codes row has `org_id` populated; the signup trigger is installed.

**Scope boundary (read before starting):**
- ✅ **In scope:** migration 00018 (RLS + policies on the 4 org tables), active-org cookie helpers, `/api/org/switch` endpoint, `GET /api/org` (list my orgs) endpoint, org switcher component, middleware integration to seed/validate active-org cookie, runbook Phase 0.C.1 section.
- ❌ **Out of scope (Phase 0.C.2):** rewriting RLS on data tables (`qr_codes`, `bio_link_pages`, and their children), tightening `org_id` to `NOT NULL`. These are the high-risk cutover steps and get their own plan.
- ❌ **Out of scope (separate invite-flow plan):** actual invite emails, invite acceptance route, multi-org membership (users still have exactly one org after this plan — the switcher simply has one item in the list).

**Reference spec:** `docs/superpowers/specs/2026-04-17-onesign-lynx-h1-h2-design.md` — Section 2 (Foundation) and Section 6 (Migration protocol, Phase 0.C subsection).

---

## File structure

**Created:**
- `supabase/migrations/00018_enable_rls_on_org_tables.sql` — enables RLS + adds policies on organisations/members/invites/platform_admins, and creates two helper functions.
- `src/lib/org/active-org.ts` — server-side helpers: `getActiveOrgId(supabase)`, `setActiveOrgCookie(orgId)`, `clearActiveOrgCookie()`.
- `src/__tests__/lib/org/active-org.test.ts` — unit tests.
- `src/app/api/org/route.ts` — `GET` returns the user's orgs (id, name, slug, role, plan).
- `src/app/api/org/switch/route.ts` — `POST` sets the active org (validates membership).
- `src/__tests__/app/api/org/switch.test.ts` — unit tests for the switch endpoint.
- `src/components/org/org-switcher.tsx` — dropdown UI component.
- `src/validations/org-switch.ts` — Zod schema for the POST body.
- `src/__tests__/validations/org-switch.test.ts` — Zod schema tests.

**Modified:**
- `src/middleware.ts` — after the auth check for `/app/*` routes, call `getActiveOrgId` to seed the cookie on first request (defaults to the user's personal org if no cookie yet).
- `src/components/layout/app-sidebar.tsx` — mount the `<OrgSwitcher />` in the existing nav.
- `docs/superpowers/runbooks/phase-0-migration.md` — append Phase 0.C.1 section.

**Not touched (intentionally):**
- Any existing RLS policy on data tables (bio_link_pages, qr_codes, children). Phase 0.C.2 handles those.
- Any existing API route that doesn't need active-org context yet. Phase 0.C.2 sweeps those.

---

## Part 1 — Database: RLS on organisation tables

### Task 1: Migration 00018 (enable RLS + policies + helpers)

**Files:**
- Create: `supabase/migrations/00018_enable_rls_on_org_tables.sql`

Two design decisions baked into the migration:

1. **Two SECURITY DEFINER helper functions** avoid the infinite-recursion trap where a policy on `platform_admins` would query `platform_admins` to check admin status. `is_platform_admin()` and `is_member_of_org(org_id)` bypass RLS inside their bodies. These helpers are reusable in the Phase 0.C.2 data-table policies too.

2. **The signup trigger `auto_create_personal_org` already uses SECURITY DEFINER** (Phase 0.B), so it will still work after RLS is enabled on `organizations` and `organization_members` — the trigger's INSERTs bypass RLS. Verified by the runbook's trigger smoke test.

- [ ] **Step 1: Create the migration file verbatim**

Create `supabase/migrations/00018_enable_rls_on_org_tables.sql`:

```sql
-- Migration: Enable RLS on organisation tables + helper functions
--
-- Phase 0.C.1 of the B2B organisation model rollout. This migration:
--   1. Adds two SECURITY DEFINER helpers (is_platform_admin, is_member_of_org)
--      so RLS policies can check membership/admin status without recursing
--      through RLS on those same tables.
--   2. Enables RLS and adds SELECT/INSERT/UPDATE/DELETE policies on
--      organizations, organization_members, organization_invites,
--      platform_admins.
--
-- Does NOT:
--   - Touch RLS on any data table (bio_link_pages, qr_codes, children) —
--     that's Phase 0.C.2.
--   - Tighten org_id to NOT NULL — also Phase 0.C.2.
--   - Touch the redirect-critical columns on qr_codes.
--
-- Rollback: see docs/superpowers/runbooks/phase-0-migration.md

BEGIN;

-- =============================================================================
-- HELPER: is_platform_admin
--
-- SECURITY DEFINER so the function body bypasses RLS on platform_admins.
-- Without this, a policy on platform_admins that checks "is the caller a
-- platform admin" would recurse through RLS on the same table.
-- =============================================================================

CREATE OR REPLACE FUNCTION is_platform_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM platform_admins WHERE user_id = auth.uid()
  );
$$;

-- =============================================================================
-- HELPER: is_member_of_org(org_id)
--
-- SECURITY DEFINER for the same recursion-avoidance reason as above.
-- Returns true if the current auth.uid() is a member of the given org.
-- =============================================================================

CREATE OR REPLACE FUNCTION is_member_of_org(target_org_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM organization_members
    WHERE org_id = target_org_id AND user_id = auth.uid()
  );
$$;

-- =============================================================================
-- HELPER: role_in_org(org_id)
--
-- Returns the caller's role in the given org, or NULL if not a member.
-- Used by UPDATE/DELETE policies that need owner/admin checks.
-- =============================================================================

CREATE OR REPLACE FUNCTION role_in_org(target_org_id UUID)
RETURNS member_role
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT role FROM organization_members
  WHERE org_id = target_org_id AND user_id = auth.uid()
  LIMIT 1;
$$;

-- =============================================================================
-- TABLE: organizations
-- =============================================================================

ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;

-- SELECT: members see their own orgs; platform admins see all.
CREATE POLICY "organizations_select_member_or_admin"
  ON organizations FOR SELECT
  TO authenticated
  USING (
    is_member_of_org(id) OR is_platform_admin()
  );

-- INSERT: only platform admins can insert directly. Normal orgs are created
-- by the signup trigger (which is SECURITY DEFINER and bypasses RLS) or by
-- the future invite-accept flow (which will use service_role).
CREATE POLICY "organizations_insert_platform_admin"
  ON organizations FOR INSERT
  TO authenticated
  WITH CHECK (is_platform_admin());

-- UPDATE: org owners and admins can update their org. Platform admins can
-- update any org (for super-admin support use cases in H2).
CREATE POLICY "organizations_update_owner_admin"
  ON organizations FOR UPDATE
  TO authenticated
  USING (
    is_platform_admin() OR role_in_org(id) IN ('owner', 'admin')
  )
  WITH CHECK (
    is_platform_admin() OR role_in_org(id) IN ('owner', 'admin')
  );

-- DELETE: owners only (soft delete via updated deleted_at), plus platform
-- admins. We still use a proper DELETE policy — rare but needed for GDPR.
CREATE POLICY "organizations_delete_owner"
  ON organizations FOR DELETE
  TO authenticated
  USING (
    is_platform_admin() OR role_in_org(id) = 'owner'
  );

-- =============================================================================
-- TABLE: organization_members
-- =============================================================================

ALTER TABLE organization_members ENABLE ROW LEVEL SECURITY;

-- SELECT: members of an org can see the full member list of that org; plus
-- platform admins see all.
CREATE POLICY "organization_members_select_org_members"
  ON organization_members FOR SELECT
  TO authenticated
  USING (
    is_platform_admin() OR is_member_of_org(org_id)
  );

-- INSERT: org owners and admins can add members. The signup trigger uses
-- SECURITY DEFINER and bypasses this policy (its INSERTs still work).
-- Platform admins can insert anywhere for support.
CREATE POLICY "organization_members_insert_owner_admin"
  ON organization_members FOR INSERT
  TO authenticated
  WITH CHECK (
    is_platform_admin() OR role_in_org(org_id) IN ('owner', 'admin')
  );

-- UPDATE: owners/admins can change roles. A member cannot promote themselves.
-- (Role-promotion business rules are enforced in application code; the RLS
-- policy is the floor, not the ceiling.)
CREATE POLICY "organization_members_update_owner_admin"
  ON organization_members FOR UPDATE
  TO authenticated
  USING (
    is_platform_admin() OR role_in_org(org_id) IN ('owner', 'admin')
  )
  WITH CHECK (
    is_platform_admin() OR role_in_org(org_id) IN ('owner', 'admin')
  );

-- DELETE: owners/admins can remove members; a member can always remove
-- themselves (leave the org).
CREATE POLICY "organization_members_delete_owner_admin_or_self"
  ON organization_members FOR DELETE
  TO authenticated
  USING (
    is_platform_admin()
    OR role_in_org(org_id) IN ('owner', 'admin')
    OR user_id = auth.uid()
  );

-- =============================================================================
-- TABLE: organization_invites
-- =============================================================================

ALTER TABLE organization_invites ENABLE ROW LEVEL SECURITY;

-- SELECT: owners/admins of the org, the invited email's user if they've
-- signed up, platform admins. The email check matches against the
-- authenticated user's email in auth.users.
CREATE POLICY "organization_invites_select_parties"
  ON organization_invites FOR SELECT
  TO authenticated
  USING (
    is_platform_admin()
    OR role_in_org(org_id) IN ('owner', 'admin')
    OR lower(email) = lower((SELECT email FROM auth.users WHERE id = auth.uid()))
  );

-- INSERT: owners/admins of the org.
CREATE POLICY "organization_invites_insert_owner_admin"
  ON organization_invites FOR INSERT
  TO authenticated
  WITH CHECK (
    is_platform_admin() OR role_in_org(org_id) IN ('owner', 'admin')
  );

-- UPDATE: invitee marking accepted (matched by email). The application
-- layer validates the token; RLS just gates who can write.
CREATE POLICY "organization_invites_update_invitee_or_admin"
  ON organization_invites FOR UPDATE
  TO authenticated
  USING (
    is_platform_admin()
    OR role_in_org(org_id) IN ('owner', 'admin')
    OR lower(email) = lower((SELECT email FROM auth.users WHERE id = auth.uid()))
  )
  WITH CHECK (
    is_platform_admin()
    OR role_in_org(org_id) IN ('owner', 'admin')
    OR lower(email) = lower((SELECT email FROM auth.users WHERE id = auth.uid()))
  );

-- DELETE: the invite creator, org owners/admins, platform admins.
CREATE POLICY "organization_invites_delete_creator_or_admin"
  ON organization_invites FOR DELETE
  TO authenticated
  USING (
    is_platform_admin()
    OR invited_by = auth.uid()
    OR role_in_org(org_id) IN ('owner', 'admin')
  );

-- =============================================================================
-- TABLE: platform_admins
--
-- Tightest access. Only platform admins can see, insert, update, delete.
-- Bootstrapping: the first platform admin must be inserted via service_role
-- (Supabase dashboard SQL editor or backend script) because the policy
-- requires the caller to already be a platform admin. This is the intended
-- security property.
-- =============================================================================

ALTER TABLE platform_admins ENABLE ROW LEVEL SECURITY;

CREATE POLICY "platform_admins_select_self"
  ON platform_admins FOR SELECT
  TO authenticated
  USING (is_platform_admin());

CREATE POLICY "platform_admins_insert_self"
  ON platform_admins FOR INSERT
  TO authenticated
  WITH CHECK (is_platform_admin());

CREATE POLICY "platform_admins_update_self"
  ON platform_admins FOR UPDATE
  TO authenticated
  USING (is_platform_admin())
  WITH CHECK (is_platform_admin());

CREATE POLICY "platform_admins_delete_self"
  ON platform_admins FOR DELETE
  TO authenticated
  USING (is_platform_admin());

COMMIT;
```

- [ ] **Step 2: Run schema-lint**

Run: `npm run migration:schema-lint`
Expected: `Migration schema-lint passed.`

- [ ] **Step 3: Run the test suite (sanity)**

Run: `npm run test:run`
Expected: 142 tests pass (no code changed; the migration doesn't affect tests).

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/00018_enable_rls_on_org_tables.sql
git commit -m "feat: migration 00018 enables RLS on organisation tables + helper functions"
```

---

## Part 2 — Active-org session infrastructure

Three small modules: a cookie helper, an API to switch orgs, an API to list the user's orgs. All pure server-side. No DB changes beyond Part 1.

### Task 2: Active-org cookie helper + tests

**Files:**
- Create: `src/lib/org/active-org.ts`
- Create: `src/__tests__/lib/org/active-org.test.ts`

The helper has three functions:
- `getActiveOrgId()` — server-side only. Reads the cookie. If absent or pointing at an org the user isn't a member of, returns the user's personal org and writes that to the cookie. Throws if no user or no personal org (bug).
- `setActiveOrgCookie(orgId)` — writes the cookie after validating membership.
- `clearActiveOrgCookie()` — used on logout.

Cookie: name `lynx_active_org`, HTTP-only, Secure in production, SameSite=Lax, 30-day max age.

- [ ] **Step 1: Write the failing test file**

```typescript
// src/__tests__/lib/org/active-org.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock next/headers before importing the module under test.
const mockCookieStore = {
  get: vi.fn(),
  set: vi.fn(),
  delete: vi.fn(),
};
vi.mock('next/headers', () => ({
  cookies: vi.fn(async () => mockCookieStore),
}));

import {
  ACTIVE_ORG_COOKIE,
  resolveActiveOrgId,
  isValidOrgForUser,
} from '@/lib/org/active-org';

type MemberRow = { org_id: string };

function mockSupabaseMembershipList(rows: MemberRow[]) {
  const eq = vi.fn().mockResolvedValue({ data: rows, error: null });
  const select = vi.fn().mockReturnValue({ eq });
  const from = vi.fn().mockReturnValue({ select });
  return { from } as unknown as {
    from: ReturnType<typeof vi.fn>;
  };
}

describe('isValidOrgForUser', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns true when the org is one of the user memberships', async () => {
    const client = mockSupabaseMembershipList([
      { org_id: 'org-a' },
      { org_id: 'org-b' },
    ]);
    const valid = await isValidOrgForUser(client as never, 'user-1', 'org-b');
    expect(valid).toBe(true);
  });

  it('returns false when the org is not in the user memberships', async () => {
    const client = mockSupabaseMembershipList([{ org_id: 'org-a' }]);
    const valid = await isValidOrgForUser(client as never, 'user-1', 'org-b');
    expect(valid).toBe(false);
  });

  it('returns false when the user has no memberships', async () => {
    const client = mockSupabaseMembershipList([]);
    const valid = await isValidOrgForUser(client as never, 'user-1', 'org-x');
    expect(valid).toBe(false);
  });
});

describe('resolveActiveOrgId', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns the cookie value when the user is a member of that org', async () => {
    mockCookieStore.get.mockReturnValue({ value: 'org-b' });
    const client = mockSupabaseMembershipList([
      { org_id: 'org-a' },
      { org_id: 'org-b' },
    ]);
    const result = await resolveActiveOrgId(client as never, 'user-1');
    expect(result.orgId).toBe('org-b');
    expect(result.wasReset).toBe(false);
  });

  it('falls back to the first (personal) org if no cookie is set and writes it', async () => {
    mockCookieStore.get.mockReturnValue(undefined);
    const client = mockSupabaseMembershipList([{ org_id: 'org-personal' }]);
    const result = await resolveActiveOrgId(client as never, 'user-1');
    expect(result.orgId).toBe('org-personal');
    expect(result.wasReset).toBe(true);
    expect(mockCookieStore.set).toHaveBeenCalledWith(
      ACTIVE_ORG_COOKIE,
      'org-personal',
      expect.objectContaining({ httpOnly: true, sameSite: 'lax' })
    );
  });

  it('falls back to the first org if the cookie points at an org the user no longer belongs to', async () => {
    mockCookieStore.get.mockReturnValue({ value: 'org-removed' });
    const client = mockSupabaseMembershipList([
      { org_id: 'org-still-member' },
    ]);
    const result = await resolveActiveOrgId(client as never, 'user-1');
    expect(result.orgId).toBe('org-still-member');
    expect(result.wasReset).toBe(true);
  });

  it('throws when the user has no memberships at all', async () => {
    mockCookieStore.get.mockReturnValue(undefined);
    const client = mockSupabaseMembershipList([]);
    await expect(
      resolveActiveOrgId(client as never, 'user-1')
    ).rejects.toThrow(/no organisation/i);
  });
});
```

- [ ] **Step 2: Run tests to verify failure**

Run: `npm run test:run -- src/__tests__/lib/org/active-org.test.ts`
Expected: FAIL — module `@/lib/org/active-org` not found.

- [ ] **Step 3: Write the helper**

Create `src/lib/org/active-org.ts`:

```typescript
import { cookies } from 'next/headers';
import type { SupabaseClient } from '@supabase/supabase-js';

export const ACTIVE_ORG_COOKIE = 'lynx_active_org';
const COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 30; // 30 days

export interface ResolveResult {
  orgId: string;
  /** true if the cookie was absent/invalid and we just wrote a fresh value. */
  wasReset: boolean;
}

/**
 * Returns the active org for the current request.
 *
 * - If the cookie is set AND the user is still a member → return that org.
 * - Otherwise → return the user's first membership (their personal org, in
 *   the Phase 0.C.1 world where everyone has exactly one org) AND write
 *   that value back into the cookie so subsequent requests are stable.
 *
 * Throws if the user has no memberships — this is a bug (the signup trigger
 * should have created a personal org).
 */
export async function resolveActiveOrgId(
  client: SupabaseClient,
  userId: string
): Promise<ResolveResult> {
  const { data: memberships, error } = await client
    .from('organization_members')
    .select('org_id')
    .eq('user_id', userId);

  if (error) {
    throw new Error(
      `Failed to list memberships for user ${userId}: ${error.message}`
    );
  }
  if (!memberships || memberships.length === 0) {
    throw new Error(
      `No organisation found for user ${userId}. Signup trigger may have failed.`
    );
  }

  const membershipIds = memberships.map((m) => m.org_id as string);
  const cookieStore = await cookies();
  const cookieOrg = cookieStore.get(ACTIVE_ORG_COOKIE)?.value;

  if (cookieOrg && membershipIds.includes(cookieOrg)) {
    return { orgId: cookieOrg, wasReset: false };
  }

  // Cookie missing or stale — reset to first membership.
  const fresh = membershipIds[0];
  cookieStore.set(ACTIVE_ORG_COOKIE, fresh, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: COOKIE_MAX_AGE_SECONDS,
    path: '/',
  });
  return { orgId: fresh, wasReset: true };
}

/**
 * Returns true if the target org is one of the user's memberships.
 * Used by /api/org/switch to validate the requested org before setting the
 * cookie.
 */
export async function isValidOrgForUser(
  client: SupabaseClient,
  userId: string,
  targetOrgId: string
): Promise<boolean> {
  const { data: memberships, error } = await client
    .from('organization_members')
    .select('org_id')
    .eq('user_id', userId);

  if (error || !memberships) return false;
  return memberships.some((m) => (m.org_id as string) === targetOrgId);
}

/**
 * Writes the active-org cookie. Assumes the caller has already validated
 * membership via isValidOrgForUser.
 */
export async function setActiveOrgCookie(orgId: string): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(ACTIVE_ORG_COOKIE, orgId, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: COOKIE_MAX_AGE_SECONDS,
    path: '/',
  });
}

/**
 * Clears the active-org cookie. Called on logout.
 */
export async function clearActiveOrgCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(ACTIVE_ORG_COOKIE);
}
```

- [ ] **Step 4: Run tests to verify pass**

Run: `npm run test:run -- src/__tests__/lib/org/active-org.test.ts`
Expected: 7 tests pass.

- [ ] **Step 5: Run full suite**

Run: `npm run test:run`
Expected: 149 tests pass (142 existing + 7 new).

- [ ] **Step 6: Typecheck**

Run: `npm run type-check`
Expected: exit 0.

- [ ] **Step 7: Commit**

```bash
git add src/lib/org/active-org.ts src/__tests__/lib/org/active-org.test.ts
git commit -m "feat: add active-org cookie helpers with unit tests"
```

---

### Task 3: `GET /api/org` — list my orgs

**Files:**
- Create: `src/app/api/org/route.ts`

Returns the authenticated user's orgs as `OrganizationSummary[]` (id, name, slug, role, plan). Used by the org switcher dropdown.

- [ ] **Step 1: Create the route handler**

```typescript
// src/app/api/org/route.ts
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import type { OrganizationSummary } from '@/types/organization';

export async function GET() {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Join organization_members -> organizations for the current user.
  const { data, error } = await supabase
    .from('organization_members')
    .select(
      'role, organizations!inner(id, name, slug, plan)'
    )
    .eq('user_id', user.id);

  if (error) {
    return NextResponse.json(
      { error: 'Failed to load organisations' },
      { status: 500 }
    );
  }

  type Row = {
    role: OrganizationSummary['role'];
    organizations: {
      id: string;
      name: string;
      slug: string;
      plan: OrganizationSummary['plan'];
    };
  };

  const orgs: OrganizationSummary[] = ((data ?? []) as unknown as Row[]).map(
    (r) => ({
      id: r.organizations.id,
      name: r.organizations.name,
      slug: r.organizations.slug,
      role: r.role,
      plan: r.organizations.plan,
    })
  );

  return NextResponse.json({ orgs });
}
```

- [ ] **Step 2: Typecheck**

Run: `npm run type-check`
Expected: exit 0. If the Supabase embedded-resource type inference doesn't line up, the `as unknown as Row[]` cast handles it — that's why it's there.

- [ ] **Step 3: Run the suite**

Run: `npm run test:run`
Expected: 149 tests pass.

- [ ] **Step 4: Commit**

```bash
git add src/app/api/org/route.ts
git commit -m "feat: add GET /api/org endpoint returning user's organisations"
```

---

### Task 4: Zod schema for org-switch POST body + tests

**Files:**
- Create: `src/validations/org-switch.ts`
- Create: `src/__tests__/validations/org-switch.test.ts`

- [ ] **Step 1: Write the failing tests**

```typescript
// src/__tests__/validations/org-switch.test.ts
import { describe, it, expect } from 'vitest';
import { orgSwitchSchema } from '@/validations/org-switch';

describe('orgSwitchSchema', () => {
  it('accepts a valid UUID orgId', () => {
    const result = orgSwitchSchema.safeParse({
      orgId: '550e8400-e29b-41d4-a716-446655440000',
    });
    expect(result.success).toBe(true);
  });

  it('rejects missing orgId', () => {
    expect(orgSwitchSchema.safeParse({}).success).toBe(false);
  });

  it('rejects a non-UUID orgId', () => {
    expect(orgSwitchSchema.safeParse({ orgId: 'not-a-uuid' }).success).toBe(false);
  });

  it('rejects an empty orgId', () => {
    expect(orgSwitchSchema.safeParse({ orgId: '' }).success).toBe(false);
  });
});
```

- [ ] **Step 2: Run tests — expect fail**

Run: `npm run test:run -- src/__tests__/validations/org-switch.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the schema**

```typescript
// src/validations/org-switch.ts
import { z } from 'zod';

export const orgSwitchSchema = z.object({
  orgId: z.string().uuid(),
});
export type OrgSwitchInput = z.infer<typeof orgSwitchSchema>;
```

- [ ] **Step 4: Run tests — expect pass**

Run: `npm run test:run -- src/__tests__/validations/org-switch.test.ts`
Expected: 4 tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/validations/org-switch.ts src/__tests__/validations/org-switch.test.ts
git commit -m "feat: add orgSwitchSchema Zod validation"
```

---

### Task 5: `POST /api/org/switch` endpoint

**Files:**
- Create: `src/app/api/org/switch/route.ts`
- Create: `src/__tests__/app/api/org/switch.test.ts`

Validates auth → validates body shape → validates the target orgId is one of the user's memberships → writes the cookie → returns success. Rejects with 400/403 otherwise.

- [ ] **Step 1: Write the failing tests**

```typescript
// src/__tests__/app/api/org/switch.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockCookieStore = {
  get: vi.fn(),
  set: vi.fn(),
  delete: vi.fn(),
};
vi.mock('next/headers', () => ({
  cookies: vi.fn(async () => mockCookieStore),
}));

// Mock the supabase server client factory.
const mockSupabase = {
  auth: { getUser: vi.fn() },
  from: vi.fn(),
};
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(async () => mockSupabase),
}));

import { POST } from '@/app/api/org/switch/route';

function makeRequest(body: unknown) {
  return new Request('http://localhost:3000/api/org/switch', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

function mockMemberships(rows: { org_id: string }[]) {
  const eq = vi.fn().mockResolvedValue({ data: rows, error: null });
  const select = vi.fn().mockReturnValue({ eq });
  mockSupabase.from.mockReturnValue({ select });
}

describe('POST /api/org/switch', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 when unauthenticated', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: null },
      error: null,
    });
    const res = await POST(makeRequest({ orgId: '550e8400-e29b-41d4-a716-446655440000' }));
    expect(res.status).toBe(401);
  });

  it('returns 400 on invalid body shape', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: 'u1' } },
      error: null,
    });
    const res = await POST(makeRequest({ orgId: 'not-a-uuid' }));
    expect(res.status).toBe(400);
  });

  it('returns 403 when the user is not a member of the target org', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: 'u1' } },
      error: null,
    });
    mockMemberships([{ org_id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa' }]);
    const res = await POST(
      makeRequest({ orgId: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb' })
    );
    expect(res.status).toBe(403);
  });

  it('sets the cookie and returns 200 when the user is a member', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: 'u1' } },
      error: null,
    });
    const orgId = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
    mockMemberships([{ org_id: orgId }]);

    const res = await POST(makeRequest({ orgId }));
    expect(res.status).toBe(200);
    expect(mockCookieStore.set).toHaveBeenCalledWith(
      'lynx_active_org',
      orgId,
      expect.objectContaining({ httpOnly: true })
    );
  });
});
```

- [ ] **Step 2: Run tests — expect fail**

Run: `npm run test:run -- src/__tests__/app/api/org/switch.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the route handler**

```typescript
// src/app/api/org/switch/route.ts
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { orgSwitchSchema } from '@/validations/org-switch';
import {
  isValidOrgForUser,
  setActiveOrgCookie,
} from '@/lib/org/active-org';

export async function POST(request: Request) {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let parsedBody: unknown;
  try {
    parsedBody = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const parse = orgSwitchSchema.safeParse(parsedBody);
  if (!parse.success) {
    return NextResponse.json(
      { error: 'Invalid body', details: parse.error.flatten() },
      { status: 400 }
    );
  }

  const { orgId } = parse.data;

  const valid = await isValidOrgForUser(supabase, user.id, orgId);
  if (!valid) {
    return NextResponse.json(
      { error: 'Not a member of that organisation' },
      { status: 403 }
    );
  }

  await setActiveOrgCookie(orgId);
  return NextResponse.json({ ok: true, orgId });
}
```

- [ ] **Step 4: Run tests — expect pass**

Run: `npm run test:run -- src/__tests__/app/api/org/switch.test.ts`
Expected: 4 tests pass.

- [ ] **Step 5: Run full suite**

Run: `npm run test:run`
Expected: 153 tests pass (149 + 4 new).

- [ ] **Step 6: Typecheck**

Run: `npm run type-check`
Expected: exit 0.

- [ ] **Step 7: Commit**

```bash
git add src/app/api/org/switch/route.ts src/__tests__/app/api/org/switch.test.ts
git commit -m "feat: add POST /api/org/switch endpoint with membership validation"
```

---

## Part 3 — UI

### Task 6: Org switcher component

**Files:**
- Create: `src/components/org/org-switcher.tsx`

A client component that fetches `/api/org`, shows the currently-active org, and lets the user switch. Styled to match the existing sidebar.

In Phase 0.C.1, everyone has exactly one org so the dropdown has one item. This is deliberate — the switcher is shipped ready for the invite flow to introduce second memberships.

- [ ] **Step 1: Read the existing sidebar to understand styling conventions**

Read `src/components/layout/app-sidebar.tsx` to see how existing nav items are styled (Tailwind classes, icons, typography).

- [ ] **Step 2: Create the component**

```typescript
// src/components/org/org-switcher.tsx
'use client';

import { useEffect, useState } from 'react';
import type { OrganizationSummary } from '@/types/organization';

interface ApiResponse {
  orgs: OrganizationSummary[];
}

export function OrgSwitcher() {
  const [orgs, setOrgs] = useState<OrganizationSummary[] | null>(null);
  const [activeOrgId, setActiveOrgId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/org', { credentials: 'same-origin' })
      .then((r) => r.json() as Promise<ApiResponse>)
      .then((data) => {
        if (cancelled) return;
        setOrgs(data.orgs ?? []);
        // The server resolves active-org from the cookie; on the client we
        // just default to the first entry for display until we switch.
        setActiveOrgId(data.orgs?.[0]?.id ?? null);
      })
      .catch(() => {
        if (!cancelled) setError('Failed to load organisations');
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleSwitch(orgId: string) {
    if (orgId === activeOrgId) {
      setOpen(false);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/org/switch', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ orgId }),
      });
      if (!res.ok) {
        setError('Switch failed');
      } else {
        setActiveOrgId(orgId);
        // A full reload ensures all server components re-render with the
        // new active-org cookie in effect.
        window.location.reload();
      }
    } catch {
      setError('Switch failed');
    } finally {
      setBusy(false);
      setOpen(false);
    }
  }

  if (!orgs) {
    return (
      <div className="px-3 py-2 text-sm text-gray-500" aria-label="Loading organisation">
        Loading…
      </div>
    );
  }

  const active = orgs.find((o) => o.id === activeOrgId) ?? orgs[0];
  if (!active) {
    return (
      <div className="px-3 py-2 text-sm text-red-600">
        No organisation available.
      </div>
    );
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        disabled={busy}
        className="w-full flex items-center justify-between px-3 py-2 text-sm font-medium rounded-md bg-gray-100 hover:bg-gray-200 disabled:opacity-50"
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className="truncate">{active.name}</span>
        <span className="ml-2 text-xs text-gray-500">
          {active.role}
          {active.plan === 'pro' ? ' · Pro' : ''}
        </span>
      </button>
      {open && orgs.length > 1 && (
        <ul
          role="listbox"
          className="absolute left-0 right-0 mt-1 z-10 bg-white border border-gray-200 rounded-md shadow-md text-sm"
        >
          {orgs.map((o) => (
            <li key={o.id}>
              <button
                type="button"
                onClick={() => handleSwitch(o.id)}
                className={
                  'w-full text-left px-3 py-2 hover:bg-gray-50 ' +
                  (o.id === activeOrgId ? 'font-semibold text-blue-700' : '')
                }
              >
                <span className="truncate block">{o.name}</span>
                <span className="text-xs text-gray-500">
                  {o.role}
                  {o.plan === 'pro' ? ' · Pro' : ''}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
      {error && (
        <p className="mt-1 px-3 text-xs text-red-600" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Typecheck**

Run: `npm run type-check`
Expected: exit 0.

- [ ] **Step 4: Commit**

```bash
git add src/components/org/org-switcher.tsx
git commit -m "feat: add OrgSwitcher component"
```

---

### Task 7: Mount OrgSwitcher in the sidebar

**Files:**
- Modify: `src/components/layout/app-sidebar.tsx`

- [ ] **Step 1: Read the current sidebar**

Read `src/components/layout/app-sidebar.tsx` fully. Identify a natural insertion point for the switcher — ideally just below the logo/header block and above the primary nav links. The component should render on all dashboard pages.

- [ ] **Step 2: Add the import**

At the top of the file, alongside existing imports:

```typescript
import { OrgSwitcher } from '@/components/org/org-switcher';
```

- [ ] **Step 3: Mount the component**

Insert `<OrgSwitcher />` in the JSX at the chosen insertion point (typically inside the sidebar container, near the top, padded to match existing content). Keep the surrounding markup intact.

- [ ] **Step 4: Typecheck**

Run: `npm run type-check`
Expected: exit 0.

- [ ] **Step 5: Run the suite**

Run: `npm run test:run`
Expected: 153 tests pass (nothing broken — the switcher renders in a client component that isn't tested by the unit suite).

- [ ] **Step 6: Commit**

```bash
git add src/components/layout/app-sidebar.tsx
git commit -m "feat: mount OrgSwitcher in the app sidebar"
```

---

## Part 4 — Middleware integration

### Task 8: Seed the active-org cookie on `/app/*` requests

**Files:**
- Modify: `src/middleware.ts`

The middleware already checks auth for `/app/*`. We add: after confirming the user is authenticated, call `resolveActiveOrgId` so the cookie is seeded on the very first request after signup. This avoids a race where a server component tries to read the cookie before the user has ever interacted with the switcher.

Important: the middleware runs in the Edge Runtime, and `resolveActiveOrgId` from `src/lib/org/active-org.ts` uses `cookies()` from `next/headers`. Inside middleware we have to use `request.cookies` and `response.cookies` directly, not `cookies()`. So we add a second resolver specifically for middleware use.

- [ ] **Step 1: Read the current middleware**

Read `src/middleware.ts` fully. Find the block that handles `/app/*` — specifically where `supabase.auth.getUser()` is called and the user is either allowed through or redirected to `/auth/login`.

- [ ] **Step 2: Add a middleware-specific active-org helper**

Add this to `src/lib/org/active-org.ts` (append after the existing exports):

```typescript
// At the top of the file, add:
import type { NextRequest, NextResponse as NextResponseType } from 'next/server';

// ... existing code ...

// Append at the end of the file:

/**
 * Middleware-safe variant of resolveActiveOrgId. Uses request/response
 * cookies directly because `cookies()` from next/headers is not available
 * in the Edge runtime middleware.
 */
export async function resolveActiveOrgIdForMiddleware(
  client: SupabaseClient,
  userId: string,
  request: NextRequest,
  response: NextResponseType
): Promise<ResolveResult> {
  const { data: memberships, error } = await client
    .from('organization_members')
    .select('org_id')
    .eq('user_id', userId);

  if (error || !memberships || memberships.length === 0) {
    // Don't throw from middleware; let the request proceed and the route
    // handler will surface the error cleanly if needed.
    return { orgId: '', wasReset: false };
  }

  const membershipIds = memberships.map((m) => m.org_id as string);
  const cookieOrg = request.cookies.get(ACTIVE_ORG_COOKIE)?.value;

  if (cookieOrg && membershipIds.includes(cookieOrg)) {
    return { orgId: cookieOrg, wasReset: false };
  }

  const fresh = membershipIds[0];
  response.cookies.set(ACTIVE_ORG_COOKIE, fresh, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: COOKIE_MAX_AGE_SECONDS,
    path: '/',
  });
  return { orgId: fresh, wasReset: true };
}
```

Note the new imports at the top — adjust existing imports if they conflict. The `COOKIE_MAX_AGE_SECONDS` const already exists in the file.

- [ ] **Step 3: Call the middleware helper from `src/middleware.ts`**

Inside the existing authenticated branch of the middleware (where `user` is known to exist and the request path starts with `/app/`), add:

```typescript
// Seed the active-org cookie on first authenticated request.
await resolveActiveOrgIdForMiddleware(supabase, user.id, request, response);
```

Add the import alongside existing ones:

```typescript
import { resolveActiveOrgIdForMiddleware } from '@/lib/org/active-org';
```

If `supabase` isn't already created at the point where you insert this, move it up. The existing middleware already calls `supabase.auth.getUser()`, so the client is already in scope — just call the helper right after that.

- [ ] **Step 4: Typecheck**

Run: `npm run type-check`
Expected: exit 0.

- [ ] **Step 5: Run the suite**

Run: `npm run test:run`
Expected: 153 tests pass (the middleware isn't unit tested; the active-org helper still is).

- [ ] **Step 6: Manual smoke test**

Start the dev server: `npm run dev`

- Log in to the app (any existing account).
- Open DevTools → Application → Cookies → `localhost:3000` (or whatever your dev URL is).
- Confirm `lynx_active_org` cookie is set, HTTP-only, with a UUID value.
- Refresh a couple of dashboard pages — cookie value should remain stable.

- [ ] **Step 7: Commit**

```bash
git add src/lib/org/active-org.ts src/middleware.ts
git commit -m "feat: seed active-org cookie in middleware for /app/* requests"
```

---

## Part 5 — Runbook + manual operator task

### Task 9: Append Phase 0.C.1 section to the runbook

**Files:**
- Modify: `docs/superpowers/runbooks/phase-0-migration.md`

- [ ] **Step 1: Read current runbook**

Confirm the file currently ends with the Phase 0.B completion log.

- [ ] **Step 2: Append the Phase 0.C.1 section**

Append:

```markdown

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
```

- [ ] **Step 3: Commit**

```bash
git add docs/superpowers/runbooks/phase-0-migration.md
git commit -m "docs: add Phase 0.C.1 section to migration runbook"
```

---

### Task 10 (MANUAL): Apply migration 00018 to production + deploy app

Executed by the primary operator. Not a subagent task.

**Do not execute until:**
- All previous tasks merged to `main`.
- Pre-flight checklist in the runbook's Phase 0.C.1 section is checked off.
- A platform admin row has been inserted (see pre-flight checklist).

- [ ] **Step 1: Work through the Phase 0.C.1 Execution checklist in the runbook**

- [ ] **Step 2: Deploy the app**

Merge the branch → Vercel deploys automatically → verify in production via smoke test.

- [ ] **Step 3: Append a Production entry to the Phase 0.C.1 completion log**

- [ ] **Step 4: Commit the runbook update**

```bash
git add docs/superpowers/runbooks/phase-0-migration.md
git commit -m "docs: log Phase 0.C.1 production result"
```

---

## Completion criteria

Phase 0.C.1 is complete when:

1. Migration 00018 applied to production; RLS is enabled on all four organisation tables with expected policies.
2. At least one platform admin row exists in production.
3. The app is deployed with the org switcher visible in the sidebar and the active-org cookie being set on authenticated `/app/*` requests.
4. Known-good production QRs still 307-redirect.
5. Test suite passes on the tip (153 tests).
6. Runbook completion log has a Production entry.

At this point, **Phase 0.C.2 (RLS rewrite on data tables + NOT NULL tightening)** becomes the next plan. Until 0.C.2 ships, data-table RLS is still owner-scoped — the invite flow still can't meaningfully share data between members of an org. That's expected; 0.C.1 is the prerequisite, 0.C.2 is the activation.
