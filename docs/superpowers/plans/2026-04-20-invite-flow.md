# Invite Flow Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship end-to-end team invites — an org owner/admin enters an email and role, the invitee gets an email with a magic link, clicks it, accepts, and lands in the org as a member. Activates the multi-user value of the Phase 0 foundation.

**Architecture:** Token-based email invites. Tokens are random 256-bit base64url strings stored in the existing `organization_invites` table (shipped in Phase 0.A migration 00016). Token-bearing URL is `/invite/<token>`. Accept validates: token exists, not expired, not already accepted, and the authenticated user's email matches the invite's email (case-insensitive). On accept, a row is inserted into `organization_members` and the invite is marked `accepted_at = now()`. RLS on invites (shipped in 0.C.1 migration 00018) already permits the invitee to SELECT their own invite and the inviter/admin to manage theirs — no RLS changes needed.

**Tech Stack:** Next.js 16 App Router, TypeScript, Supabase, Vitest, Zod, Resend (existing usage at `src/app/api/bio/[id]/form/route.ts`). Node `crypto.getRandomValues` for token generation (Edge-compatible).

**Prerequisites (must be true before starting):**
- Phase 0 foundation complete through 0.C.2 in production.
- Resend API key present in env (`RESEND_API_KEY`). Already used by the contact-form endpoint.

**Scope boundary:**
- ✅ **In scope:** Invite create/list/cancel API, invite accept API, `/invite/<token>` landing page, `/app/settings/team` UI (member list + pending invites + invite form), email template, migration 00022 (partial unique index on pending invites per email/org), runbook/docs for operator deploy.
- ❌ **Out of scope:** Role changes after acceptance (future UI). Removing existing members (future UI). Per-resource assignment (a member sees everything in the org — design decision from Phase 0 spec). Bulk invites / CSV. Email customization per org. SSO. Invite link expiry customization (fixed at 7 days).

**Reference spec:** `docs/superpowers/specs/2026-04-17-onesign-lynx-h1-h2-design.md` — Section 2 (Foundation — Invite flow).

---

## File structure

**Created:**
- `supabase/migrations/00022_invite_pending_unique.sql` — partial unique index preventing duplicate pending invites to the same email in the same org.
- `src/lib/org/invite-tokens.ts` — `generateInviteToken()` pure function + `INVITE_EXPIRY_SECONDS` constant.
- `src/__tests__/lib/org/invite-tokens.test.ts` — unit tests.
- `src/lib/email/send-invite.ts` — `sendInviteEmail({ to, orgName, inviterName, acceptUrl })` helper wrapping Resend API.
- `src/__tests__/lib/email/send-invite.test.ts` — unit tests (mocked fetch; verifies URL / subject / recipient).
- `src/validations/invite.ts` — Zod schemas: `createInviteSchema`, `acceptInviteTokenSchema`.
- `src/__tests__/validations/invite.test.ts` — unit tests.
- `src/app/api/org/invites/route.ts` — `GET` (list invites for active org) + `POST` (create invite + send email).
- `src/app/api/org/invites/[id]/route.ts` — `DELETE` (cancel pending invite).
- `src/__tests__/app/api/org/invites.test.ts` — unit tests for GET + POST + DELETE.
- `src/app/api/invite/accept/route.ts` — `POST` (accept invite by token).
- `src/__tests__/app/api/invite/accept.test.ts` — unit tests.
- `src/app/invite/[token]/page.tsx` — server-side landing page. Renders invite details + Accept button. Redirects to login with `?next=/invite/<token>` if unauthenticated.
- `src/app/app/settings/team/page.tsx` — server component, fetches members + invites.
- `src/components/org/team-settings.tsx` — client component rendering the list + invite form.
- `src/components/org/invite-member-form.tsx` — client component: email input, role select, submit.

**Modified:**
- `src/components/layout/app-sidebar.tsx` — add "Team" link under settings.
- `docs/superpowers/runbooks/phase-0-migration.md` — append short "Invite flow" deploy section (migration 00022 + app deploy note).

**Not touched:**
- `organization_invites` table schema (already has all columns needed).
- RLS policies on invites (already shipped in 00018; permit invitee SELECT/UPDATE by email match and org admin INSERT/DELETE).

---

## Part 1 — Foundation: migration, token, email, validation

### Task 1: Migration 00022 (partial unique index on pending invites)

**Files:**
- Create: `supabase/migrations/00022_invite_pending_unique.sql`

Prevents sending a second pending invite to the same email for the same org. Already-accepted invites are excluded so re-invites after someone leaves are still allowed.

- [ ] **Step 1: Create the migration file**

Create `supabase/migrations/00022_invite_pending_unique.sql`:

```sql
-- Migration: Prevent duplicate pending invites per (org, email)
--
-- The organization_invites table (from 00016) doesn't constrain multiple
-- pending invites to the same email. UX-wise, sending a second invite to
-- the same email while one is already pending is confusing. This partial
-- unique index rejects duplicates at the DB level — the API layer surfaces
-- a friendly "already invited" error on conflict.
--
-- Rollback: DROP INDEX IF EXISTS idx_invites_unique_pending;

BEGIN;

CREATE UNIQUE INDEX IF NOT EXISTS idx_invites_unique_pending
  ON organization_invites(org_id, lower(email))
  WHERE accepted_at IS NULL;

COMMIT;
```

- [ ] **Step 2: Run schema-lint**

Run: `npm run migration:schema-lint`
Expected: `Migration schema-lint passed.`

- [ ] **Step 3: Run test suite**

Run: `npm run test:run`
Expected: 157 tests pass.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/00022_invite_pending_unique.sql
git commit -m "feat: migration 00022 adds partial unique index on pending invites"
```

---

### Task 2: Invite token generator with TDD

**Files:**
- Create: `src/lib/org/invite-tokens.ts`
- Create: `src/__tests__/lib/org/invite-tokens.test.ts`

256-bit random token, base64url-encoded, URL-safe. Uses `crypto.getRandomValues` which is available in both Node and Edge runtimes.

- [ ] **Step 1: Write the failing tests**

```typescript
// src/__tests__/lib/org/invite-tokens.test.ts
import { describe, it, expect } from 'vitest';
import {
  generateInviteToken,
  INVITE_EXPIRY_SECONDS,
} from '@/lib/org/invite-tokens';

describe('generateInviteToken', () => {
  it('returns a string at least 40 chars long', () => {
    const token = generateInviteToken();
    expect(typeof token).toBe('string');
    expect(token.length).toBeGreaterThanOrEqual(40);
  });

  it('contains only URL-safe characters (base64url alphabet)', () => {
    const token = generateInviteToken();
    expect(token).toMatch(/^[A-Za-z0-9_-]+$/);
  });

  it('returns distinct tokens on successive calls', () => {
    const tokens = new Set<string>();
    for (let i = 0; i < 20; i++) tokens.add(generateInviteToken());
    expect(tokens.size).toBe(20);
  });
});

