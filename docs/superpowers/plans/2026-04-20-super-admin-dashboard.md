# Super-Admin Dashboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the `/admin` super-admin area — a platform-admin-gated dashboard with step-up auth, an audit log, organisation/user directories, and a read-only "view-as" preview for customer support. This is the infrastructure layer that the future shopfront plan will bolt product management and order fulfilment onto.

**Architecture:** Separate route group `src/app/admin/*` guarded at the middleware layer by a `platform_admins` row check AND a short-lived admin session cookie (`lynx_admin_session`, 30-min idle timeout, refreshed on activity). The admin session is established via `/admin/login` which re-prompts for password even when the main app session is live — this is the step-up auth required by the spec. All admin pages render with the service-role admin Supabase client so they can read across orgs (platform admins legitimately need this). Admin write actions (in this plan: only the session POST and audit log inserts) are logged to a new `platform_audit_log` table via a helper. "View-as" is implemented as a **read-only preview page** that renders the target org's data using the admin client — no cookie swap, no impersonation session. This keeps the security model simple: there is no "acting as another user" path, only "super-admin reading their data for support."

**Tech Stack:** Next.js 16 App Router, TypeScript, Supabase (server + admin clients), Vitest, Zod, Tailwind CSS. No new dependencies.

**Prerequisites (must be true before starting):**
- Phase 0 foundation complete through 0.C.2 in production. `platform_admins` table exists with at least one row (tom@onesignanddigital.com was seeded in Phase 0.C.1).
- Invite flow live (from the previous plan) — not strictly required for this plan, but confirms the Phase 0 foundation is hardened.

**Scope boundary:**
- ✅ **In scope:** migration 00023 (`platform_audit_log` table + RLS), `src/lib/admin/*` helpers (platform admin gate, audit log, admin session cookie), middleware gate for `/admin/*`, `/admin/login` step-up auth page + API, `/admin` home (platform KPIs), `/admin/orgs` list + detail, `/admin/orgs/[id]/preview` read-only view-as, `/admin/users` list + detail, `/admin/audit` log view, runbook section.
- ❌ **Out of scope — reserved for the Shopfront plan:** product catalog CRUD, orders management, fulfilment kanban, Stripe integration.
- ❌ **Deliberately deferred:** feature flags / config screen (no features to flag yet), user impersonation beyond read-only preview (security cost too high for current support volume), per-tenant billing views (Stripe-dependent).

**Reference spec:** `docs/superpowers/specs/2026-04-17-onesign-lynx-h1-h2-design.md` — Section 4.4 (Super-admin dashboard).

---

## File structure

**Created:**
- `supabase/migrations/00023_platform_audit_log.sql` — new table + RLS (super-admins read/write all; no one else sees anything).
- `src/types/platform-admin.ts` — `AuditLogRecord` and related types.
- `src/lib/admin/is-platform-admin.ts` — server-side helper: given a user id, returns bool. Reads from `platform_admins` via the admin Supabase client so RLS on `platform_admins` doesn't interfere.
- `src/__tests__/lib/admin/is-platform-admin.test.ts` — unit tests.
- `src/lib/admin/audit.ts` — `logAdminAction(action, targetType, targetId, metadata)` helper that inserts a row into `platform_audit_log`.
- `src/__tests__/lib/admin/audit.test.ts` — unit tests.
- `src/lib/admin/admin-session.ts` — cookie helpers: `setAdminSession()`, `clearAdminSession()`, `isAdminSessionActive()`. Cookie is HMAC-signed with a server secret (env var `ADMIN_SESSION_SECRET`) so the client can't forge it.
- `src/__tests__/lib/admin/admin-session.test.ts` — unit tests.
- `src/validations/admin.ts` — Zod schema for the login POST body.
- `src/app/api/admin/session/route.ts` — POST (validate password, issue admin session cookie) and DELETE (clear).
- `src/__tests__/app/api/admin/session.test.ts` — unit tests.
- `src/app/admin/layout.tsx` — server layout that does the double gate (auth user + platform_admin row + admin session cookie) and renders a thin admin chrome (logo + nav + logout).
- `src/app/admin/login/page.tsx` — step-up login form (client component).
- `src/app/admin/page.tsx` — admin home (KPI tiles: total orgs, total users, orgs created this week, bio pages, QR codes, form submissions in the last 7 days).
- `src/app/admin/orgs/page.tsx` — list view.
- `src/app/admin/orgs/[id]/page.tsx` — detail view (name, plan, members, pages, QRs).
- `src/app/admin/orgs/[id]/preview/page.tsx` — read-only "view-as" — renders the org's bio pages and QRs using the admin client, with an "AS ADMIN — READ ONLY" banner.
- `src/app/admin/users/page.tsx` — list view.
- `src/app/admin/users/[id]/page.tsx` — detail view (email, orgs, last seen).
- `src/app/admin/audit/page.tsx` — audit log view.
- `src/components/admin/admin-nav.tsx` — top nav used by the admin layout.
- `src/components/admin/view-as-banner.tsx` — red banner shown on the preview page.

**Modified:**
- `src/middleware.ts` — add `/admin/*` branch: require authenticated user AND platform_admin row AND valid admin session cookie, else redirect to `/admin/login`.
- `docs/superpowers/runbooks/phase-0-migration.md` — append super-admin deploy section (env var `ADMIN_SESSION_SECRET` required; migration 00023 apply).

**Not touched:**
- Existing `/app/*` routes, API routes, or UI.
- RLS on any existing table.

---

## Part 1 — Database and helpers

### Task 1: Migration 00023 (platform_audit_log)

**Files:**
- Create: `supabase/migrations/00023_platform_audit_log.sql`

New table recording every super-admin action. RLS: only platform admins can read or write. The existing `is_platform_admin()` helper (from 0.C.1 migration 00018) is reused.

- [ ] **Step 1: Create the migration file**

```sql
-- Migration: platform_audit_log — every super-admin action logged
--
-- Records who (platform_admin user_id), what (action string + target),
-- when (created_at), and any action-specific metadata (JSON). Read/write
-- restricted to platform admins via RLS using the existing
-- is_platform_admin() helper from 00018.

BEGIN;

CREATE TABLE IF NOT EXISTS platform_audit_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  actor_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  target_type TEXT,
  target_id TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_platform_audit_log_created
  ON platform_audit_log(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_platform_audit_log_actor
  ON platform_audit_log(actor_user_id, created_at DESC);

ALTER TABLE platform_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "platform_audit_log_select_platform_admin"
  ON platform_audit_log FOR SELECT
  TO authenticated
  USING (is_platform_admin());

CREATE POLICY "platform_audit_log_insert_platform_admin"
  ON platform_audit_log FOR INSERT
  TO authenticated
  WITH CHECK (is_platform_admin());

-- No UPDATE or DELETE policies — audit log is append-only by design.

COMMIT;
```

- [ ] **Step 2: Run schema-lint**

Run: `npm run migration:schema-lint`
Expected: `Migration schema-lint passed.`

- [ ] **Step 3: Run tests**

Run: `npm run test:run`
Expected: 191 tests pass.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/00023_platform_audit_log.sql
git commit -m "feat: migration 00023 adds platform_audit_log table"
```

---

### Task 2: TypeScript types for audit log

**Files:**
- Create: `src/types/platform-admin.ts`

- [ ] **Step 1: Create the types file**

```typescript
// src/types/platform-admin.ts