describe('INVITE_EXPIRY_SECONDS', () => {
  it('is 7 days in seconds', () => {
    expect(INVITE_EXPIRY_SECONDS).toBe(60 * 60 * 24 * 7);
  });
});
```

- [ ] **Step 2: Run tests — expect FAIL**

Run: `npm run test:run -- src/__tests__/lib/org/invite-tokens.test.ts`
Expected: module not found.

- [ ] **Step 3: Write the helper**

```typescript
// src/lib/org/invite-tokens.ts

/** Invite link validity window — 7 days from creation. */
export const INVITE_EXPIRY_SECONDS = 60 * 60 * 24 * 7;

/**
 * 256-bit random token encoded as URL-safe base64 (no padding).
 * Safe in both Node and Edge runtimes.
 */
export function generateInviteToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  // Convert to base64 then to base64url (-, _ instead of +, /, no padding).
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  const b64 =
    typeof btoa !== 'undefined'
      ? btoa(binary)
      : Buffer.from(binary, 'binary').toString('base64');
  return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
```

- [ ] **Step 4: Run tests — expect pass**

Run: `npm run test:run -- src/__tests__/lib/org/invite-tokens.test.ts`
Expected: 4 tests pass.

- [ ] **Step 5: Typecheck + full suite**

```
npm run type-check
npm run test:run
```
Expected: 161 tests pass.

- [ ] **Step 6: Commit**

```bash
git add src/lib/org/invite-tokens.ts src/__tests__/lib/org/invite-tokens.test.ts
git commit -m "feat: add invite token generator"
```

---

### Task 3: Zod schemas for invite endpoints with TDD

**Files:**
- Create: `src/validations/invite.ts`
- Create: `src/__tests__/validations/invite.test.ts`

- [ ] **Step 1: Write the failing tests**

```typescript
// src/__tests__/validations/invite.test.ts
import { describe, it, expect } from 'vitest';
import {
  createInviteSchema,
  acceptInviteTokenSchema,
} from '@/validations/invite';

describe('createInviteSchema', () => {
  it('accepts valid email + admin role', () => {
    const r = createInviteSchema.safeParse({
      email: 'sarah@example.com',
      role: 'admin',
    });
    expect(r.success).toBe(true);
  });

  it('accepts valid email + member role', () => {
    const r = createInviteSchema.safeParse({
      email: 'bob@example.com',
      role: 'member',
    });
    expect(r.success).toBe(true);
  });

  it('rejects owner role (owner comes from org creation, not invite)', () => {
    const r = createInviteSchema.safeParse({
      email: 'x@x.com',
      role: 'owner',
    });
    expect(r.success).toBe(false);
  });

  it('rejects invalid email', () => {
    const r = createInviteSchema.safeParse({
      email: 'not-an-email',
      role: 'member',
    });
    expect(r.success).toBe(false);
  });

  it('rejects empty email', () => {
    const r = createInviteSchema.safeParse({ email: '', role: 'member' });
    expect(r.success).toBe(false);
  });

  it('rejects unknown role', () => {
    const r = createInviteSchema.safeParse({
      email: 'x@x.com',
      role: 'super',
    });
    expect(r.success).toBe(false);
  });
});

describe('acceptInviteTokenSchema', () => {
  it('accepts a valid token string', () => {
    const r = acceptInviteTokenSchema.safeParse({
      token: 'abc123XYZ_-def456',
    });
    expect(r.success).toBe(true);
  });

  it('rejects empty token', () => {
    const r = acceptInviteTokenSchema.safeParse({ token: '' });
    expect(r.success).toBe(false);
  });

  it('rejects tokens with unsupported characters', () => {
    const r = acceptInviteTokenSchema.safeParse({
      token: 'has spaces and #symbols',
    });
    expect(r.success).toBe(false);
  });
});
```

- [ ] **Step 2: Run tests — expect FAIL**

Run: `npm run test:run -- src/__tests__/validations/invite.test.ts`
Expected: module not found.

- [ ] **Step 3: Write schemas**

```typescript
// src/validations/invite.ts
import { z } from 'zod';

export const createInviteSchema = z.object({
  email: z.string().email().max(320),
  role: z.enum(['admin', 'member']),
});
export type CreateInviteInput = z.infer<typeof createInviteSchema>;

export const acceptInviteTokenSchema = z.object({
  token: z
    .string()
    .min(20)
    .max(128)
    .regex(/^[A-Za-z0-9_-]+$/, {
      message: 'Token contains unsupported characters',
    }),
});
export type AcceptInviteTokenInput = z.infer<typeof acceptInviteTokenSchema>;
```

- [ ] **Step 4: Run tests — expect pass**

Run: `npm run test:run -- src/__tests__/validations/invite.test.ts`
Expected: 9 tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/validations/invite.ts src/__tests__/validations/invite.test.ts
git commit -m "feat: add invite Zod schemas"
```

---

### Task 4: Invite email helper with TDD

**Files:**
- Create: `src/lib/email/send-invite.ts`
- Create: `src/__tests__/lib/email/send-invite.test.ts`

Wraps Resend API for a single transactional email. Builds accept URL from `NEXT_PUBLIC_APP_URL` + token. Fire-and-forget from the caller's perspective (errors logged but not thrown, matching existing Resend usage in the contact-form route).

- [ ] **Step 1: Write the failing tests**

```typescript
// src/__tests__/lib/email/send-invite.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { sendInviteEmail, buildAcceptUrl } from '@/lib/email/send-invite';

describe('buildAcceptUrl', () => {
  it('combines NEXT_PUBLIC_APP_URL and token', () => {
    expect(buildAcceptUrl('https://app.example.com', 'tok-123')).toBe(
      'https://app.example.com/invite/tok-123'
    );
  });

  it('strips trailing slash from base', () => {
    expect(buildAcceptUrl('https://app.example.com/', 'tok-abc')).toBe(
      'https://app.example.com/invite/tok-abc'
    );
  });
});

describe('sendInviteEmail', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    vi.resetAllMocks();
    process.env.RESEND_API_KEY = 'test-key';
    process.env.NEXT_PUBLIC_APP_URL = 'https://app.example.com';
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('does not send when RESEND_API_KEY is missing', async () => {
    delete process.env.RESEND_API_KEY;
    const fetchMock = vi.fn();
    global.fetch = fetchMock as unknown as typeof fetch;

    const result = await sendInviteEmail({
      to: 'sarah@example.com',
      orgName: 'Johns Cafe',
      inviterName: 'John',
      token: 'tok-abc',
    });

    expect(result.sent).toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('POSTs to Resend with an authorization header and expected body', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ id: 'eml-1' }), { status: 200 })
    );
    global.fetch = fetchMock as unknown as typeof fetch;

    const result = await sendInviteEmail({
      to: 'sarah@example.com',
      orgName: 'Johns Cafe',
      inviterName: 'John',
      token: 'tok-abc',
    });

    expect(result.sent).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('https://api.resend.com/emails');
    expect(
      (init.headers as Record<string, string>).Authorization
    ).toBe('Bearer test-key');

    const body = JSON.parse(init.body as string);
    expect(body.to).toBe('sarah@example.com');
    expect(body.subject).toContain('Johns Cafe');
    const html = body.html as string;
    expect(html).toContain('https://app.example.com/invite/tok-abc');
    expect(html).toContain('John');
    expect(html).toContain('Johns Cafe');
  });

  it('returns sent=false when Resend responds with an error', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response('boom', { status: 500 })
    );
    global.fetch = fetchMock as unknown as typeof fetch;

    const result = await sendInviteEmail({
      to: 'sarah@example.com',
      orgName: 'Johns Cafe',
      inviterName: 'John',
      token: 'tok-abc',
    });

    expect(result.sent).toBe(false);
  });
});
```