export interface AuditLogRecord {
  id: string;
  actor_user_id: string;
  action: string;
  target_type: string | null;
  target_id: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

export interface PlatformKpis {
  total_orgs: number;
  total_users: number;
  orgs_created_this_week: number;
  total_bio_pages: number;
  total_qr_codes: number;
  form_submissions_last_7d: number;
}
```

- [ ] **Step 2: Typecheck**

Run: `npm run type-check`
Expected: clean.

- [ ] **Step 3: Commit**

```bash
git add src/types/platform-admin.ts
git commit -m "feat: add platform admin types"
```

---

### Task 3: isPlatformAdmin helper with TDD

**Files:**
- Create: `src/lib/admin/is-platform-admin.ts`
- Create: `src/__tests__/lib/admin/is-platform-admin.test.ts`

Server-side helper. Takes a user id. Queries `platform_admins` via admin client (service role) to bypass RLS — we need to be able to check this before RLS has granted anything.

- [ ] **Step 1: Write failing tests**

```typescript
// src/__tests__/lib/admin/is-platform-admin.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockAdmin = { from: vi.fn() };
vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: vi.fn(() => mockAdmin),
}));

import { isPlatformAdmin } from '@/lib/admin/is-platform-admin';

function mockResult(data: { user_id: string } | null) {
  const maybeSingle = vi.fn().mockResolvedValue({
    data,
    error: null,
  });
  const eq = vi.fn().mockReturnValue({ maybeSingle });
  const select = vi.fn().mockReturnValue({ eq });
  mockAdmin.from.mockReturnValue({ select });
}