- [ ] **Step 2: Run tests — expect FAIL**

Run: `npm run test:run -- src/__tests__/lib/email/send-invite.test.ts`
Expected: module not found.

- [ ] **Step 3: Write the helper**

```typescript
// src/lib/email/send-invite.ts

export interface SendInviteArgs {
  to: string;
  orgName: string;
  inviterName: string;
  token: string;
}

export interface SendInviteResult {
  sent: boolean;
}

export function buildAcceptUrl(baseUrl: string, token: string): string {
  const base = baseUrl.replace(/\/+$/, '');
  return `${base}/invite/${token}`;
}

export async function sendInviteEmail(
  args: SendInviteArgs
): Promise<SendInviteResult> {
  const apiKey = process.env.RESEND_API_KEY;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? '';

  if (!apiKey) {
    console.warn(
      '[sendInviteEmail] RESEND_API_KEY missing — skipping email send'
    );
    return { sent: false };
  }

  const acceptUrl = buildAcceptUrl(appUrl, args.token);
  const subject = `${args.inviterName} invited you to ${args.orgName} on OneSign – Lynx`;
  const html = renderInviteEmail({
    orgName: args.orgName,
    inviterName: args.inviterName,
    acceptUrl,
  });

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'OneSign – Lynx <noreply@onesignanddigital.com>',
        to: args.to,
        subject,
        html,
      }),
    });

    if (!res.ok) {
      console.error(
        `[sendInviteEmail] Resend non-ok status ${res.status} ${await res.text().catch(() => '')}`
      );
      return { sent: false };
    }
    return { sent: true };
  } catch (err) {
    console.error('[sendInviteEmail] fetch failed', err);
    return { sent: false };
  }
}

function renderInviteEmail(args: {
  orgName: string;
  inviterName: string;
  acceptUrl: string;
}): string {
  return `<!doctype html>
<html><body style="font-family: system-ui, sans-serif; max-width: 560px; margin: 0 auto; padding: 24px; color: #111;">
<h1 style="font-size: 20px; margin: 0 0 16px;">You're invited</h1>
<p style="margin: 0 0 16px;"><strong>${escapeHtml(args.inviterName)}</strong> invited you to join <strong>${escapeHtml(args.orgName)}</strong> on OneSign – Lynx.</p>
<p style="margin: 0 0 24px;">Click the button below to accept. The link expires in 7 days.</p>
<p style="margin: 0 0 24px;">
  <a href="${escapeAttr(args.acceptUrl)}" style="display: inline-block; background: #111; color: #fff; padding: 12px 20px; border-radius: 6px; text-decoration: none;">Accept invite</a>
</p>
<p style="margin: 0 0 8px; font-size: 13px; color: #666;">If the button doesn't work, paste this URL into your browser:</p>
<p style="margin: 0; word-break: break-all; font-size: 13px; color: #666;">${escapeHtml(args.acceptUrl)}</p>
</body></html>`;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function escapeAttr(s: string): string {
  return s.replace(/"/g, '&quot;').replace(/</g, '&lt;');
}
```

- [ ] **Step 4: Run tests — expect pass**

Run: `npm run test:run -- src/__tests__/lib/email/send-invite.test.ts`
Expected: 5 tests pass. If the test for missing `RESEND_API_KEY` fails because of test ordering (env state leakage), the `beforeEach` reset should fix it; otherwise confirm `afterEach` is correctly restoring env vars.

Note: the tests use `afterEach` in addition to `beforeEach`. If the test file doesn't import `afterEach`, add it to the `vitest` import at the top: `import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';`.

- [ ] **Step 5: Typecheck + full suite**

```
npm run type-check
npm run test:run
```
Expected: ~174 tests pass (previous 161 + 9 invite schema + 5 email).

- [ ] **Step 6: Commit**

```bash
git add src/lib/email/send-invite.ts src/__tests__/lib/email/send-invite.test.ts
git commit -m "feat: add sendInviteEmail Resend helper"
```

---

## Part 2 — API routes

### Task 5: POST /api/org/invites — create + send

**Files:**
- Create: `src/app/api/org/invites/route.ts` (GET and POST — this task focuses on POST; Task 6 extends with GET)
- Create: `src/__tests__/app/api/org/invites.test.ts`

Auth → read active-org from cookie → verify caller's role in active-org is owner or admin → parse body → check email isn't already a member of this org → INSERT invite row → send email (fire-and-forget) → return 201 with the invite summary.

Duplicate-pending is caught by the unique index on `(org_id, lower(email)) WHERE accepted_at IS NULL`. On `unique_violation` we return a 409 with a friendly message.

- [ ] **Step 1: Write the failing test file (POST only for now)**

```typescript
// src/__tests__/app/api/org/invites.test.ts
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
    admin: { getUserById: vi.fn() },
  },
  from: vi.fn(),
};
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(async () => mockSupabase),
}));

const mockAdmin = {
  from: vi.fn(),
};
vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: vi.fn(() => mockAdmin),
}));

const mockSendInvite = vi.fn().mockResolvedValue({ sent: true });
vi.mock('@/lib/email/send-invite', () => ({
  sendInviteEmail: (...args: unknown[]) => mockSendInvite(...args),
  buildAcceptUrl: (base: string, token: string) => `${base}/invite/${token}`,
}));

import { POST } from '@/app/api/org/invites/route';

function jsonRequest(body: unknown) {
  return new Request('http://localhost:3000/api/org/invites', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

function mockActiveOrg(orgId: string) {
  mockCookieStore.get.mockReturnValue({ value: orgId });
}

function mockRoleInOrg(role: 'owner' | 'admin' | 'member' | null) {
  // Supabase: from('organization_members').select('role').eq('org_id', x).eq('user_id', y).single()
  const single = vi.fn().mockResolvedValue(
    role ? { data: { role }, error: null } : { data: null, error: { code: 'PGRST116' } }
  );
  const eqUser = vi.fn().mockReturnValue({ single });
  const eqOrg = vi.fn().mockReturnValue({ eq: eqUser });
  const select = vi.fn().mockReturnValue({ eq: eqOrg });
  return { from: vi.fn().mockReturnValue({ select }) };
}

describe('POST /api/org/invites', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXT_PUBLIC_APP_URL = 'https://app.example.com';
  });

  it('returns 401 when unauthenticated', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: null },
      error: null,
    });
    const res = await POST(jsonRequest({ email: 'x@x.com', role: 'member' }));
    expect(res.status).toBe(401);
  });

  it('returns 400 on invalid body', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: 'u1', email: 'admin@x.com' } },
      error: null,
    });
    mockActiveOrg('11111111-1111-1111-1111-111111111111');
    const res = await POST(jsonRequest({ email: 'not-email', role: 'admin' }));
    expect(res.status).toBe(400);
  });

  it('returns 403 when caller is a member (not owner/admin)', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: 'u1', email: 'member@x.com' } },
      error: null,
    });
    mockActiveOrg('11111111-1111-1111-1111-111111111111');
    // Role lookup returns 'member'
    const roleMock = mockRoleInOrg('member');
    mockSupabase.from.mockImplementation(() => roleMock.from());

    const res = await POST(jsonRequest({ email: 'x@x.com', role: 'member' }));
    expect(res.status).toBe(403);
  });

  it('returns 400 when invitee is already a member of the org', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: 'u1', email: 'admin@x.com' } },
      error: null,
    });
    mockActiveOrg('11111111-1111-1111-1111-111111111111');

    // First call: role lookup returns 'admin'. Second call: membership lookup returns a row.
    const roleSingle = vi
      .fn()
      .mockResolvedValue({ data: { role: 'admin' }, error: null });
    const memberSingle = vi
      .fn()
      .mockResolvedValue({ data: { user_id: 'u-invitee' }, error: null });

    let call = 0;
    mockSupabase.from.mockImplementation(() => {
      call++;
      if (call === 1) {
        // role lookup on organization_members
        return {
          select: () => ({
            eq: () => ({ eq: () => ({ single: roleSingle }) }),
          }),
        };
      }
      // subsequent — existing-member lookup by email
      return {
        select: () => ({
          eq: () => ({
            eq: () => ({ single: memberSingle }),
          }),
        }),
      };
    });

    // Admin client returns the user id for the email
    mockAdmin.from.mockReturnValue({
      select: () => ({
        eq: () => ({ maybeSingle: vi.fn().mockResolvedValue({ data: { id: 'u-invitee' }, error: null }) }),
      }),
    });

    const res = await POST(jsonRequest({ email: 'x@x.com', role: 'member' }));
    expect(res.status).toBe(400);
  });
});
```

- [ ] **Step 2: Run tests — expect FAIL**

Run: `npm run test:run -- src/__tests__/app/api/org/invites.test.ts`
Expected: module `@/app/api/org/invites/route` not found.

- [ ] **Step 3: Write the handler**

```typescript
// src/app/api/org/invites/route.ts
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { cookies } from 'next/headers';
import { ACTIVE_ORG_COOKIE } from '@/lib/org/active-org';
import { createInviteSchema } from '@/validations/invite';
import {
  generateInviteToken,
  INVITE_EXPIRY_SECONDS,
} from '@/lib/org/invite-tokens';
import { sendInviteEmail } from '@/lib/email/send-invite';