describe('isPlatformAdmin', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns true when platform_admins row exists', async () => {
    mockResult({ user_id: 'u1' });
    expect(await isPlatformAdmin('u1')).toBe(true);
  });

  it('returns false when no row matches', async () => {
    mockResult(null);
    expect(await isPlatformAdmin('u1')).toBe(false);
  });

  it('returns false for empty user id (defensive)', async () => {
    expect(await isPlatformAdmin('')).toBe(false);
    expect(mockAdmin.from).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run — expect FAIL**

Run: `npm run test:run -- src/__tests__/lib/admin/is-platform-admin.test.ts`
Expected: module not found.

- [ ] **Step 3: Write the helper**

```typescript
// src/lib/admin/is-platform-admin.ts
import { createAdminClient } from '@/lib/supabase/admin';

/**
 * Returns true if the user has a platform_admins row.
 *
 * Uses the admin (service-role) Supabase client so the check bypasses RLS
 * on platform_admins — needed because the check happens in middleware and
 * admin routes before the user's auth context is relevant for authz.
 */
export async function isPlatformAdmin(userId: string): Promise<boolean> {
  if (!userId) return false;

  const admin = createAdminClient();
  const { data, error } = await admin
    .from('platform_admins')
    .select('user_id')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    console.error('[isPlatformAdmin] lookup failed', error);
    return false;
  }
  return data !== null;
}
```

- [ ] **Step 4: Run tests — expect PASS**

Run: `npm run test:run -- src/__tests__/lib/admin/is-platform-admin.test.ts`
Expected: 3 tests pass.

- [ ] **Step 5: Full suite + typecheck**

```
npm run test:run
npm run type-check
```
Expected: 194 tests pass.

- [ ] **Step 6: Commit**

```bash
git add src/lib/admin/is-platform-admin.ts src/__tests__/lib/admin/is-platform-admin.test.ts
git commit -m "feat: add isPlatformAdmin helper"
```

---

### Task 4: logAdminAction helper with TDD

**Files:**
- Create: `src/lib/admin/audit.ts`
- Create: `src/__tests__/lib/admin/audit.test.ts`

Inserts a row into `platform_audit_log` via the admin client.

- [ ] **Step 1: Write failing tests**

```typescript
// src/__tests__/lib/admin/audit.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockAdmin = { from: vi.fn() };
vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: vi.fn(() => mockAdmin),
}));

import { logAdminAction } from '@/lib/admin/audit';

describe('logAdminAction', () => {
  beforeEach(() => vi.clearAllMocks());

  it('inserts a row with all fields populated', async () => {
    const insert = vi.fn().mockResolvedValue({ error: null });
    mockAdmin.from.mockReturnValue({ insert });

    await logAdminAction({
      actorUserId: 'u1',
      action: 'view_org',
      targetType: 'organization',
      targetId: 'org-1',
      metadata: { reason: 'support' },
    });

    expect(mockAdmin.from).toHaveBeenCalledWith('platform_audit_log');
    expect(insert).toHaveBeenCalledWith(
      expect.objectContaining({
        actor_user_id: 'u1',
        action: 'view_org',
        target_type: 'organization',
        target_id: 'org-1',
        metadata: { reason: 'support' },
      })
    );
  });

  it('permits optional fields to be null/absent', async () => {
    const insert = vi.fn().mockResolvedValue({ error: null });
    mockAdmin.from.mockReturnValue({ insert });

    await logAdminAction({
      actorUserId: 'u1',
      action: 'heartbeat',
    });

    expect(insert).toHaveBeenCalledWith(
      expect.objectContaining({
        actor_user_id: 'u1',
        action: 'heartbeat',
        target_type: null,
        target_id: null,
        metadata: null,
      })
    );
  });

  it('does not throw on insert error — logs instead', async () => {
    const insert = vi.fn().mockResolvedValue({
      error: { message: 'boom' },
    });
    mockAdmin.from.mockReturnValue({ insert });

    await expect(
      logAdminAction({ actorUserId: 'u1', action: 'test' })
    ).resolves.not.toThrow();
  });
});
```

- [ ] **Step 2: Run — expect FAIL**

Run: `npm run test:run -- src/__tests__/lib/admin/audit.test.ts`
Expected: module not found.

- [ ] **Step 3: Write the helper**

```typescript
// src/lib/admin/audit.ts
import { createAdminClient } from '@/lib/supabase/admin';

export interface LogAdminActionArgs {
  actorUserId: string;
  action: string;
  targetType?: string;
  targetId?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Appends a row to platform_audit_log. Failures are logged but not thrown —
 * an admin action must never be blocked by an audit-write failure.
 */
export async function logAdminAction(args: LogAdminActionArgs): Promise<void> {
  const admin = createAdminClient();
  const { error } = await admin.from('platform_audit_log').insert({
    actor_user_id: args.actorUserId,
    action: args.action,
    target_type: args.targetType ?? null,
    target_id: args.targetId ?? null,
    metadata: args.metadata ?? null,
  });
  if (error) {
    console.error('[logAdminAction] insert failed', error);
  }
}
```

- [ ] **Step 4: Run tests — expect PASS**

Run: `npm run test:run -- src/__tests__/lib/admin/audit.test.ts`
Expected: 3 tests pass.

- [ ] **Step 5: Full suite + typecheck**

```
npm run test:run
npm run type-check
```
Expected: 197 tests pass.

- [ ] **Step 6: Commit**

```bash
git add src/lib/admin/audit.ts src/__tests__/lib/admin/audit.test.ts
git commit -m "feat: add logAdminAction audit helper"
```

---

## Part 2 — Admin session (step-up auth)

### Task 5: Admin session cookie with HMAC signing

**Files:**
- Create: `src/lib/admin/admin-session.ts`
- Create: `src/__tests__/lib/admin/admin-session.test.ts`

Cookie name: `lynx_admin_session`. Value: `<user_id>.<issued_at>.<hmac>`. The HMAC is computed over `<user_id>.<issued_at>` using a server secret (`ADMIN_SESSION_SECRET` env var). On read, we recompute the HMAC and reject if it doesn't match. We also reject if `now() - issued_at > IDLE_TIMEOUT_MS`. No database storage — the cookie is self-contained and self-verifying, which is fine for a short-lived session bound to a user id that we'll also re-validate against `platform_admins` on every request.

Idle timeout: 30 minutes. Refreshed on every successful admin-layout render (write a new cookie with updated `issued_at`).

Uses Web Crypto `SubtleCrypto` for HMAC-SHA256, which is available in both Node and Edge runtimes.

- [ ] **Step 1: Write failing tests**

```typescript
// src/__tests__/lib/admin/admin-session.test.ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const mockCookieStore = {
  get: vi.fn(),
  set: vi.fn(),
  delete: vi.fn(),
};
vi.mock('next/headers', () => ({
  cookies: vi.fn(async () => mockCookieStore),
}));

import {
  ADMIN_SESSION_COOKIE,
  ADMIN_SESSION_IDLE_MS,
  setAdminSession,
  clearAdminSession,
  verifyAdminSessionCookie,
} from '@/lib/admin/admin-session';

describe('admin session cookie', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.ADMIN_SESSION_SECRET = 'test-secret-at-least-32-characters-long-1';
  });

  afterEach(() => {
    delete process.env.ADMIN_SESSION_SECRET;
  });

  it('ADMIN_SESSION_IDLE_MS is 30 minutes', () => {
    expect(ADMIN_SESSION_IDLE_MS).toBe(30 * 60 * 1000);
  });

  it('setAdminSession writes a signed cookie with HttpOnly/SameSite=Lax', async () => {
    await setAdminSession('user-1');
    expect(mockCookieStore.set).toHaveBeenCalledTimes(1);
    const [name, value, opts] = mockCookieStore.set.mock.calls[0] as [
      string,
      string,
      Record<string, unknown>,
    ];
    expect(name).toBe(ADMIN_SESSION_COOKIE);
    expect(value.split('.').length).toBe(3);
    expect(value.startsWith('user-1.')).toBe(true);
    expect(opts.httpOnly).toBe(true);
    expect(opts.sameSite).toBe('lax');
  });

  it('verifyAdminSessionCookie returns the user id for a fresh valid cookie', async () => {
    await setAdminSession('user-1');
    const cookieValue = (
      mockCookieStore.set.mock.calls[0] as unknown as [string, string]
    )[1];
    const result = await verifyAdminSessionCookie(cookieValue);
    expect(result).toEqual({ valid: true, userId: 'user-1' });
  });

  it('verifyAdminSessionCookie rejects a tampered cookie', async () => {
    await setAdminSession('user-1');
    const cookieValue = (
      mockCookieStore.set.mock.calls[0] as unknown as [string, string]
    )[1];
    const tampered = 'user-2' + cookieValue.slice('user-1'.length);
    const result = await verifyAdminSessionCookie(tampered);
    expect(result.valid).toBe(false);
  });

  it('verifyAdminSessionCookie rejects an expired cookie', async () => {
    // Build a cookie with an old issued_at manually.
    const oldIssued = Date.now() - (ADMIN_SESSION_IDLE_MS + 60_000);
    const payload = `user-1.${oldIssued}`;
    // Sign it using the same secret (we imported the helper, so the helper's
    // signature logic is what we mimic — it's okay to reuse the helper for
    // this test because we're testing the expiry check, not the signing.)
    const { signPayload } = await import(
      '@/lib/admin/admin-session'
    );
    const hmac = await signPayload(payload);
    const cookie = `${payload}.${hmac}`;
    const result = await verifyAdminSessionCookie(cookie);
    expect(result.valid).toBe(false);
  });

  it('clearAdminSession deletes the cookie', async () => {
    await clearAdminSession();
    expect(mockCookieStore.delete).toHaveBeenCalledWith(ADMIN_SESSION_COOKIE);
  });

  it('verifyAdminSessionCookie rejects malformed input', async () => {
    const result = await verifyAdminSessionCookie('not.enough');
    expect(result.valid).toBe(false);
  });
});
```

- [ ] **Step 2: Run — expect FAIL**

Run: `npm run test:run -- src/__tests__/lib/admin/admin-session.test.ts`
Expected: module not found.

- [ ] **Step 3: Write the helper**

```typescript
// src/lib/admin/admin-session.ts
import { cookies } from 'next/headers';

export const ADMIN_SESSION_COOKIE = 'lynx_admin_session';
export const ADMIN_SESSION_IDLE_MS = 30 * 60 * 1000;

function getSecret(): string {
  const s = process.env.ADMIN_SESSION_SECRET;
  if (!s || s.length < 32) {
    throw new Error(
      'ADMIN_SESSION_SECRET env var is required and must be at least 32 characters'
    );
  }
  return s;
}

function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  const b64 =
    typeof btoa !== 'undefined'
      ? btoa(binary)
      : Buffer.from(binary, 'binary').toString('base64');
  return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/** HMAC-SHA256 of `payload` using the ADMIN_SESSION_SECRET, base64url encoded. */
export async function signPayload(payload: string): Promise<string> {
  const secret = getSecret();
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(payload));
  return bytesToBase64Url(new Uint8Array(sig));
}

/**
 * Constant-time string compare. Returns true if a and b are equal.
 * Compares length first (acceptable info leak — all our HMACs are the same
 * length so this can't leak anything).
 */
function safeEquals(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

export interface VerifyResult {
  valid: boolean;
  userId?: string;
}

export async function verifyAdminSessionCookie(
  value: string | undefined
): Promise<VerifyResult> {
  if (!value) return { valid: false };
  const parts = value.split('.');
  if (parts.length !== 3) return { valid: false };
  const [userId, issuedAtStr, providedSig] = parts;
  if (!userId || !issuedAtStr || !providedSig) return { valid: false };

  const issuedAt = Number.parseInt(issuedAtStr, 10);
  if (!Number.isFinite(issuedAt)) return { valid: false };
  if (Date.now() - issuedAt > ADMIN_SESSION_IDLE_MS) return { valid: false };

  const payload = `${userId}.${issuedAt}`;
  const expected = await signPayload(payload);
  if (!safeEquals(providedSig, expected)) return { valid: false };
  return { valid: true, userId };
}

export async function setAdminSession(userId: string): Promise<void> {
  const issuedAt = Date.now();
  const payload = `${userId}.${issuedAt}`;
  const sig = await signPayload(payload);
  const cookieValue = `${payload}.${sig}`;

  const cookieStore = await cookies();
  cookieStore.set(ADMIN_SESSION_COOKIE, cookieValue, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: Math.floor(ADMIN_SESSION_IDLE_MS / 1000),
    path: '/',
  });
}

export async function clearAdminSession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(ADMIN_SESSION_COOKIE);
}
```

- [ ] **Step 4: Run tests — expect PASS**

Run: `npm run test:run -- src/__tests__/lib/admin/admin-session.test.ts`
Expected: 7 tests pass.

- [ ] **Step 5: Full suite + typecheck**

```
npm run test:run
npm run type-check
```
Expected: 204 tests pass.

- [ ] **Step 6: Commit**

```bash
git add src/lib/admin/admin-session.ts src/__tests__/lib/admin/admin-session.test.ts
git commit -m "feat: add HMAC-signed admin session cookie helpers"
```

---

### Task 6: Zod schema for admin session POST + POST /api/admin/session

**Files:**
- Create: `src/validations/admin.ts`
- Create: `src/app/api/admin/session/route.ts`
- Create: `src/__tests__/app/api/admin/session.test.ts`

`POST /api/admin/session` — body `{ password }`. Re-authenticates the currently-logged-in user via `supabase.auth.signInWithPassword({ email: user.email, password })`. If that succeeds AND `isPlatformAdmin(user.id)` is true, issue the admin session cookie and log the action. If not, 401/403 and log the failed attempt.

`DELETE /api/admin/session` — clears the admin session cookie.

- [ ] **Step 1: Zod schema**

Create `src/validations/admin.ts`:

```typescript
import { z } from 'zod';

export const adminLoginSchema = z.object({
  password: z.string().min(1).max(200),
});
export type AdminLoginInput = z.infer<typeof adminLoginSchema>;
```

- [ ] **Step 2: Write failing tests for the route**

Create `src/__tests__/app/api/admin/session.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockCookieStore = {
  get: vi.fn(),
  set: vi.fn(),
  delete: vi.fn(),
};
vi.mock('next/headers', () => ({
  cookies: vi.fn(async () => mockCookieStore),
}));

const mockSupabase = {
  auth: {
    getUser: vi.fn(),
    signInWithPassword: vi.fn(),
  },
};
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(async () => mockSupabase),
}));

const mockIsPlatformAdmin = vi.fn();
vi.mock('@/lib/admin/is-platform-admin', () => ({
  isPlatformAdmin: (...args: unknown[]) => mockIsPlatformAdmin(...args),
}));

const mockLogAdminAction = vi.fn();
vi.mock('@/lib/admin/audit', () => ({
  logAdminAction: (...args: unknown[]) => mockLogAdminAction(...args),
}));

const mockSetAdminSession = vi.fn();
const mockClearAdminSession = vi.fn();
vi.mock('@/lib/admin/admin-session', () => ({
  setAdminSession: (...args: unknown[]) => mockSetAdminSession(...args),
  clearAdminSession: (...args: unknown[]) => mockClearAdminSession(...args),
}));

import { POST, DELETE } from '@/app/api/admin/session/route';

function jsonRequest(body: unknown) {
  return new Request('http://localhost:3000/api/admin/session', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('POST /api/admin/session', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 when unauthenticated', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: null },
      error: null,
    });
    const res = await POST(jsonRequest({ password: 'x' }));
    expect(res.status).toBe(401);
  });

  it('returns 400 on invalid body', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: 'u1', email: 'admin@x.com' } },
      error: null,
    });
    const res = await POST(jsonRequest({}));
    expect(res.status).toBe(400);
  });

  it('returns 403 when user is not a platform admin', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: 'u1', email: 'admin@x.com' } },
      error: null,
    });
    mockIsPlatformAdmin.mockResolvedValue(false);
    const res = await POST(jsonRequest({ password: 'pass' }));
    expect(res.status).toBe(403);
  });

  it('returns 401 when password is wrong', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: 'u1', email: 'admin@x.com' } },
      error: null,
    });
    mockIsPlatformAdmin.mockResolvedValue(true);
    mockSupabase.auth.signInWithPassword.mockResolvedValue({
      data: { user: null },
      error: { message: 'Invalid login credentials' },
    });
    const res = await POST(jsonRequest({ password: 'wrong' }));
    expect(res.status).toBe(401);
    expect(mockLogAdminAction).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'admin_session.failed' })
    );
  });

  it('sets admin session cookie and logs on success', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: 'u1', email: 'admin@x.com' } },
      error: null,
    });
    mockIsPlatformAdmin.mockResolvedValue(true);
    mockSupabase.auth.signInWithPassword.mockResolvedValue({
      data: { user: { id: 'u1' } },
      error: null,
    });

    const res = await POST(jsonRequest({ password: 'correct' }));
    expect(res.status).toBe(200);
    expect(mockSetAdminSession).toHaveBeenCalledWith('u1');
    expect(mockLogAdminAction).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'admin_session.created' })
    );
  });
});

describe('DELETE /api/admin/session', () => {
  beforeEach(() => vi.clearAllMocks());

  it('clears the cookie and returns 200', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: 'u1' } },
      error: null,
    });
    const res = await DELETE();
    expect(res.status).toBe(200);
    expect(mockClearAdminSession).toHaveBeenCalled();
  });
});
```

- [ ] **Step 3: Run — expect FAIL**

Run: `npm run test:run -- src/__tests__/app/api/admin/session.test.ts`
Expected: module not found.

- [ ] **Step 4: Write the handler**

```typescript
// src/app/api/admin/session/route.ts
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { adminLoginSchema } from '@/validations/admin';
import { isPlatformAdmin } from '@/lib/admin/is-platform-admin';
import {
  setAdminSession,
  clearAdminSession,
} from '@/lib/admin/admin-session';
import { logAdminAction } from '@/lib/admin/audit';

export async function POST(request: Request) {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const parse = adminLoginSchema.safeParse(body);
  if (!parse.success) {
    return NextResponse.json(
      { error: 'Invalid body' },
      { status: 400 }
    );
  }

  const isAdmin = await isPlatformAdmin(user.id);
  if (!isAdmin) {
    await logAdminAction({
      actorUserId: user.id,
      action: 'admin_session.denied_not_admin',
    });
    return NextResponse.json(
      { error: 'Not a platform admin' },
      { status: 403 }
    );
  }

  // Re-authenticate to confirm step-up — even though the main app session is
  // live, /admin requires password-in-hand. This creates a fresh Supabase
  // session but that's fine — the SSR cookie handler will persist the new
  // access token transparently.
  const { error: signinError } = await supabase.auth.signInWithPassword({
    email: user.email ?? '',
    password: parse.data.password,
  });

  if (signinError) {
    await logAdminAction({
      actorUserId: user.id,
      action: 'admin_session.failed',
      metadata: { reason: signinError.message },
    });
    return NextResponse.json(
      { error: 'Invalid password' },
      { status: 401 }
    );
  }

  await setAdminSession(user.id);
  await logAdminAction({
    actorUserId: user.id,
    action: 'admin_session.created',
  });
  return NextResponse.json({ ok: true });
}

export async function DELETE() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) {
    await logAdminAction({
      actorUserId: user.id,
      action: 'admin_session.cleared',
    });
  }
  await clearAdminSession();
  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 5: Run tests — expect PASS**

Run: `npm run test:run -- src/__tests__/app/api/admin/session.test.ts`
Expected: 6 tests pass.

- [ ] **Step 6: Full suite + typecheck**

```
npm run test:run
npm run type-check
```
Expected: 210 tests pass.

- [ ] **Step 7: Commit**

```bash
git add src/validations/admin.ts src/app/api/admin/session/route.ts src/__tests__/app/api/admin/session.test.ts
git commit -m "feat: POST/DELETE /api/admin/session for step-up auth"
```

---

### Task 7: Middleware gate for /admin/*

**Files:**
- Modify: `src/middleware.ts`

Before the request reaches any `/admin/*` route, middleware checks:
1. User is authenticated (fall through to existing auth redirect if not).
2. Admin session cookie is valid AND user id matches.

If admin cookie missing/invalid: redirect to `/admin/login?next=<pathname>`.

We do NOT check `isPlatformAdmin()` in middleware — that's an async DB call and adds latency to every request. The layout (Task 8) does the platform_admins check server-side before rendering any admin content. Middleware only handles the quick cookie gate.

**Important:** `/admin/login` itself must be reachable without the admin cookie. Whitelist `/admin/login` in the check.

- [ ] **Step 1: Read the current middleware**

Read `src/middleware.ts` fully. Find the existing auth-branch for `/app/*`. We'll add a parallel branch for `/admin/*` after the auth check succeeds.

- [ ] **Step 2: Import and add the check**

Add the import alongside existing ones:

```typescript
import {
  ADMIN_SESSION_COOKIE,
  verifyAdminSessionCookie,
} from '@/lib/admin/admin-session';
```

Inside the middleware, after `supabase.auth.getUser()` returns a user AND the pathname starts with `/admin/` (but is NOT `/admin/login`), add:

```typescript
if (pathname.startsWith('/admin') && pathname !== '/admin/login') {
  const cookieValue = request.cookies.get(ADMIN_SESSION_COOKIE)?.value;
  const verify = await verifyAdminSessionCookie(cookieValue);
  if (!verify.valid || verify.userId !== user.id) {
    const loginUrl = new URL('/admin/login', request.url);
    loginUrl.searchParams.set('next', pathname);
    return NextResponse.redirect(loginUrl);
  }
}
```

Place this BEFORE the final `return response`. Also ensure the `/admin/*` path is NOT caught by the existing `/app/*` redirect-to-login (check the conditions — it probably isn't, but verify).

**IMPORTANT:** Unauthenticated users hitting `/admin/*` should be redirected to `/auth/login?next=/admin/...` (same as the `/app/*` unauthenticated flow). Only authenticated-but-no-admin-session users go to `/admin/login`.

If the middleware's existing structure makes this hard to slot in cleanly, prefer clarity over brevity — restructure the conditional chain to be readable.

- [ ] **Step 3: Typecheck + test suite**

```
npm run type-check
npm run test:run
```
Expected: 210 tests pass, type-check clean.

- [ ] **Step 4: Commit**

```bash
git add src/middleware.ts
git commit -m "feat: middleware gate for /admin/* — admin session cookie required"
```

---

## Part 3 — Admin UI

### Task 8: Admin layout + `/admin/login` page

**Files:**
- Create: `src/app/admin/layout.tsx`
- Create: `src/app/admin/login/page.tsx`
- Create: `src/components/admin/admin-nav.tsx`

The layout re-verifies platform-admin status server-side (defence in depth — middleware only checks the cookie; the layout checks the DB). It also refreshes the admin session cookie on every render by calling `setAdminSession(user.id)` again, which updates the `issued_at`.

The `/admin/login` page prompts for password. On success, redirects to the `next` param or `/admin`.

- [ ] **Step 1: Admin layout**

Create `src/app/admin/layout.tsx`:

```tsx
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { isPlatformAdmin } from '@/lib/admin/is-platform-admin';
import { setAdminSession } from '@/lib/admin/admin-session';
import { AdminNav } from '@/components/admin/admin-nav';

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/auth/login?next=/admin');

  // Defence in depth: middleware checked the admin session cookie; layout
  // checks platform_admins membership before rendering any admin content.
  const isAdmin = await isPlatformAdmin(user.id);
  if (!isAdmin) redirect('/app');

  // Refresh the admin session cookie on activity.
  await setAdminSession(user.id);

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminNav userEmail={user.email ?? ''} />
      <main className="max-w-6xl mx-auto px-6 py-8">{children}</main>
    </div>
  );
}
```

- [ ] **Step 2: Admin nav**

Create `src/components/admin/admin-nav.tsx`:

```tsx
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const LINKS = [
  { href: '/admin', label: 'Overview' },
  { href: '/admin/orgs', label: 'Organisations' },
  { href: '/admin/users', label: 'Users' },
  { href: '/admin/audit', label: 'Audit log' },
];

export function AdminNav({ userEmail }: { userEmail: string }) {
  const pathname = usePathname();

  async function signOutOfAdmin() {
    await fetch('/api/admin/session', {
      method: 'DELETE',
      credentials: 'same-origin',
    });
    window.location.href = '/app';
  }

  return (
    <nav className="bg-black text-white px-6 py-3 flex items-center justify-between">
      <div className="flex items-center gap-6">
        <span className="font-semibold">OneSign – Lynx · Admin</span>
        <ul className="flex items-center gap-4 text-sm">
          {LINKS.map((l) => {
            const active =
              pathname === l.href ||
              (l.href !== '/admin' && pathname.startsWith(l.href));
            return (
              <li key={l.href}>
                <Link
                  href={l.href}
                  className={
                    active ? 'text-white font-semibold' : 'text-gray-300 hover:text-white'
                  }
                >
                  {l.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
      <div className="flex items-center gap-3 text-xs text-gray-300">
        <span>{userEmail}</span>
        <button
          type="button"
          onClick={signOutOfAdmin}
          className="underline hover:text-white"
        >
          Exit admin
        </button>
      </div>
    </nav>
  );
}
```

- [ ] **Step 3: Login page**

Create `src/app/admin/login/page.tsx`:

```tsx
'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

function LoginInner() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get('next') || '/admin';

  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/session', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ password }),
      });
      if (!res.ok) {
        const json = (await res.json().catch(() => ({}))) as {
          error?: string;
        };
        setError(json.error ?? 'Failed to start admin session');
        return;
      }
      router.push(next);
    } catch {
      setError('Failed to start admin session');
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-100 p-6">
      <form
        onSubmit={onSubmit}
        className="w-full max-w-sm bg-white rounded-lg shadow p-6 space-y-4"
      >
        <h1 className="text-lg font-semibold">Admin step-up</h1>
        <p className="text-sm text-gray-600">
          Re-enter your password to start an admin session. Sessions expire
          after 30 minutes of inactivity.
        </p>
        <div>
          <label className="block text-sm font-medium" htmlFor="admin-password">
            Password
          </label>
          <input
            id="admin-password"
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full border rounded px-3 py-2 text-sm"
            autoFocus
          />
        </div>
        <button
          type="submit"
          disabled={busy}
          className="w-full bg-black text-white py-2 px-4 rounded text-sm disabled:opacity-50"
        >
          {busy ? 'Verifying…' : 'Start admin session'}
        </button>
        {error && (
          <p className="text-sm text-red-600" role="alert">
            {error}
          </p>
        )}
      </form>
    </main>
  );
}

export default function AdminLoginPage() {
  return (
    <Suspense>
      <LoginInner />
    </Suspense>
  );
}
```

- [ ] **Step 4: Typecheck + suite**

```
npm run type-check
npm run test:run
```
Expected: clean, 210 tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/app/admin/layout.tsx src/app/admin/login/page.tsx src/components/admin/admin-nav.tsx
git commit -m "feat: /admin layout with platform-admin gate + /admin/login step-up page"
```

---

### Task 9: `/admin` home — platform KPIs

**Files:**
- Create: `src/app/admin/page.tsx`

Queries counts across the platform using the admin client. Renders as tiles.

- [ ] **Step 1: Create the page**

```tsx
// src/app/admin/page.tsx
import { createAdminClient } from '@/lib/supabase/admin';
import type { PlatformKpis } from '@/types/platform-admin';

async function fetchKpis(): Promise<PlatformKpis> {
  const admin = createAdminClient();

  async function count(table: string): Promise<number> {
    const { count } = await admin
      .from(table)
      .select('*', { count: 'exact', head: true });
    return count ?? 0;
  }

  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const [
    totalOrgs,
    totalUsersResp,
    totalBioPages,
    totalQrCodes,
    orgsThisWeekResp,
    formSubsResp,
  ] = await Promise.all([
    count('organizations'),
    admin.auth.admin.listUsers({ page: 1, perPage: 1 }).then((r) => ({
      total: r.data?.total ?? r.data?.users?.length ?? 0,
    })),
    count('bio_link_pages'),
    count('qr_codes'),
    admin
      .from('organizations')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', weekAgo)
      .then((r) => r.count ?? 0),
    admin
      .from('bio_form_submissions')
      .select('*', { count: 'exact', head: true })
      .gte('submitted_at', weekAgo)
      .then((r) => r.count ?? 0),
  ]);

  return {
    total_orgs: totalOrgs,
    total_users: totalUsersResp.total,
    orgs_created_this_week: orgsThisWeekResp,
    total_bio_pages: totalBioPages,
    total_qr_codes: totalQrCodes,
    form_submissions_last_7d: formSubsResp,
  };
}

export default async function AdminHomePage() {
  const kpis = await fetchKpis();

  const tiles: Array<{ label: string; value: number }> = [
    { label: 'Organisations', value: kpis.total_orgs },
    { label: 'Users', value: kpis.total_users },
    { label: 'Orgs created (7d)', value: kpis.orgs_created_this_week },
    { label: 'Bio pages', value: kpis.total_bio_pages },
    { label: 'QR codes', value: kpis.total_qr_codes },
    { label: 'Form submissions (7d)', value: kpis.form_submissions_last_7d },
  ];

  return (
    <div>
      <h1 className="text-2xl font-semibold mb-6">Overview</h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        {tiles.map((t) => (
          <div key={t.label} className="bg-white border rounded p-4">
            <div className="text-xs text-gray-500 uppercase tracking-wide">
              {t.label}
            </div>
            <div className="text-3xl font-semibold mt-1">{t.value}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Typecheck**

Run: `npm run type-check`
Expected: clean. If `admin.auth.admin.listUsers` has a different return shape than expected, adjust — the goal is to get a total user count; a fallback is a second count query against a `auth.users` view if one exists.

- [ ] **Step 3: Commit**

```bash
git add src/app/admin/page.tsx
git commit -m "feat: /admin home with platform KPI tiles"
```

---

### Task 10: Orgs list + detail + preview

**Files:**
- Create: `src/app/admin/orgs/page.tsx`
- Create: `src/app/admin/orgs/[id]/page.tsx`
- Create: `src/app/admin/orgs/[id]/preview/page.tsx`
- Create: `src/components/admin/view-as-banner.tsx`

- [ ] **Step 1: Orgs list**

Create `src/app/admin/orgs/page.tsx`:

```tsx
import Link from 'next/link';
import { createAdminClient } from '@/lib/supabase/admin';

export default async function OrgsListPage() {
  const admin = createAdminClient();
  const { data: orgs } = await admin
    .from('organizations')
    .select('id, name, slug, plan, created_at, deleted_at')
    .order('created_at', { ascending: false })
    .limit(200);

  return (
    <div>
      <h1 className="text-2xl font-semibold mb-6">Organisations</h1>
      <div className="bg-white border rounded divide-y">
        {(orgs ?? []).map((o) => (
          <Link
            key={o.id}
            href={`/admin/orgs/${o.id}`}
            className="block p-4 hover:bg-gray-50 flex justify-between items-center"
          >
            <div>
              <div className="font-medium">{o.name}</div>
              <div className="text-xs text-gray-500">
                {o.slug} · {o.plan}
                {o.deleted_at ? ' · deleted' : ''}
              </div>
            </div>
            <div className="text-xs text-gray-400">
              {new Date(o.created_at).toLocaleDateString()}
            </div>
          </Link>
        ))}
      </div>
      {orgs && orgs.length === 200 && (
        <p className="mt-4 text-xs text-gray-500">
          Showing most recent 200. Pagination not yet implemented.
        </p>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Org detail**

Create `src/app/admin/orgs/[id]/page.tsx`:

```tsx
import Link from 'next/link';
import { createAdminClient } from '@/lib/supabase/admin';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { logAdminAction } from '@/lib/admin/audit';

interface Props {
  params: Promise<{ id: string }>;
}

export default async function OrgDetailPage({ params }: Props) {
  const { id } = await params;
  const admin = createAdminClient();

  const { data: org } = await admin
    .from('organizations')
    .select('id, name, slug, plan, phone, website, created_at, deleted_at')
    .eq('id', id)
    .single();

  if (!org) notFound();

  const [{ data: members }, { data: pages }, { data: qrs }] = await Promise.all(
    [
      admin
        .from('organization_members')
        .select('user_id, role, joined_at')
        .eq('org_id', id),
      admin
        .from('bio_link_pages')
        .select('id, slug, title, is_active, deleted_at, created_at')
        .eq('org_id', id)
        .order('created_at', { ascending: false })
        .limit(50),
      admin
        .from('qr_codes')
        .select('id, slug, name, mode, is_active, created_at')
        .eq('org_id', id)
        .order('created_at', { ascending: false })
        .limit(50),
    ]
  );

  // Audit this view.
  const server = await createClient();
  const {
    data: { user },
  } = await server.auth.getUser();
  if (user) {
    await logAdminAction({
      actorUserId: user.id,
      action: 'admin.view_org',
      targetType: 'organization',
      targetId: id,
    });
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold">{org.name}</h1>
        <p className="text-sm text-gray-500">
          {org.slug} · {org.plan}
          {org.deleted_at ? ' · deleted' : ''}
        </p>
      </div>

      <Link
        href={`/admin/orgs/${id}/preview`}
        className="inline-block bg-black text-white px-4 py-2 rounded text-sm"
      >
        View as (read-only preview)
      </Link>

      <section>
        <h2 className="text-lg font-semibold mb-2">
          Members ({(members ?? []).length})
        </h2>
        <ul className="bg-white border rounded divide-y">
          {(members ?? []).map((m) => (
            <li key={m.user_id} className="p-3 text-sm flex justify-between">
              <Link
                href={`/admin/users/${m.user_id}`}
                className="font-mono text-xs text-blue-700 hover:underline"
              >
                {m.user_id}
              </Link>
              <span className="text-xs text-gray-500">{m.role}</span>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h2 className="text-lg font-semibold mb-2">
          Bio pages ({(pages ?? []).length})
        </h2>
        <ul className="bg-white border rounded divide-y">
          {(pages ?? []).map((p) => (
            <li key={p.id} className="p-3 text-sm flex justify-between">
              <span>
                {p.title}
                <span className="ml-2 text-xs text-gray-500">/p/{p.slug}</span>
              </span>
              <span className="text-xs text-gray-500">
                {p.is_active ? 'active' : 'draft'}
                {p.deleted_at ? ' · deleted' : ''}
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h2 className="text-lg font-semibold mb-2">
          QR codes ({(qrs ?? []).length})
        </h2>
        <ul className="bg-white border rounded divide-y">
          {(qrs ?? []).map((q) => (
            <li key={q.id} className="p-3 text-sm flex justify-between">
              <span>
                {q.name}
                <span className="ml-2 text-xs text-gray-500">/r/{q.slug}</span>
              </span>
              <span className="text-xs text-gray-500">
                {q.mode} · {q.is_active ? 'active' : 'disabled'}
              </span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
```

- [ ] **Step 3: View-as banner component**

Create `src/components/admin/view-as-banner.tsx`:

```tsx
import Link from 'next/link';

export function ViewAsBanner({
  orgName,
  orgId,
}: {
  orgName: string;
  orgId: string;
}) {
  return (
    <div className="bg-red-600 text-white px-4 py-2 text-sm flex justify-between items-center">
      <span>
        ADMIN · READ-ONLY PREVIEW of <strong>{orgName}</strong>
      </span>
      <Link
        href={`/admin/orgs/${orgId}`}
        className="underline text-white"
      >
        Exit preview
      </Link>
    </div>
  );
}
```

- [ ] **Step 4: Org preview page**

Create `src/app/admin/orgs/[id]/preview/page.tsx`:

```tsx
import { notFound } from 'next/navigation';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import { logAdminAction } from '@/lib/admin/audit';
import { ViewAsBanner } from '@/components/admin/view-as-banner';

interface Props {
  params: Promise<{ id: string }>;
}

export default async function OrgPreviewPage({ params }: Props) {
  const { id } = await params;
  const admin = createAdminClient();

  const { data: org } = await admin
    .from('organizations')
    .select('id, name')
    .eq('id', id)
    .single();
  if (!org) notFound();

  // Fetch the org's bio pages + QR codes to render a light read-only view.
  // No editing controls are rendered — this is a safe preview.
  const [{ data: pages }, { data: qrs }, { data: submissions }] =
    await Promise.all([
      admin
        .from('bio_link_pages')
        .select('id, slug, title, theme, is_active')
        .eq('org_id', id)
        .is('deleted_at', null)
        .order('created_at', { ascending: false }),
      admin
        .from('qr_codes')
        .select('id, slug, name, mode, destination_url, is_active')
        .eq('org_id', id)
        .is('deleted_at', null)
        .order('created_at', { ascending: false }),
      admin
        .from('bio_form_submissions')
        .select('id, name, email, subject, is_read, submitted_at')
        .in(
          'page_id',
          (
            (await admin
              .from('bio_link_pages')
              .select('id')
              .eq('org_id', id)).data ?? []
          ).map((p) => p.id as string)
        )
        .order('submitted_at', { ascending: false })
        .limit(50),
    ]);

  const server = await createClient();
  const {
    data: { user },
  } = await server.auth.getUser();
  if (user) {
    await logAdminAction({
      actorUserId: user.id,
      action: 'admin.view_as_preview',
      targetType: 'organization',
      targetId: id,
    });
  }

  return (
    <div className="-mx-6 -my-8">
      <ViewAsBanner orgName={org.name} orgId={id} />
      <div className="max-w-4xl mx-auto p-6 space-y-8">
        <h1 className="text-2xl font-semibold">{org.name} · Preview</h1>

        <section>
          <h2 className="text-lg font-semibold mb-2">
            Bio pages ({(pages ?? []).length})
          </h2>
          <ul className="bg-white border rounded divide-y">
            {(pages ?? []).map((p) => (
              <li key={p.id} className="p-3 text-sm flex justify-between">
                <span>
                  {p.title}
                  <span className="ml-2 text-xs text-gray-500">/p/{p.slug}</span>
                </span>
                <span className="text-xs text-gray-500">
                  {p.theme ?? '—'} · {p.is_active ? 'active' : 'draft'}
                </span>
              </li>
            ))}
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-2">
            QR codes ({(qrs ?? []).length})
          </h2>
          <ul className="bg-white border rounded divide-y">
            {(qrs ?? []).map((q) => (
              <li key={q.id} className="p-3 text-sm">
                <div className="flex justify-between">
                  <span>
                    {q.name}
                    <span className="ml-2 text-xs text-gray-500">
                      /r/{q.slug}
                    </span>
                  </span>
                  <span className="text-xs text-gray-500">
                    {q.mode} · {q.is_active ? 'active' : 'disabled'}
                  </span>
                </div>
                {q.destination_url && (
                  <div className="text-xs text-gray-400 truncate mt-1">
                    → {q.destination_url}
                  </div>
                )}
              </li>
            ))}
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-2">
            Recent form submissions ({(submissions ?? []).length})
          </h2>
          <ul className="bg-white border rounded divide-y">
            {(submissions ?? []).map((s) => (
              <li key={s.id} className="p-3 text-sm flex justify-between">
                <span>
                  <strong>{s.name}</strong> · {s.email}
                  {s.subject ? ` · ${s.subject}` : ''}
                </span>
                <span className="text-xs text-gray-500">
                  {new Date(s.submitted_at).toLocaleString()}
                  {s.is_read ? '' : ' · unread'}
                </span>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Typecheck + test**

```
npm run type-check
npm run test:run
```
Expected: clean. If the `.in(...)` subquery in the submissions fetch fails typecheck due to the embedded promise, hoist the page-ids fetch to a prior `await` statement — cleaner and easier on the type checker.

- [ ] **Step 6: Commit**

```bash
git add src/app/admin/orgs/page.tsx "src/app/admin/orgs/[id]/page.tsx" "src/app/admin/orgs/[id]/preview/page.tsx" src/components/admin/view-as-banner.tsx
git commit -m "feat: /admin/orgs list + detail + read-only preview"
```

---

### Task 11: Users list + detail

**Files:**
- Create: `src/app/admin/users/page.tsx`
- Create: `src/app/admin/users/[id]/page.tsx`

Users come from `supabase.auth.admin.listUsers()` (paginated). Detail screen shows which orgs the user belongs to and their role.

- [ ] **Step 1: Users list**

Create `src/app/admin/users/page.tsx`:

```tsx
import Link from 'next/link';
import { createAdminClient } from '@/lib/supabase/admin';

export default async function UsersListPage() {
  const admin = createAdminClient();
  const { data } = await admin.auth.admin.listUsers({
    page: 1,
    perPage: 100,
  });

  const users = data?.users ?? [];

  return (
    <div>
      <h1 className="text-2xl font-semibold mb-6">Users</h1>
      <div className="bg-white border rounded divide-y">
        {users.map((u) => (
          <Link
            key={u.id}
            href={`/admin/users/${u.id}`}
            className="block p-4 hover:bg-gray-50 flex justify-between items-center"
          >
            <div>
              <div className="font-medium">{u.email ?? '(no email)'}</div>
              <div className="text-xs text-gray-500 font-mono truncate">
                {u.id}
              </div>
            </div>
            <div className="text-xs text-gray-400">
              {u.created_at
                ? new Date(u.created_at).toLocaleDateString()
                : ''}
            </div>
          </Link>
        ))}
      </div>
      {users.length === 100 && (
        <p className="mt-4 text-xs text-gray-500">
          Showing first 100. Pagination not yet implemented.
        </p>
      )}
    </div>
  );
}
```

- [ ] **Step 2: User detail**

Create `src/app/admin/users/[id]/page.tsx`:

```tsx
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import { logAdminAction } from '@/lib/admin/audit';

interface Props {
  params: Promise<{ id: string }>;
}

export default async function UserDetailPage({ params }: Props) {
  const { id } = await params;
  const admin = createAdminClient();

  const { data: userResp } = await admin.auth.admin.getUserById(id);
  const authUser = userResp?.user;
  if (!authUser) notFound();

  const { data: memberships } = await admin
    .from('organization_members')
    .select('org_id, role, joined_at, organizations!inner(id, name, slug)')
    .eq('user_id', id);

  const server = await createClient();
  const {
    data: { user },
  } = await server.auth.getUser();
  if (user) {
    await logAdminAction({
      actorUserId: user.id,
      action: 'admin.view_user',
      targetType: 'user',
      targetId: id,
    });
  }

  type Row = {
    org_id: string;
    role: string;
    joined_at: string;
    organizations:
      | { id: string; name: string; slug: string }
      | Array<{ id: string; name: string; slug: string }>;
  };
  const rows = (memberships ?? []) as unknown as Row[];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">{authUser.email}</h1>
        <p className="text-xs text-gray-500 font-mono mt-1">{authUser.id}</p>
        <p className="text-xs text-gray-500 mt-1">
          Created:{' '}
          {authUser.created_at
            ? new Date(authUser.created_at).toLocaleString()
            : '—'}
          {' · '}
          Last sign-in:{' '}
          {authUser.last_sign_in_at
            ? new Date(authUser.last_sign_in_at).toLocaleString()
            : '—'}
        </p>
      </div>

      <section>
        <h2 className="text-lg font-semibold mb-2">
          Organisations ({rows.length})
        </h2>
        <ul className="bg-white border rounded divide-y">
          {rows.map((r) => {
            const org = Array.isArray(r.organizations)
              ? r.organizations[0]
              : r.organizations;
            if (!org) return null;
            return (
              <li key={r.org_id} className="p-3 text-sm flex justify-between">
                <Link
                  href={`/admin/orgs/${org.id}`}
                  className="text-blue-700 hover:underline"
                >
                  {org.name} <span className="text-gray-500">({org.slug})</span>
                </Link>
                <span className="text-xs text-gray-500">{r.role}</span>
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}
```

- [ ] **Step 3: Typecheck**

```
npm run type-check
npm run test:run
```
Expected: clean.

- [ ] **Step 4: Commit**

```bash
git add src/app/admin/users/page.tsx "src/app/admin/users/[id]/page.tsx"
git commit -m "feat: /admin/users list + detail"
```

---

### Task 12: Audit log screen

**Files:**
- Create: `src/app/admin/audit/page.tsx`

Simple table of the latest 200 entries. Joined to user email for readability.

- [ ] **Step 1: Create the page**

```tsx
// src/app/admin/audit/page.tsx
import { createAdminClient } from '@/lib/supabase/admin';
import type { AuditLogRecord } from '@/types/platform-admin';

export default async function AuditLogPage() {
  const admin = createAdminClient();

  const { data: rows } = await admin
    .from('platform_audit_log')
    .select('id, actor_user_id, action, target_type, target_id, metadata, created_at')
    .order('created_at', { ascending: false })
    .limit(200);

  // Enrich with actor emails. Batch the user lookups.
  const actorIds = Array.from(
    new Set((rows ?? []).map((r: AuditLogRecord) => r.actor_user_id))
  );
  const idToEmail = new Map<string, string>();
  await Promise.all(
    actorIds.map(async (uid) => {
      try {
        const { data } = await admin.auth.admin.getUserById(uid);
        if (data?.user?.email) idToEmail.set(uid, data.user.email);
      } catch {
        // Ignore — fall back to showing the uid.
      }
    })
  );

  return (
    <div>
      <h1 className="text-2xl font-semibold mb-6">Audit log</h1>
      <div className="bg-white border rounded overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left text-xs uppercase text-gray-500">
            <tr>
              <th className="p-3">When</th>
              <th className="p-3">Actor</th>
              <th className="p-3">Action</th>
              <th className="p-3">Target</th>
              <th className="p-3">Metadata</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {(rows ?? []).map((r: AuditLogRecord) => (
              <tr key={r.id}>
                <td className="p-3 text-xs text-gray-500 whitespace-nowrap">
                  {new Date(r.created_at).toLocaleString()}
                </td>
                <td className="p-3 text-xs">
                  {idToEmail.get(r.actor_user_id) ?? r.actor_user_id}
                </td>
                <td className="p-3 font-mono text-xs">{r.action}</td>
                <td className="p-3 text-xs">
                  {r.target_type ? (
                    <span>
                      {r.target_type}{' '}
                      <span className="text-gray-400">{r.target_id}</span>
                    </span>
                  ) : (
                    '—'
                  )}
                </td>
                <td className="p-3 text-xs font-mono text-gray-500">
                  {r.metadata ? JSON.stringify(r.metadata) : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Typecheck**

```
npm run type-check
npm run test:run
```
Expected: clean.

- [ ] **Step 3: Commit**

```bash
git add src/app/admin/audit/page.tsx
git commit -m "feat: /admin/audit log view"
```

---

## Part 4 — Runbook + operator task

### Task 13: Append super-admin deploy section to runbook

**Files:**
- Modify: `docs/superpowers/runbooks/phase-0-migration.md`

- [ ] **Step 1: Append**

Append at end of `docs/superpowers/runbooks/phase-0-migration.md`:

```markdown

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
```

- [ ] **Step 2: Commit**

```bash
git add docs/superpowers/runbooks/phase-0-migration.md
git commit -m "docs: add super-admin deploy section to runbook"
```

---

### Task 14 (MANUAL): Deploy

Operator-only. Not a subagent task.

- [ ] Set `ADMIN_SESSION_SECRET` in Vercel production env (≥32-char random string).
- [ ] Apply migration 00023 to production.
- [ ] Merge branch → Vercel deploys.
- [ ] Work through the smoke test in the runbook.
- [ ] Log a production entry.

---

## Completion criteria

Super-admin dashboard is complete when:

1. Migration 00023 applied.
2. `ADMIN_SESSION_SECRET` set in prod.
3. Step-up auth works (redirect → login → session cookie).
4. All six admin screens load correctly for a platform admin.
5. Non-platform-admins get redirected away from `/admin/*`.
6. Audit log accumulates entries for admin actions.
7. Known-good production QRs still 307-redirect (unaffected by this change).

After this ships, the Shopfront plan is unblocked and can plug product catalog + orders screens into the existing admin chrome.