export async function POST(request: Request) {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const cookieStore = await cookies();
  const activeOrgId = cookieStore.get(ACTIVE_ORG_COOKIE)?.value;
  if (!activeOrgId) {
    return NextResponse.json(
      { error: 'No active organisation' },
      { status: 400 }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const parse = createInviteSchema.safeParse(body);
  if (!parse.success) {
    return NextResponse.json(
      { error: 'Invalid body', details: parse.error.flatten() },
      { status: 400 }
    );
  }

  // Verify caller is owner/admin of the active org.
  const { data: roleRow } = await supabase
    .from('organization_members')
    .select('role')
    .eq('org_id', activeOrgId)
    .eq('user_id', user.id)
    .single();
  if (!roleRow || !['owner', 'admin'].includes(roleRow.role)) {
    return NextResponse.json(
      { error: 'Forbidden — owner or admin role required' },
      { status: 403 }
    );
  }

  const email = parse.data.email.toLowerCase();
  const role = parse.data.role;

  // Block if the email is already a member of this org.
  // Use admin client to look up auth.users by email — the caller may not have
  // permission to see other users via RLS, and we need to resolve the id
  // regardless.
  const admin = createAdminClient();
  const { data: authUser } = await admin
    .from('users_by_email_view' as never)
    // Fallback: use auth.admin.listUsers or a direct RPC. The simplest approach
    // is to check membership by email instead — if that turns up a row, they're
    // already in. organization_members holds user_id, not email, so we need to
    // join auth.users. Supabase exposes auth.users via the supabase.auth API,
    // not via SQL, so we look up via a lower-level call.
    .select('id')
    .eq('email', email)
    .maybeSingle();

  if (authUser) {
    const { data: existingMember } = await supabase
      .from('organization_members')
      .select('user_id')
      .eq('org_id', activeOrgId)
      .eq('user_id', authUser.id)
      .single();
    if (existingMember) {
      return NextResponse.json(
        { error: 'That email is already a member of this organisation' },
        { status: 400 }
      );
    }
  }

  // Generate token + expiry.
  const token = generateInviteToken();
  const expiresAt = new Date(
    Date.now() + INVITE_EXPIRY_SECONDS * 1000
  ).toISOString();

  // Insert. The partial unique index on (org_id, lower(email)) WHERE
  // accepted_at IS NULL enforces "no duplicate pending invites".
  const { data: invite, error: insertError } = await supabase
    .from('organization_invites')
    .insert({
      org_id: activeOrgId,
      email,
      role,
      token,
      invited_by: user.id,
      expires_at: expiresAt,
    })
    .select('id, org_id, email, role, token, expires_at, created_at')
    .single();

  if (insertError) {
    if ((insertError as { code?: string }).code === '23505') {
      return NextResponse.json(
        { error: 'That email already has a pending invite' },
        { status: 409 }
      );
    }
    console.error('[invites POST] insert failed', insertError);
    return NextResponse.json(
      { error: 'Failed to create invite' },
      { status: 500 }
    );
  }

  // Resolve org name + inviter name for the email.
  const { data: org } = await supabase
    .from('organizations')
    .select('name')
    .eq('id', activeOrgId)
    .single();

  // Inviter name — take from user_metadata.full_name if set; else email prefix.
  const inviterName =
    ((user.user_metadata as Record<string, unknown>)?.full_name as string | undefined) ||
    user.email?.split('@')[0] ||
    'A teammate';

  // Fire-and-forget email. Do not await — we don't want to block the response.
  sendInviteEmail({
    to: email,
    orgName: org?.name ?? 'your team',
    inviterName,
    token,
  }).catch((err) => {
    console.error('[invites POST] email send failed', err);
  });

  return NextResponse.json(
    {
      invite: {
        id: invite.id,
        email: invite.email,
        role: invite.role,
        expires_at: invite.expires_at,
        created_at: invite.created_at,
      },
    },
    { status: 201 }
  );
}
```

**Important implementation note on the email-lookup step**: the handler above uses `admin.from('users_by_email_view')` as a placeholder — Supabase doesn't expose `auth.users` via the PostgREST API directly. The correct approach is `supabase.auth.admin.getUserByEmail(email)` (or `listUsers({ filter: 'email.eq.<email>' })`), but that isn't available in all SDK versions. If the test-driven implementation hits this problem, **replace the block that looks up `authUser` with**:

```typescript
// Look up the user's id by email via the auth admin API.
let authUserId: string | null = null;
try {
  const { data } = await admin.auth.admin.listUsers({
    page: 1,
    perPage: 1,
    // The `email` filter is supported by recent Supabase SDKs; if it's not,
    // fall back to a full-list scan is unacceptable — just skip the existing-
    // member check and rely on the invite unique constraint + the RLS policy.
  });
  const match = data?.users?.find((u) => u.email?.toLowerCase() === email);
  authUserId = match?.id ?? null;
} catch {
  authUserId = null;
}

if (authUserId) {
  const { data: existingMember } = await supabase
    .from('organization_members')
    .select('user_id')
    .eq('org_id', activeOrgId)
    .eq('user_id', authUserId)
    .single();
  if (existingMember) {
    return NextResponse.json(
      { error: 'That email is already a member of this organisation' },
      { status: 400 }
    );
  }
}
```

If the admin API behaves unpredictably in the Edge runtime, it's acceptable to skip the existing-member check entirely — the UX degrades to "invite sent → when they click, accept will fail because they're already a member" which is annoying but not security-relevant. Flag as a known follow-up and continue.

- [ ] **Step 4: Run tests — expect PASS (or iterate until passing)**

Run: `npm run test:run -- src/__tests__/app/api/org/invites.test.ts`
Expected: 4 tests pass.

If the "already a member" test fails because the mock setup doesn't line up with whichever email-lookup approach the handler ends up using, adjust the mock in the test to match the actual call shape, not the other way around.

- [ ] **Step 5: Typecheck + full suite**

Run: `npm run type-check && npm run test:run`
Expected: clean + all tests pass.

- [ ] **Step 6: Commit**

```bash
git add src/app/api/org/invites/route.ts src/__tests__/app/api/org/invites.test.ts
git commit -m "feat: POST /api/org/invites creates invite and sends email"
```

---

### Task 6: Extend /api/org/invites with GET (list invites)

**Files:**
- Modify: `src/app/api/org/invites/route.ts`
- Modify: `src/__tests__/app/api/org/invites.test.ts`

GET returns pending invites for the active org. Any org member can view the list (RLS permits this via policy `organization_invites_select_parties`).

- [ ] **Step 1: Add the GET test**

Append inside the existing `describe('POST /api/org/invites', ...)` file, as a sibling describe block:

```typescript
describe('GET /api/org/invites', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns 401 when unauthenticated', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: null },
      error: null,
    });
    const { GET } = await import('@/app/api/org/invites/route');
    const res = await GET();
    expect(res.status).toBe(401);
  });

  it('returns the pending invites for the active org', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: 'u1' } },
      error: null,
    });
    mockCookieStore.get.mockReturnValue({ value: 'org-1' });

    const isNull = vi.fn().mockResolvedValue({
      data: [
        {
          id: 'inv-1',
          email: 'sarah@example.com',
          role: 'admin',
          expires_at: '2026-05-01T00:00:00Z',
          created_at: '2026-04-20T00:00:00Z',
        },
      ],
      error: null,
    });
    const eq = vi.fn().mockReturnValue({ is: isNull });
    const select = vi.fn().mockReturnValue({ eq });
    mockSupabase.from.mockReturnValue({ select });

    const { GET } = await import('@/app/api/org/invites/route');
    const res = await GET();
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.invites).toHaveLength(1);
    expect(json.invites[0].email).toBe('sarah@example.com');
  });
});
```

- [ ] **Step 2: Write the GET handler**

Append to `src/app/api/org/invites/route.ts`:

```typescript
export async function GET() {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const cookieStore = await cookies();
  const activeOrgId = cookieStore.get(ACTIVE_ORG_COOKIE)?.value;
  if (!activeOrgId) {
    return NextResponse.json(
      { error: 'No active organisation' },
      { status: 400 }
    );
  }

  const { data, error } = await supabase
    .from('organization_invites')
    .select('id, email, role, expires_at, created_at')
    .eq('org_id', activeOrgId)
    .is('accepted_at', null);

  if (error) {
    return NextResponse.json(
      { error: 'Failed to load invites' },
      { status: 500 }
    );
  }

  return NextResponse.json({ invites: data ?? [] });
}
```

- [ ] **Step 3: Run tests and full suite**

```
npm run test:run
npm run type-check
```
Expected: all pass.

- [ ] **Step 4: Commit**

```bash
git add src/app/api/org/invites/route.ts src/__tests__/app/api/org/invites.test.ts
git commit -m "feat: GET /api/org/invites lists pending invites"
```

---

### Task 7: DELETE /api/org/invites/[id] — cancel invite

**Files:**
- Create: `src/app/api/org/invites/[id]/route.ts`

Cancels a pending invite. RLS (policy `organization_invites_delete_creator_or_admin`) restricts DELETE to the invite creator, owners/admins of the org, or platform admins — we just call DELETE and let RLS gate it.

- [ ] **Step 1: Write the handler**

```typescript
// src/app/api/org/invites/[id]/route.ts
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { error } = await supabase
    .from('organization_invites')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('[invites DELETE] failed', error);
    return NextResponse.json(
      { error: 'Failed to cancel invite' },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 2: Typecheck + suite**

```
npm run type-check
npm run test:run
```
Expected: clean.

- [ ] **Step 3: Commit**

```bash
git add src/app/api/org/invites/\[id\]/route.ts
git commit -m "feat: DELETE /api/org/invites/[id] cancels pending invite"
```

---

### Task 8: POST /api/invite/accept — accept by token

**Files:**
- Create: `src/app/api/invite/accept/route.ts`
- Create: `src/__tests__/app/api/invite/accept.test.ts`

Core accept flow. Auth required. Body `{ token }`. Looks up invite by token, validates:
- Not `accepted_at IS NOT NULL` → already accepted.
- `expires_at > now()` → not expired.
- Authenticated user's email (case-insensitive) matches invite email → email match.

On pass: INSERT into `organization_members` (org_id, user_id, role) + UPDATE invite set `accepted_at = now()`. Both in a transaction — if either fails, neither happens. Response includes `orgId` so the client can switch the active-org cookie afterwards.

- [ ] **Step 1: Write the failing tests**

```typescript
// src/__tests__/app/api/invite/accept.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockSupabase = {
  auth: { getUser: vi.fn() },
  from: vi.fn(),
};
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(async () => mockSupabase),
}));

import { POST } from '@/app/api/invite/accept/route';

function jsonRequest(body: unknown) {
  return new Request('http://localhost:3000/api/invite/accept', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

function mockInviteLookup(
  invite: {
    id: string;
    org_id: string;
    email: string;
    role: string;
    expires_at: string;
    accepted_at: string | null;
  } | null
) {
  const single = vi
    .fn()
    .mockResolvedValue(
      invite ? { data: invite, error: null } : { data: null, error: { code: 'PGRST116' } }
    );
  const eq = vi.fn().mockReturnValue({ single });
  const select = vi.fn().mockReturnValue({ eq });
  return { select };
}

describe('POST /api/invite/accept', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns 401 when unauthenticated', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: null },
      error: null,
    });
    const res = await POST(
      jsonRequest({ token: 'aaaaaaaaaaaaaaaaaaaaa' })
    );
    expect(res.status).toBe(401);
  });

  it('returns 400 on invalid token shape', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: 'u1', email: 'x@x.com' } },
      error: null,
    });
    const res = await POST(jsonRequest({ token: 'short' }));
    expect(res.status).toBe(400);
  });

  it('returns 404 when token not found', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: 'u1', email: 'x@x.com' } },
      error: null,
    });
    mockSupabase.from.mockReturnValueOnce(mockInviteLookup(null));
    const res = await POST(
      jsonRequest({ token: 'a'.repeat(40) })
    );
    expect(res.status).toBe(404);
  });

  it('returns 410 when invite already accepted', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: 'u1', email: 'x@x.com' } },
      error: null,
    });
    mockSupabase.from.mockReturnValueOnce(
      mockInviteLookup({
        id: 'inv-1',
        org_id: 'org-1',
        email: 'x@x.com',
        role: 'member',
        expires_at: '2030-01-01T00:00:00Z',
        accepted_at: '2026-04-18T00:00:00Z',
      })
    );
    const res = await POST(jsonRequest({ token: 'a'.repeat(40) }));
    expect(res.status).toBe(410);
  });

  it('returns 410 when invite is expired', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: 'u1', email: 'x@x.com' } },
      error: null,
    });
    mockSupabase.from.mockReturnValueOnce(
      mockInviteLookup({
        id: 'inv-1',
        org_id: 'org-1',
        email: 'x@x.com',
        role: 'member',
        expires_at: '2020-01-01T00:00:00Z',
        accepted_at: null,
      })
    );
    const res = await POST(jsonRequest({ token: 'a'.repeat(40) }));
    expect(res.status).toBe(410);
  });

  it('returns 403 when invite email does not match authed user email', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: 'u1', email: 'mallory@x.com' } },
      error: null,
    });
    mockSupabase.from.mockReturnValueOnce(
      mockInviteLookup({
        id: 'inv-1',
        org_id: 'org-1',
        email: 'sarah@example.com',
        role: 'member',
        expires_at: '2030-01-01T00:00:00Z',
        accepted_at: null,
      })
    );
    const res = await POST(jsonRequest({ token: 'a'.repeat(40) }));
    expect(res.status).toBe(403);
  });

  it('returns 200 and accepts when everything matches', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: 'u1', email: 'SARAH@example.com' } },
      error: null,
    });

    // Call 1: invite lookup.
    const inviteLookup = mockInviteLookup({
      id: 'inv-1',
      org_id: 'org-1',
      email: 'sarah@example.com',
      role: 'admin',
      expires_at: '2030-01-01T00:00:00Z',
      accepted_at: null,
    });

    // Call 2: organization_members INSERT (returning nothing useful)
    const insertResult = {
      insert: vi.fn().mockResolvedValue({ error: null }),
    };

    // Call 3: organization_invites UPDATE set accepted_at
    const updateResult = {
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null }),
      }),
    };

    mockSupabase.from
      .mockReturnValueOnce(inviteLookup)
      .mockReturnValueOnce(insertResult)
      .mockReturnValueOnce(updateResult);

    const res = await POST(jsonRequest({ token: 'a'.repeat(40) }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.orgId).toBe('org-1');
  });
});
```

- [ ] **Step 2: Run tests — expect FAIL**

Run: `npm run test:run -- src/__tests__/app/api/invite/accept.test.ts`
Expected: module not found.

- [ ] **Step 3: Write the handler**

```typescript
// src/app/api/invite/accept/route.ts
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { acceptInviteTokenSchema } from '@/validations/invite';

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

  const parse = acceptInviteTokenSchema.safeParse(body);
  if (!parse.success) {
    return NextResponse.json({ error: 'Invalid token' }, { status: 400 });
  }

  const { token } = parse.data;

  // Look up the invite.
  const { data: invite, error: lookupError } = await supabase
    .from('organization_invites')
    .select('id, org_id, email, role, expires_at, accepted_at')
    .eq('token', token)
    .single();

  if (lookupError || !invite) {
    return NextResponse.json({ error: 'Invite not found' }, { status: 404 });
  }

  if (invite.accepted_at) {
    return NextResponse.json(
      { error: 'Invite already accepted' },
      { status: 410 }
    );
  }

  if (new Date(invite.expires_at).getTime() < Date.now()) {
    return NextResponse.json({ error: 'Invite expired' }, { status: 410 });
  }

  const userEmail = (user.email ?? '').toLowerCase();
  if (userEmail !== invite.email.toLowerCase()) {
    return NextResponse.json(
      { error: 'Your account email does not match this invite' },
      { status: 403 }
    );
  }

  // Insert membership. Unique PK (org_id, user_id) prevents double-accept
  // even under concurrent requests.
  const { error: memberError } = await supabase
    .from('organization_members')
    .insert({
      org_id: invite.org_id,
      user_id: user.id,
      role: invite.role,
      invited_by: null,
    });

  // If the caller is already a member (PK conflict), treat as success — they
  // may have accepted in another tab. Still mark the invite accepted below.
  if (
    memberError &&
    (memberError as { code?: string }).code !== '23505'
  ) {
    console.error('[accept] member insert failed', memberError);
    return NextResponse.json(
      { error: 'Failed to accept invite' },
      { status: 500 }
    );
  }

  const { error: markError } = await supabase
    .from('organization_invites')
    .update({ accepted_at: new Date().toISOString() })
    .eq('id', invite.id);
  if (markError) {
    console.error('[accept] mark accepted failed', markError);
    // Membership is already created — surface partial success so the
    // caller can retry the mark-accepted step or ignore the stale invite.
    return NextResponse.json(
      { orgId: invite.org_id, warning: 'Accepted but status not updated' },
      { status: 200 }
    );
  }

  return NextResponse.json({ orgId: invite.org_id });
}
```

- [ ] **Step 4: Run tests — expect PASS**

Run: `npm run test:run -- src/__tests__/app/api/invite/accept.test.ts`
Expected: 7 tests pass.

- [ ] **Step 5: Full suite + typecheck**

```
npm run test:run
npm run type-check
```

- [ ] **Step 6: Commit**

```bash
git add src/app/api/invite/accept/route.ts src/__tests__/app/api/invite/accept.test.ts
git commit -m "feat: POST /api/invite/accept redeems token into membership"
```

---

## Part 3 — UI

### Task 9: `/invite/[token]` landing page

**Files:**
- Create: `src/app/invite/[token]/page.tsx`

Server component. Loads the invite by token (read-only). Three outcomes:
1. Invite not found / expired / already accepted → shows a "this link is no longer valid" message.
2. User not authenticated → redirects to `/auth/login?next=/invite/<token>&invite_email=<email>`. The email param allows the login page to pre-fill for convenience (but is not a security boundary — the accept API still enforces email match).
3. User authenticated and email matches → renders an Accept button (a client-side form posting to `/api/invite/accept`). On success, redirect to `/app`.

- [ ] **Step 1: Create the page**

```tsx
// src/app/invite/[token]/page.tsx
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { AcceptInviteButton } from '@/components/org/accept-invite-button';

interface Props {
  params: Promise<{ token: string }>;
}

export default async function InvitePage({ params }: Props) {
  const { token } = await params;

  // Admin client so we can read the invite even if the user isn't a member
  // yet (they wouldn't match the RLS policy on invites by email match until
  // they sign in).
  const admin = createAdminClient();
  const { data: invite, error } = await admin
    .from('organization_invites')
    .select('id, org_id, email, role, expires_at, accepted_at, organizations!inner(name)')
    .eq('token', token)
    .single();

  if (error || !invite) {
    return (
      <InviteShell>
        <h1>Invite not found</h1>
        <p>This invite link is invalid. Ask whoever sent it to resend.</p>
      </InviteShell>
    );
  }

  if (invite.accepted_at) {
    return (
      <InviteShell>
        <h1>Already accepted</h1>
        <p>This invite has already been used. If that wasn&rsquo;t you, contact your team.</p>
      </InviteShell>
    );
  }

  if (new Date(invite.expires_at).getTime() < Date.now()) {
    return (
      <InviteShell>
        <h1>Invite expired</h1>
        <p>This invite has expired. Ask for a new one.</p>
      </InviteShell>
    );
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    const params = new URLSearchParams({
      next: `/invite/${token}`,
      invite_email: invite.email,
    });
    redirect(`/auth/login?${params.toString()}`);
  }

  const emailMatches =
    (user.email ?? '').toLowerCase() === invite.email.toLowerCase();

  // The select returns organizations as an array in the embedded resource
  // even though it's a single record. Normalise.
  const orgName = Array.isArray(invite.organizations)
    ? (invite.organizations[0] as { name: string } | undefined)?.name ?? 'an organisation'
    : ((invite.organizations as unknown as { name: string } | null)?.name ?? 'an organisation');

  return (
    <InviteShell>
      <h1>Join {orgName}</h1>
      <p>
        You were invited as a <strong>{invite.role}</strong> to <strong>{orgName}</strong>.
      </p>
      {emailMatches ? (
        <AcceptInviteButton token={token} />
      ) : (
        <div>
          <p>
            This invite is for <strong>{invite.email}</strong>, but you&rsquo;re signed in as{' '}
            <strong>{user.email}</strong>.
          </p>
          <p>Sign out and sign back in with the invited email to accept.</p>
        </div>
      )}
    </InviteShell>
  );
}

function InviteShell({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
      <div className="w-full max-w-md bg-white rounded-lg shadow p-6 space-y-4">
        {children}
      </div>
    </main>
  );
}
```

- [ ] **Step 2: Create the client accept button**

```tsx
// src/components/org/accept-invite-button.tsx
'use client';

import { useState } from 'react';

export function AcceptInviteButton({ token }: { token: string }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onClick() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/invite/accept', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ token }),
      });
      if (!res.ok) {
        const json = (await res.json().catch(() => ({}))) as {
          error?: string;
        };
        setError(json.error ?? 'Failed to accept');
        return;
      }
      const { orgId } = (await res.json()) as { orgId: string };

      // Switch the active-org cookie to the new org so /app reflects it.
      await fetch('/api/org/switch', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ orgId }),
      }).catch(() => undefined);

      window.location.href = '/app';
    } catch {
      setError('Failed to accept');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={onClick}
        disabled={busy}
        className="w-full bg-black text-white py-2 px-4 rounded-md disabled:opacity-50"
      >
        {busy ? 'Accepting…' : 'Accept invite'}
      </button>
      {error && (
        <p className="mt-2 text-sm text-red-600" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Typecheck + test suite**

```
npm run type-check
npm run test:run
```
Expected: clean.

- [ ] **Step 4: Commit**

```bash
git add src/app/invite/\[token\]/page.tsx src/components/org/accept-invite-button.tsx
git commit -m "feat: /invite/[token] landing page with accept button"
```

---

### Task 10: Team settings page

**Files:**
- Create: `src/app/app/settings/team/page.tsx`
- Create: `src/components/org/team-settings.tsx`
- Create: `src/components/org/invite-member-form.tsx`

Server component fetches the active org's members + pending invites and renders the client `TeamSettings`. The invite form is its own client component so the parent re-renders on success.

- [ ] **Step 1: Server page**

```tsx
// src/app/app/settings/team/page.tsx
import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { ACTIVE_ORG_COOKIE } from '@/lib/org/active-org';
import { TeamSettings } from '@/components/org/team-settings';
import { redirect } from 'next/navigation';

export default async function TeamSettingsPage() {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) redirect('/auth/login');

  const cookieStore = await cookies();
  const activeOrgId = cookieStore.get(ACTIVE_ORG_COOKIE)?.value;
  if (!activeOrgId) {
    return (
      <div className="p-6">
        <p>No active organisation. Please refresh or re-select from the org switcher.</p>
      </div>
    );
  }

  // My role in the active org — governs what UI to show.
  const { data: roleRow } = await supabase
    .from('organization_members')
    .select('role')
    .eq('org_id', activeOrgId)
    .eq('user_id', user.id)
    .single();

  const myRole = (roleRow?.role ?? 'member') as 'owner' | 'admin' | 'member';

  // Members (joined with auth.users via auth admin if needed — for v1 just
  // show user_id and role; we can enrich with email later if required).
  const { data: members } = await supabase
    .from('organization_members')
    .select('user_id, role, joined_at')
    .eq('org_id', activeOrgId)
    .order('joined_at', { ascending: true });

  const { data: invites } = await supabase
    .from('organization_invites')
    .select('id, email, role, expires_at, created_at')
    .eq('org_id', activeOrgId)
    .is('accepted_at', null)
    .order('created_at', { ascending: false });

  return (
    <div className="p-6">
      <TeamSettings
        myRole={myRole}
        members={members ?? []}
        invites={invites ?? []}
      />
    </div>
  );
}
```

- [ ] **Step 2: TeamSettings client component**

```tsx
// src/components/org/team-settings.tsx
'use client';

import { useRouter } from 'next/navigation';
import { InviteMemberForm } from '@/components/org/invite-member-form';

interface Member {
  user_id: string;
  role: 'owner' | 'admin' | 'member';
  joined_at: string;
}

interface Invite {
  id: string;
  email: string;
  role: 'admin' | 'member';
  expires_at: string;
  created_at: string;
}

export function TeamSettings({
  myRole,
  members,
  invites,
}: {
  myRole: 'owner' | 'admin' | 'member';
  members: Member[];
  invites: Invite[];
}) {
  const router = useRouter();
  const canManage = myRole === 'owner' || myRole === 'admin';

  async function handleCancel(id: string) {
    const res = await fetch(`/api/org/invites/${id}`, {
      method: 'DELETE',
      credentials: 'same-origin',
    });
    if (res.ok) router.refresh();
  }

  return (
    <div className="max-w-2xl space-y-8">
      <section>
        <h2 className="text-xl font-semibold mb-3">Members ({members.length})</h2>
        <ul className="divide-y border rounded">
          {members.map((m) => (
            <li key={m.user_id} className="p-3 text-sm flex justify-between">
              <span className="font-mono text-xs text-gray-600 truncate">
                {m.user_id}
              </span>
              <span className="text-gray-600">{m.role}</span>
            </li>
          ))}
        </ul>
      </section>

      {canManage && (
        <section>
          <h2 className="text-xl font-semibold mb-3">Invite a teammate</h2>
          <InviteMemberForm onSent={() => router.refresh()} />
        </section>
      )}

      <section>
        <h2 className="text-xl font-semibold mb-3">
          Pending invites ({invites.length})
        </h2>
        {invites.length === 0 ? (
          <p className="text-sm text-gray-500">No pending invites.</p>
        ) : (
          <ul className="divide-y border rounded">
            {invites.map((inv) => (
              <li key={inv.id} className="p-3 text-sm flex justify-between items-center">
                <div>
                  <div>{inv.email}</div>
                  <div className="text-xs text-gray-500">
                    {inv.role} · expires {new Date(inv.expires_at).toLocaleDateString()}
                  </div>
                </div>
                {canManage && (
                  <button
                    type="button"
                    onClick={() => handleCancel(inv.id)}
                    className="text-xs text-red-600 hover:underline"
                  >
                    Cancel
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
```

- [ ] **Step 3: InviteMemberForm client component**

```tsx
// src/components/org/invite-member-form.tsx
'use client';

import { useState } from 'react';

export function InviteMemberForm({ onSent }: { onSent: () => void }) {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'admin' | 'member'>('member');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<
    { type: 'error' | 'success'; text: string } | null
  >(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch('/api/org/invites', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ email, role }),
      });
      const json = (await res.json().catch(() => ({}))) as {
        error?: string;
      };
      if (!res.ok) {
        setMessage({
          type: 'error',
          text: json.error ?? 'Failed to send invite',
        });
        return;
      }
      setMessage({ type: 'success', text: `Invite sent to ${email}` });
      setEmail('');
      setRole('member');
      onSent();
    } catch {
      setMessage({ type: 'error', text: 'Failed to send invite' });
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <div>
        <label className="block text-sm font-medium" htmlFor="invite-email">
          Email
        </label>
        <input
          id="invite-email"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full border rounded px-3 py-2 text-sm"
          placeholder="sarah@example.com"
        />
      </div>
      <div>
        <label className="block text-sm font-medium" htmlFor="invite-role">
          Role
        </label>
        <select
          id="invite-role"
          value={role}
          onChange={(e) => setRole(e.target.value as 'admin' | 'member')}
          className="w-full border rounded px-3 py-2 text-sm"
        >
          <option value="member">Member</option>
          <option value="admin">Admin</option>
        </select>
      </div>
      <button
        type="submit"
        disabled={busy}
        className="bg-black text-white px-4 py-2 rounded text-sm disabled:opacity-50"
      >
        {busy ? 'Sending…' : 'Send invite'}
      </button>
      {message && (
        <p
          className={
            message.type === 'error' ? 'text-sm text-red-600' : 'text-sm text-green-600'
          }
          role="status"
        >
          {message.text}
        </p>
      )}
    </form>
  );
}
```

- [ ] **Step 4: Typecheck + test suite**

```
npm run type-check
npm run test:run
```
Expected: all pass.

- [ ] **Step 5: Commit**

```bash
git add src/app/app/settings/team/page.tsx src/components/org/team-settings.tsx src/components/org/invite-member-form.tsx
git commit -m "feat: /app/settings/team page with members, invites, invite form"
```

---

### Task 11: Add "Team" nav link in sidebar

**Files:**
- Modify: `src/components/layout/app-sidebar.tsx`

- [ ] **Step 1: Read the sidebar and find the existing nav links**

Read `src/components/layout/app-sidebar.tsx`. Find where existing nav items render (Dashboard, Bio Pages, etc.). Note the pattern (icon + label + Link).

- [ ] **Step 2: Add the Team link**

Add a new nav entry pointing to `/app/settings/team`. Use the existing icon library (`lucide-react`) — `Users` is a good choice. Match the surrounding styling exactly.

- [ ] **Step 3: Typecheck + suite**

```
npm run type-check
npm run test:run
```
Expected: clean.

- [ ] **Step 4: Commit**

```bash
git add src/components/layout/app-sidebar.tsx
git commit -m "feat: add Team nav link to sidebar"
```

---

## Part 4 — Runbook + manual deploy

### Task 12: Append invite flow section to the runbook

**Files:**
- Modify: `docs/superpowers/runbooks/phase-0-migration.md`

Short section — migration 00022 is low-risk (single partial index on a mostly-empty table), and the rest is app code.

- [ ] **Step 1: Append**

Append at the end of `docs/superpowers/runbooks/phase-0-migration.md`:

```markdown

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
```

- [ ] **Step 2: Commit**

```bash
git add docs/superpowers/runbooks/phase-0-migration.md
git commit -m "docs: add invite flow deploy section to runbook"
```

---

### Task 13 (MANUAL): Apply migration 00022 to production + deploy app

Operator task. Not a subagent task.

- [ ] Follow the runbook's Invite Flow section.
- [ ] Do a full invite round-trip (owner sends → invitee receives → accept).
- [ ] Log a Production entry in the runbook completion log.
- [ ] Commit runbook update.

---

## Completion criteria

Invite flow is complete when:

1. Migration 00022 applied in production.
2. `RESEND_API_KEY` confirmed set in prod.
3. End-to-end invite round-trip succeeds (owner → email → accept → membership visible in org).
4. Test suite passes on tip.
5. Runbook has a Production entry.
6. Feature branch merged to main and deployed.

After invites ship, **multi-user orgs are actually useful** and every foundation feature lights up. Next candidate work: pricing tiers (cheap, already have the `plan` column), super-admin dashboard (unblocks shopfront), or H1 SMB features.
