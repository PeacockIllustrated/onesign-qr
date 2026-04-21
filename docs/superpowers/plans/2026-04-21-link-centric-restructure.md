# Link-Centric Restructure Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reframe the primary user-facing concept from "QR code" to "Link" — a managed redirect with attachable carriers (QR code always-free, NFC chips Pro-gated) — without breaking any existing production redirects.

**Architecture:** Additive `carrier` column on `qr_codes` (default `'qr'`, covers all existing rows). Redirect handler untouched. API endpoints gain a Pro-plan check before accepting `carrier != 'qr'`. The `/app/new` page is restructured into "Create a Link" with carrier cards; direct QR creation moves to a new `/app/qr/direct/new` page with a confirmation modal nudge.

**Tech Stack:** Next.js App Router 16, React 19, TypeScript, Supabase (Postgres + RLS), Zod, Vitest.

**Spec reference:** [docs/superpowers/specs/2026-04-21-link-centric-restructure-design.md](../specs/2026-04-21-link-centric-restructure-design.md)

---

## Non-Negotiable Constraints (repeat from spec)

1. **Existing production links must not break.** Every `/r/<slug>` that resolves today must resolve identically after this change.
2. **The redirect handler (`src/app/r/[slug]/route.ts`) must not be modified in this plan.**
3. **Migrations are additive only** — no column drops, no type changes, no renames.
4. **Direct QRs (`mode = 'direct'`) keep working** — no data migration, no redirects broken.

---

## File Structure

### Created
- `supabase/migrations/00025_qr_carrier.sql` — additive migration
- `src/lib/org/get-active-org-plan.ts` — helper returning `'free' | 'pro'` for the current user's active org
- `src/__tests__/lib/org/get-active-org-plan.test.ts` — unit tests for helper
- `src/components/qr/carrier-card.tsx` — shared carrier card UI (QR + NFC variants, locked state)
- `src/components/qr/direct-qr-confirmation-modal.tsx` — "are you sure?" modal
- `src/components/qr/link-list-filter.tsx` — dashboard filter chips (All/QR/NFC/Direct)
- `src/components/qr/carrier-badge.tsx` — small pill showing carrier on list/detail pages
- `src/app/app/qr/direct/new/page.tsx` — direct QR generator page
- `src/__tests__/app/api/qr/create.test.ts` — POST /api/qr tests including Pro-gate
- `src/__tests__/app/api/qr/update.test.ts` — PATCH /api/qr/[id] tests including Pro-gate
- `src/__tests__/app/api/qr/carrier-regression.test.ts` — guarantees existing-row behaviour

### Modified
- `src/types/qr.ts` — add `QRCarrier` type + field on records/requests
- `src/validations/qr.ts` — add `carrier` to `createQRSchema`, `updateQRSchema`
- `src/app/api/qr/route.ts` — persist `carrier` + Pro-gate
- `src/app/api/qr/[id]/route.ts` — accept `carrier` on PATCH + Pro-gate
- `src/app/app/new/page.tsx` — Link-first layout with carrier cards
- `src/app/app/page.tsx` — carrier badge on each row + filter chips
- `src/app/app/qr/[id]/page.tsx` — carrier badge in header + copy tweaks
- `src/components/qr/qr-detail-client.tsx` — add carrier sections + pass Pro plan
- `src/components/layout/app-sidebar.tsx` — "Create QR" → "Create Link"; add "One-off QR" item

### Explicitly untouched (safety)
- `src/app/r/[slug]/route.ts`
- `qr_scan_events` table + scan logic
- `qr_styles`, `qr_assets` tables
- `/pricing`, `/` marketing pages

---

## Task 1: Migration — add `carrier` column

**Files:**
- Create: `supabase/migrations/00025_qr_carrier.sql`

- [ ] **Step 1: Write the migration SQL**

```sql
-- supabase/migrations/00025_qr_carrier.sql
--
-- Adds the carrier column to qr_codes. Additive, non-breaking:
-- - Default 'qr' means every existing row becomes carrier='qr' without any
--   semantic change.
-- - Only meaningful when mode='managed'; ignored for mode='direct'.
-- - The redirect handler (src/app/r/[slug]/route.ts) does not consult this
--   column, so no runtime behaviour changes.

ALTER TABLE qr_codes
  ADD COLUMN carrier text NOT NULL DEFAULT 'qr'
  CHECK (carrier IN ('qr', 'nfc', 'both'));

COMMENT ON COLUMN qr_codes.carrier IS
  'User intent about physical delivery of a managed link. qr = printable QR only (default), nfc = NFC chips only, both = QR + NFC campaign. Only meaningful when mode = managed; ignored for mode = direct.';
```

- [ ] **Step 2: Lint the migration (catch schema mistakes early)**

Run: `npm run migration:schema-lint`
Expected: Exit 0. No errors reported.

- [ ] **Step 3: Apply migration to local Supabase**

Run: `npx supabase db push`
Expected: Migration applies cleanly. No rows affected (DDL only).

- [ ] **Step 4: Verify defaults applied correctly**

Run: `npx supabase db dump --schema=public --data-only --table=qr_codes | grep -c "carrier" || echo "no rows" ` (dev DB may be empty — not an error)
Or in SQL console:

```sql
SELECT COUNT(*) FROM qr_codes WHERE carrier NOT IN ('qr','nfc','both');
-- Expected: 0
SELECT COUNT(*) FROM qr_codes WHERE carrier IS NULL;
-- Expected: 0
```

Expected: Both queries return 0.

- [ ] **Step 5: Manual regression — existing slug still redirects**

With dev server running (`npm run dev`), open `/r/<any-existing-slug>` in a browser.
Expected: 307 redirect to the destination URL (unchanged behaviour).

- [ ] **Step 6: Commit**

```bash
git add supabase/migrations/00025_qr_carrier.sql
git commit -m "feat(db): add carrier column to qr_codes (default 'qr')"
```

---

## Task 2: Types — add `QRCarrier`

**Files:**
- Modify: `src/types/qr.ts`

- [ ] **Step 1: Add `QRCarrier` type and update record/request interfaces**

Edit `src/types/qr.ts` — apply these changes:

1. After the `QRMode` declaration near the top (line 11), add:

```ts
// QR carrier — user intent about physical delivery. Only meaningful when mode='managed'.
export type QRCarrier = 'qr' | 'nfc' | 'both';
```

2. In the `QRCode` interface (around line 57), add the `carrier` field after `slug`:

```ts
export interface QRCode {
  id: string;
  owner_id: string;
  name: string;
  mode: QRMode;
  slug: string | null;
  carrier: QRCarrier;
  destination_url: string;
  is_active: boolean;
  analytics_enabled: boolean;
  total_scans: number;
  last_scanned_at: string | null;
  created_at: string;
  updated_at: string;
}
```

3. In `CreateQRRequest`, add optional carrier:

```ts
export interface CreateQRRequest {
  name: string;
  mode: QRMode;
  destination_url: string;
  slug?: string;
  carrier?: QRCarrier;
  analytics_enabled?: boolean;
  style?: Partial<QRStyleConfig>;
}
```

4. In `UpdateQRRequest`, add optional carrier:

```ts
export interface UpdateQRRequest {
  name?: string;
  destination_url?: string;
  is_active?: boolean;
  analytics_enabled?: boolean;
  carrier?: QRCarrier;
}
```

- [ ] **Step 2: Type-check the project**

Run: `npm run type-check`
Expected: PASS (no new errors introduced by adding the optional field). If errors appear in unrelated files they were pre-existing and out of scope.

- [ ] **Step 3: Commit**

```bash
git add src/types/qr.ts
git commit -m "feat(types): add QRCarrier type to QR record/request interfaces"
```

---

## Task 3: Validation — extend Zod schemas

**Files:**
- Modify: `src/validations/qr.ts`

- [ ] **Step 1: Add carrier to create + update schemas**

Edit `src/validations/qr.ts`:

1. Near the other `z.enum` declarations (before `createQRSchema`), add:

```ts
export const carrier = z.enum(['qr', 'nfc', 'both']);
```

2. In `createQRSchema`, add `carrier` field:

```ts
export const createQRSchema = z.object({
  name: z
    .string()
    .min(1, 'Name is required')
    .max(100, 'Name must be at most 100 characters')
    .transform((s) => s.trim()),
  mode: z.enum(['managed', 'direct']).default('managed'),
  destination_url: z
    .string()
    .min(1, 'URL is required')
    .max(2048, 'URL is too long'),
  slug: slug,
  carrier: carrier.default('qr'),
  analytics_enabled: z.boolean().default(true),
  style: qrStyleSchema.partial().optional(),
});
```

3. In `updateQRSchema`, add optional `carrier` field:

```ts
export const updateQRSchema = z.object({
  name: z
    .string()
    .min(1, 'Name is required')
    .max(100, 'Name must be at most 100 characters')
    .transform((s) => s.trim())
    .optional(),
  destination_url: z
    .string()
    .min(1, 'URL is required')
    .max(2048, 'URL is too long')
    .optional(),
  is_active: z.boolean().optional(),
  analytics_enabled: z.boolean().optional(),
  carrier: carrier.optional(),
});
```

- [ ] **Step 2: Type-check the project**

Run: `npm run type-check`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/validations/qr.ts
git commit -m "feat(validation): accept carrier field in QR create/update schemas"
```

---

## Task 4: Pro plan helper + unit tests

**Files:**
- Create: `src/lib/org/get-active-org-plan.ts`
- Create: `src/__tests__/lib/org/get-active-org-plan.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/__tests__/lib/org/get-active-org-plan.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockClient: any = {
  from: vi.fn(),
};

const mockResolveActiveOrgId = vi.fn();
vi.mock('@/lib/org/active-org', () => ({
  resolveActiveOrgId: (...args: unknown[]) => mockResolveActiveOrgId(...args),
}));

import { getActiveOrgPlan } from '@/lib/org/get-active-org-plan';

function mockSelectSingle(result: { data: unknown; error: unknown }) {
  const single = vi.fn().mockResolvedValue(result);
  const eq = vi.fn(() => ({ single }));
  const select = vi.fn(() => ({ eq }));
  mockClient.from.mockReturnValue({ select });
  return { single, eq, select };
}

describe('getActiveOrgPlan', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 'pro' when the active org is on the pro plan", async () => {
    mockResolveActiveOrgId.mockResolvedValue({ orgId: 'org-1', wasReset: false });
    mockSelectSingle({ data: { plan: 'pro' }, error: null });

    const plan = await getActiveOrgPlan(mockClient, 'user-1');

    expect(plan).toBe('pro');
    expect(mockClient.from).toHaveBeenCalledWith('organizations');
  });

  it("returns 'free' when the active org is on the free plan", async () => {
    mockResolveActiveOrgId.mockResolvedValue({ orgId: 'org-1', wasReset: false });
    mockSelectSingle({ data: { plan: 'free' }, error: null });

    const plan = await getActiveOrgPlan(mockClient, 'user-1');

    expect(plan).toBe('free');
  });

  it("defaults to 'free' when the lookup errors", async () => {
    mockResolveActiveOrgId.mockResolvedValue({ orgId: 'org-1', wasReset: false });
    mockSelectSingle({ data: null, error: { message: 'boom' } });

    const plan = await getActiveOrgPlan(mockClient, 'user-1');

    expect(plan).toBe('free');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/__tests__/lib/org/get-active-org-plan.test.ts`
Expected: FAIL with import error (module does not exist).

- [ ] **Step 3: Implement the helper**

Create `src/lib/org/get-active-org-plan.ts`:

```ts
import type { SupabaseClient } from '@supabase/supabase-js';
import type { OrganizationPlan } from '@/types/organization';
import { resolveActiveOrgId } from '@/lib/org/active-org';

/**
 * Returns the plan ('free' | 'pro') of the user's active organization.
 *
 * Falls back to 'free' on any error — callers treat it as the safe/default
 * tier. Pro features must be positively opted into; a lookup failure never
 * grants Pro.
 */
export async function getActiveOrgPlan(
  client: SupabaseClient,
  userId: string
): Promise<OrganizationPlan> {
  try {
    const { orgId } = await resolveActiveOrgId(client, userId);

    const { data, error } = await client
      .from('organizations')
      .select('plan')
      .eq('id', orgId)
      .single();

    if (error || !data) {
      return 'free';
    }

    return (data.plan as OrganizationPlan) ?? 'free';
  } catch {
    return 'free';
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/__tests__/lib/org/get-active-org-plan.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/org/get-active-org-plan.ts src/__tests__/lib/org/get-active-org-plan.test.ts
git commit -m "feat(org): add getActiveOrgPlan helper with safe 'free' fallback"
```

---

## Task 5: API — POST /api/qr persists carrier + Pro-gate

**Files:**
- Modify: `src/app/api/qr/route.ts`
- Create: `src/__tests__/app/api/qr/create.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `src/__tests__/app/api/qr/create.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockSupabase: any = {
  auth: { getUser: vi.fn() },
  from: vi.fn(),
  rpc: vi.fn(),
};
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(async () => mockSupabase),
}));

vi.mock('@/lib/security/url-validator', () => ({
  validateUrlStrict: vi.fn(async () => ({
    isValid: true,
    normalizedUrl: 'https://example.com/',
  })),
}));

vi.mock('@/lib/security/rate-limiter', () => ({
  checkQrCreateLimit: vi.fn(() => ({ success: true })),
  checkApiLimit: vi.fn(() => ({ success: true })),
  getRateLimitHeaders: vi.fn(() => ({})),
}));

vi.mock('@/lib/org/get-personal-org', () => ({
  getPersonalOrgId: vi.fn(async () => 'org-1'),
}));

const mockGetActiveOrgPlan = vi.fn();
vi.mock('@/lib/org/get-active-org-plan', () => ({
  getActiveOrgPlan: (...args: unknown[]) => mockGetActiveOrgPlan(...args),
}));

vi.mock('@/lib/audit', () => ({
  writeAuditLog: vi.fn(),
}));

import { POST } from '@/app/api/qr/route';

function jsonRequest(body: unknown) {
  return new Request('http://localhost:3000/api/qr', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  }) as any;
}

function setupAuthedUser() {
  mockSupabase.auth.getUser.mockResolvedValue({
    data: { user: { id: 'user-1' } },
    error: null,
  });
}

function setupInsertSuccess() {
  mockSupabase.rpc.mockResolvedValue({ data: 'generated-slug', error: null });
  const single = vi.fn().mockResolvedValue({
    data: { id: 'qr-new-id' },
    error: null,
  });
  const select = vi.fn(() => ({ single }));
  const insert = vi.fn(() => ({ select }));
  const update = vi.fn(() => ({ eq: vi.fn() }));
  mockSupabase.from.mockImplementation((table: string) => {
    if (table === 'qr_codes') return { insert };
    if (table === 'qr_styles') return { update };
    return {};
  });
  return { insert };
}

describe('POST /api/qr — carrier handling', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("defaults carrier to 'qr' when omitted and persists it", async () => {
    setupAuthedUser();
    mockGetActiveOrgPlan.mockResolvedValue('free');
    const { insert } = setupInsertSuccess();

    const res = await POST(jsonRequest({
      name: 'My Link',
      mode: 'managed',
      destination_url: 'https://example.com',
    }));

    expect(res.status).toBe(201);
    expect(insert).toHaveBeenCalledWith(
      expect.objectContaining({ carrier: 'qr' })
    );
  });

  it("rejects carrier='nfc' for free orgs with 403 pro_plan_required", async () => {
    setupAuthedUser();
    mockGetActiveOrgPlan.mockResolvedValue('free');

    const res = await POST(jsonRequest({
      name: 'My Link',
      mode: 'managed',
      destination_url: 'https://example.com',
      carrier: 'nfc',
    }));

    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error).toBe('pro_plan_required');
  });

  it("rejects carrier='both' for free orgs with 403", async () => {
    setupAuthedUser();
    mockGetActiveOrgPlan.mockResolvedValue('free');

    const res = await POST(jsonRequest({
      name: 'My Link',
      mode: 'managed',
      destination_url: 'https://example.com',
      carrier: 'both',
    }));

    expect(res.status).toBe(403);
  });

  it("accepts carrier='both' for pro orgs and persists it", async () => {
    setupAuthedUser();
    mockGetActiveOrgPlan.mockResolvedValue('pro');
    const { insert } = setupInsertSuccess();

    const res = await POST(jsonRequest({
      name: 'My Link',
      mode: 'managed',
      destination_url: 'https://example.com',
      carrier: 'both',
    }));

    expect(res.status).toBe(201);
    expect(insert).toHaveBeenCalledWith(
      expect.objectContaining({ carrier: 'both' })
    );
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/__tests__/app/api/qr/create.test.ts`
Expected: FAIL — tests fail because the route doesn't yet check the plan or persist carrier.

- [ ] **Step 3: Modify the POST handler**

Edit `src/app/api/qr/route.ts`:

1. Add the import near the other lib imports:

```ts
import { getActiveOrgPlan } from '@/lib/org/get-active-org-plan';
```

2. After the `parsed = createQRSchema.safeParse(body)` block succeeds, destructure `carrier` too:

```ts
const { name, mode, destination_url, slug, carrier, analytics_enabled, style } = parsed.data;
```

3. Immediately after that destructure, add the Pro-gate check:

```ts
// Pro-gate: only Pro orgs may set carrier != 'qr'
if (carrier !== 'qr') {
  const plan = await getActiveOrgPlan(supabase, user.id);
  if (plan !== 'pro') {
    return NextResponse.json(
      { error: 'pro_plan_required' },
      { status: 403 }
    );
  }
}
```

4. In the `.insert({...})` call, add `carrier` to the row:

```ts
const { data: created, error: createError } = await supabase
  .from('qr_codes')
  .insert({
    owner_id: user.id,
    org_id: orgId,
    name,
    mode,
    slug: mode === 'managed' ? finalSlug : null,
    carrier,
    destination_url: urlValidation.normalizedUrl,
    analytics_enabled: mode === 'managed' ? analytics_enabled : false,
  })
  .select()
  .single();
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/__tests__/app/api/qr/create.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Full test suite passes**

Run: `npm run test:run`
Expected: PASS. No regressions in other API tests (the carrier default means existing test fixtures still validate).

- [ ] **Step 6: Commit**

```bash
git add src/app/api/qr/route.ts src/__tests__/app/api/qr/create.test.ts
git commit -m "feat(api): POST /api/qr persists carrier with Pro gate"
```

---

## Task 6: API — PATCH /api/qr/[id] accepts carrier + Pro-gate

**Files:**
- Modify: `src/app/api/qr/[id]/route.ts`
- Create: `src/__tests__/app/api/qr/update.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `src/__tests__/app/api/qr/update.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockSupabase: any = {
  auth: { getUser: vi.fn() },
  from: vi.fn(),
};
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(async () => mockSupabase),
}));

vi.mock('@/lib/security/rate-limiter', () => ({
  checkApiLimit: vi.fn(() => ({ success: true })),
  getRateLimitHeaders: vi.fn(() => ({})),
}));

const mockGetActiveOrgPlan = vi.fn();
vi.mock('@/lib/org/get-active-org-plan', () => ({
  getActiveOrgPlan: (...args: unknown[]) => mockGetActiveOrgPlan(...args),
}));

vi.mock('@/lib/audit', () => ({
  writeAuditLog: vi.fn(),
  determineUpdateAction: vi.fn(() => 'updated'),
}));

import { PATCH } from '@/app/api/qr/[id]/route';

const VALID_UUID = '11111111-1111-1111-1111-111111111111';

function jsonRequest(body: unknown) {
  return new Request(`http://localhost:3000/api/qr/${VALID_UUID}`, {
    method: 'PATCH',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  }) as any;
}

function setupAuthedUser() {
  mockSupabase.auth.getUser.mockResolvedValue({
    data: { user: { id: 'user-1' } },
    error: null,
  });
}

function setupExistingQR(mode: 'managed' | 'direct' = 'managed') {
  const single = vi.fn().mockResolvedValue({
    data: {
      id: VALID_UUID,
      owner_id: 'user-1',
      mode,
      destination_url: 'https://old.example.com',
      name: 'Existing',
      is_active: true,
      analytics_enabled: true,
    },
    error: null,
  });
  // select chain: supabase.from().select().eq().eq().is().single()
  const isMethod = vi.fn(() => ({ single }));
  const eq2 = vi.fn(() => ({ is: isMethod }));
  const eq1 = vi.fn(() => ({ eq: eq2 }));
  const select = vi.fn(() => ({ eq: eq1 }));
  // update chain
  const updateEq2 = vi.fn().mockResolvedValue({ error: null });
  const updateEq1 = vi.fn(() => ({ eq: updateEq2 }));
  const update = vi.fn(() => ({ eq: updateEq1 }));
  // post-update fetch chain
  const fetchSingle = vi
    .fn()
    .mockResolvedValue({ data: { id: VALID_UUID, carrier: 'qr' } });
  const fetchEq = vi.fn(() => ({ single: fetchSingle }));
  const fetchSelect = vi.fn(() => ({ eq: fetchEq }));
  mockSupabase.from.mockImplementation((table: string) => {
    if (table === 'qr_codes') {
      // first call: select(existing); later call: update(...); later: select(fresh)
      return { select: vi.fn()
        .mockImplementationOnce(() => ({ eq: eq1 }))
        .mockImplementationOnce(() => ({ eq: fetchEq })), update };
    }
    if (table === 'qr_styles') {
      return { update: vi.fn(() => ({ eq: vi.fn().mockResolvedValue({ error: null }) })) };
    }
    return {};
  });
  return { update };
}

async function callPatch(body: unknown) {
  return PATCH(jsonRequest(body), { params: Promise.resolve({ id: VALID_UUID }) } as any);
}

describe('PATCH /api/qr/[id] — carrier handling', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejects carrier='nfc' for free orgs with 403 pro_plan_required", async () => {
    setupAuthedUser();
    setupExistingQR();
    mockGetActiveOrgPlan.mockResolvedValue('free');

    const res = await callPatch({ carrier: 'nfc' });

    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error).toBe('pro_plan_required');
  });

  it("accepts carrier='both' for pro orgs and writes it", async () => {
    setupAuthedUser();
    const { update } = setupExistingQR();
    mockGetActiveOrgPlan.mockResolvedValue('pro');

    const res = await callPatch({ carrier: 'both' });

    expect(res.status).toBe(200);
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({ carrier: 'both' })
    );
  });

  it("accepts carrier='qr' for free orgs", async () => {
    setupAuthedUser();
    const { update } = setupExistingQR();
    mockGetActiveOrgPlan.mockResolvedValue('free');

    const res = await callPatch({ carrier: 'qr' });

    expect(res.status).toBe(200);
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({ carrier: 'qr' })
    );
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/__tests__/app/api/qr/update.test.ts`
Expected: FAIL — handler doesn't check plan or persist carrier yet.

- [ ] **Step 3: Modify the PATCH handler**

Edit `src/app/api/qr/[id]/route.ts`:

1. Add the import:

```ts
import { getActiveOrgPlan } from '@/lib/org/get-active-org-plan';
```

2. Inside the `PATCH` function, after `const parsed = updateQRSchema.safeParse(qrFields);` succeeds, add the Pro-gate check + carrier persistence:

Replace the block:

```ts
      if (parsed.data.name) qrUpdate.name = parsed.data.name;
      if (parsed.data.is_active !== undefined) qrUpdate.is_active = parsed.data.is_active;
      if (parsed.data.analytics_enabled !== undefined) {
        qrUpdate.analytics_enabled = parsed.data.analytics_enabled;
      }
    }
```

with:

```ts
      if (parsed.data.name) qrUpdate.name = parsed.data.name;
      if (parsed.data.is_active !== undefined) qrUpdate.is_active = parsed.data.is_active;
      if (parsed.data.analytics_enabled !== undefined) {
        qrUpdate.analytics_enabled = parsed.data.analytics_enabled;
      }

      if (parsed.data.carrier !== undefined) {
        // Pro-gate: only Pro orgs may set carrier != 'qr'
        if (parsed.data.carrier !== 'qr') {
          const plan = await getActiveOrgPlan(supabase, user.id);
          if (plan !== 'pro') {
            return NextResponse.json(
              { error: 'pro_plan_required' },
              { status: 403 }
            );
          }
        }
        qrUpdate.carrier = parsed.data.carrier;
      }
    }
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/__tests__/app/api/qr/update.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Full test suite passes**

Run: `npm run test:run`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/app/api/qr/[id]/route.ts src/__tests__/app/api/qr/update.test.ts
git commit -m "feat(api): PATCH /api/qr/[id] accepts carrier with Pro gate"
```

---

## Task 7: Regression test — redirect handler unchanged

**Files:**
- Create: `src/__tests__/app/api/qr/carrier-regression.test.ts`

- [ ] **Step 1: Write the regression test**

Create `src/__tests__/app/api/qr/carrier-regression.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockAdminClient: any = {
  from: vi.fn(),
};
vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: vi.fn(() => mockAdminClient),
}));

vi.mock('@/lib/security/url-validator', () => ({
  validateRedirectUrl: vi.fn(() => true),
}));

import { GET } from '@/app/r/[slug]/route';

function mockLookupResult(row: unknown) {
  const single = vi.fn().mockResolvedValue({ data: row, error: null });
  const modeEq = vi.fn(() => ({ single }));
  const slugEq = vi.fn(() => ({ eq: modeEq }));
  const select = vi.fn(() => ({ eq: slugEq }));
  mockAdminClient.from.mockReturnValue({ select });
}

describe('Redirect handler — carrier column does not affect resolution', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("redirects a managed link with carrier='qr' (the default for existing rows)", async () => {
    mockLookupResult({
      id: 'qr-1',
      destination_url: 'https://example.com/menu',
      is_active: true,
      analytics_enabled: false,
    });
    const req = new Request('http://localhost/r/hello', {}) as any;
    const res = await GET(req, { params: Promise.resolve({ slug: 'hello' }) } as any);

    expect(res.status).toBe(307);
    expect(res.headers.get('location')).toBe('https://example.com/menu');
  });

  it("still returns 307 even though the handler never reads carrier", async () => {
    mockLookupResult({
      id: 'qr-2',
      destination_url: 'https://other.example/x',
      is_active: true,
      analytics_enabled: false,
    });
    const req = new Request('http://localhost/r/tag', {}) as any;
    const res = await GET(req, { params: Promise.resolve({ slug: 'tag' }) } as any);

    expect(res.status).toBe(307);
  });
});
```

- [ ] **Step 2: Run test to verify it passes immediately**

Run: `npx vitest run src/__tests__/app/api/qr/carrier-regression.test.ts`
Expected: PASS (2 tests). This test guards the redirect handler's independence from the carrier column going forward — adding/removing tests should not change that.

- [ ] **Step 3: Commit**

```bash
git add src/__tests__/app/api/qr/carrier-regression.test.ts
git commit -m "test: regression guard for carrier-agnostic redirect handler"
```

---

## Task 8: Shared `CarrierBadge` component

**Files:**
- Create: `src/components/qr/carrier-badge.tsx`

- [ ] **Step 1: Implement the component**

Create `src/components/qr/carrier-badge.tsx`:

```tsx
import type { QRCarrier, QRMode } from '@/types/qr';

interface CarrierBadgeProps {
  mode: QRMode;
  carrier: QRCarrier;
}

/**
 * Small pill showing a Link's carrier (QR / NFC / QR + NFC) or "Direct"
 * for direct-mode QRs. Used on the dashboard list and detail page header.
 */
export function CarrierBadge({ mode, carrier }: CarrierBadgeProps) {
  if (mode === 'direct') {
    return (
      <span className="inline-flex items-center px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wider rounded-full bg-zinc-800 text-zinc-500 border border-zinc-700">
        Direct
      </span>
    );
  }

  const label =
    carrier === 'both' ? 'QR + NFC' : carrier === 'nfc' ? 'NFC' : 'QR';
  const accent = carrier === 'qr'
    ? 'bg-zinc-800 text-zinc-300 border-zinc-700'
    : 'bg-lynx-500/15 text-lynx-400 border-lynx-400/30';

  return (
    <span className={`inline-flex items-center px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wider rounded-full border ${accent}`}>
      {label}
    </span>
  );
}
```

- [ ] **Step 2: Type-check**

Run: `npm run type-check`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/components/qr/carrier-badge.tsx
git commit -m "feat(ui): add CarrierBadge component"
```

---

## Task 9: `CarrierCard` component (locked-state aware)

**Files:**
- Create: `src/components/qr/carrier-card.tsx`

- [ ] **Step 1: Implement the component**

Create `src/components/qr/carrier-card.tsx`:

```tsx
'use client';

import Link from 'next/link';
import { Lock, QrCode, Nfc } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui';

interface CarrierCardProps {
  variant: 'qr' | 'nfc';
  /** 'free' | 'pro' — only relevant for variant='nfc'. QR is always free. */
  plan?: 'free' | 'pro';
  /** Whether the user has enabled the NFC carrier. Ignored for variant='qr'. */
  enabled?: boolean;
  /** Toggle enabled state. Ignored for variant='qr'. */
  onEnabledChange?: (next: boolean) => void;
  /** The interactive content (e.g., QR style panel, NFC order button). */
  children?: React.ReactNode;
}

/**
 * Carrier card: a section on /app/new and /app/qr/[id] representing a
 * physical expression of the Link. QR is always enabled and free; NFC
 * is Pro-gated and rendered in a locked/greyed-out state for Free orgs.
 */
export function CarrierCard({
  variant,
  plan = 'free',
  enabled = false,
  onEnabledChange,
  children,
}: CarrierCardProps) {
  if (variant === 'qr') {
    return (
      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <QrCode className="h-4 w-4 text-lynx-400" />
            QR code
            <span className="ml-1 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider rounded bg-zinc-800 text-zinc-400">
              Free
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>{children}</CardContent>
      </Card>
    );
  }

  // NFC variant
  const locked = plan !== 'pro';

  return (
    <Card className={locked ? 'opacity-70' : undefined} aria-disabled={locked || undefined}>
      <CardHeader className="flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2 text-base">
          {locked ? (
            <Lock className="h-4 w-4 text-zinc-500" />
          ) : (
            <Nfc className="h-4 w-4 text-lynx-400" />
          )}
          NFC chips
          <span className="ml-1 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider rounded bg-lynx-500/15 text-lynx-400 border border-lynx-400/20">
            Pro
          </span>
        </CardTitle>
        {!locked && onEnabledChange && (
          <label className="flex items-center gap-2 text-xs text-zinc-400">
            <input
              type="checkbox"
              checked={enabled}
              onChange={(e) => onEnabledChange(e.target.checked)}
              className="rounded border-input"
            />
            Enable
          </label>
        )}
      </CardHeader>
      <CardContent>
        {locked ? (
          <div className="space-y-3">
            <p className="text-sm text-zinc-400">
              NFC cards let customers tap-to-connect — no scanning needed.
              Pre-programmed before dispatch; change the destination any time from your Link page.
            </p>
            <Link
              href="/pricing"
              className="inline-flex items-center gap-2 text-sm font-medium text-lynx-400 hover:text-lynx-300"
            >
              Upgrade to Pro
              <span aria-hidden>→</span>
            </Link>
          </div>
        ) : (
          children ?? (
            <p className="text-sm text-zinc-400">
              Order pre-programmed NFC chips for this Link. We&apos;ll print and programme
              them with the redirect URL before dispatch — you manage the destination from
              your dashboard.
            </p>
          )
        )}
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 2: Type-check**

Run: `npm run type-check`
Expected: PASS.

- [ ] **Step 3: Lint**

Run: `npm run lint`
Expected: No new errors.

- [ ] **Step 4: Commit**

```bash
git add src/components/qr/carrier-card.tsx
git commit -m "feat(ui): add CarrierCard component with Pro-locked NFC state"
```

---

## Task 10: Restructure `/app/new` as "Create a Link"

**Files:**
- Modify: `src/app/app/new/page.tsx`
- Create: `src/app/app/new/get-plan.ts` (small server helper to expose the plan to the client page)

> Note: `/app/new/page.tsx` is currently a client component. Keep it client-side; fetch the plan once on mount via a tiny API call (reuse existing patterns) or inject it via a server wrapper. Simpler: add a lightweight server action that returns the current plan. But the pattern elsewhere in this repo reads the user via `supabase.auth.getUser()` on the client. For consistency, we'll fetch the plan via a new `/api/org/current-plan` route.

**Files (revised):**
- Create: `src/app/api/org/current-plan/route.ts`
- Modify: `src/app/app/new/page.tsx`

- [ ] **Step 1: Create the plan-lookup API**

Create `src/app/api/org/current-plan/route.ts`:

```ts
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getActiveOrgPlan } from '@/lib/org/get-active-org-plan';

/**
 * GET /api/org/current-plan
 * Returns the plan ('free' | 'pro') of the authenticated user's active org.
 * Used by client components that need to render Pro gates.
 */
export async function GET() {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const plan = await getActiveOrgPlan(supabase, user.id);
  return NextResponse.json({ plan });
}
```

- [ ] **Step 2: Rewrite `/app/new` page to Link-first layout**

Replace the entire contents of `src/app/app/new/page.tsx` with:

```tsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Link2, AlertCircle } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import {
  Button,
  Input,
  Label,
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  useToast,
} from '@/components/ui';
import { CarrierCard } from '@/components/qr/carrier-card';
import { QRPreview } from '@/components/qr/qr-preview';
import { StylePanel } from '@/components/qr/style-panel';
import { validateUrl } from '@/lib/security/url-validator';
import { QR_DEFAULTS } from '@/lib/constants';
import type { QRStyleConfig, QRCarrier } from '@/types/qr';

export default function CreateLinkPage() {
  const router = useRouter();
  const search = useSearchParams();
  const { addToast } = useToast();
  const supabase = createClient();

  // Prefill destination URL if passed from the direct-qr page
  const prefilledUrl = search.get('url') ?? '';

  // Form state
  const [name, setName] = useState('');
  const [destinationUrl, setDestinationUrl] = useState(prefilledUrl);
  const [slug, setSlug] = useState('');
  const [analyticsEnabled, setAnalyticsEnabled] = useState(true);
  const [nfcEnabled, setNfcEnabled] = useState(false);

  // Plan state (fetched on mount)
  const [plan, setPlan] = useState<'free' | 'pro'>('free');

  // Style state
  const [style, setStyle] = useState<QRStyleConfig>({
    foregroundColor: '#000000',
    backgroundColor: '#FFFFFF',
    errorCorrection: 'M',
    quietZone: QR_DEFAULTS.QUIET_ZONE,
    moduleShape: 'square',
    eyeShape: 'square',
    logoMode: 'none',
    logoDataUrl: undefined,
    logoSizeRatio: QR_DEFAULTS.DEFAULT_LOGO_RATIO,
  });

  const [isLoading, setIsLoading] = useState(false);
  const [urlError, setUrlError] = useState<string | null>(null);

  // Fetch current org plan on mount
  useEffect(() => {
    fetch('/api/org/current-plan')
      .then((r) => r.json())
      .then((data) => {
        if (data?.plan === 'pro') setPlan('pro');
      })
      .catch(() => {
        // Leave plan as 'free' on error — Pro features stay gated
      });
  }, []);

  // Validate URL on change
  useEffect(() => {
    if (!destinationUrl) {
      setUrlError(null);
      return;
    }
    const result = validateUrl(destinationUrl);
    setUrlError(result.isValid ? null : result.error || 'Invalid URL');
  }, [destinationUrl]);

  const previewUrl =
    `${process.env.NEXT_PUBLIC_APP_URL || 'https://example.com'}/r/${slug || 'preview'}`;

  // Derive carrier intent from toggled sections
  const carrier: QRCarrier = nfcEnabled && plan === 'pro' ? 'both' : 'qr';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name || !destinationUrl) {
      addToast({ title: 'Please fill in all required fields', variant: 'error' });
      return;
    }
    if (urlError) {
      addToast({ title: 'Please fix the URL error', variant: 'error' });
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch('/api/qr', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          name,
          mode: 'managed',
          destination_url: destinationUrl,
          slug: slug || undefined,
          carrier,
          analytics_enabled: analyticsEnabled,
          style: {
            foreground_color: style.foregroundColor,
            background_color: style.backgroundColor,
            error_correction: style.errorCorrection,
            quiet_zone: style.quietZone,
            module_shape: style.moduleShape,
            eye_shape: style.eyeShape,
          },
        }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        if (body.error === 'pro_plan_required') {
          addToast({
            title: 'NFC chips require a Pro plan',
            description: 'Upgrade at /pricing to enable NFC carriers.',
            variant: 'error',
          });
        } else {
          addToast({
            title: 'Failed to create Link',
            description: body.error || 'Unknown error',
            variant: 'error',
          });
        }
        return;
      }

      const { id } = await res.json();
      addToast({ title: 'Link created!', variant: 'success' });
      router.push(`/app/qr/${id}`);
    } catch (error: any) {
      addToast({
        title: 'Failed to create Link',
        description: error.message,
        variant: 'error',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="mb-8">
        <Link
          href="/app"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-4"
        >
          <ArrowLeft className="h-4 w-4" />
          back to dashboard
        </Link>
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-50">Create a Link</h1>
        <p className="text-sm text-zinc-400 mt-1">
          Manage one destination across QR codes, NFC chips, and more.
        </p>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="grid lg:grid-cols-2 gap-8">
          <div className="space-y-6">
            {/* Link details */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Link details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Name *</Label>
                  <Input
                    id="name"
                    placeholder="e.g., Spring Menu, Counter Card"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="url">Destination URL *</Label>
                  <div className="relative">
                    <Link2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="url"
                      type="url"
                      placeholder="https://example.com/menu"
                      value={destinationUrl}
                      onChange={(e) => setDestinationUrl(e.target.value)}
                      className="pl-10"
                      error={!!urlError}
                      required
                    />
                  </div>
                  {urlError && (
                    <p className="text-xs text-destructive flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      {urlError}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="slug">Custom slug (optional)</Label>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground shrink-0">/r/</span>
                    <Input
                      id="slug"
                      placeholder="auto-generated"
                      value={slug}
                      onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                      pattern="^[a-z0-9]+(-[a-z0-9]+)*$"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Leave empty to auto-generate. Lowercase letters, numbers, and hyphens only.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="analytics"
                    checked={analyticsEnabled}
                    onChange={(e) => setAnalyticsEnabled(e.target.checked)}
                    className="rounded border-input"
                  />
                  <Label htmlFor="analytics" className="text-sm font-normal cursor-pointer">
                    Enable scan analytics
                  </Label>
                </div>
              </CardContent>
            </Card>

            {/* QR carrier */}
            <CarrierCard variant="qr">
              <StylePanel style={style} onChange={setStyle} />
            </CarrierCard>

            {/* NFC carrier */}
            <CarrierCard
              variant="nfc"
              plan={plan}
              enabled={nfcEnabled}
              onEnabledChange={setNfcEnabled}
            >
              <div className="space-y-3">
                <p className="text-sm text-zinc-400">
                  Order pre-programmed NFC chips for this Link. We&apos;ll print and programme
                  them before dispatch — you change the destination from your dashboard, any time.
                </p>
                <Link
                  href={`/app/shop?category=nfc_card`}
                  className="inline-flex items-center gap-2 text-sm font-medium text-lynx-400 hover:text-lynx-300"
                >
                  View NFC chip options
                  <span aria-hidden>→</span>
                </Link>
              </div>
            </CarrierCard>

            <div className="pt-2 text-xs text-muted-foreground">
              Need a one-off QR instead?{' '}
              <Link
                href={destinationUrl ? `/app/qr/direct/new?url=${encodeURIComponent(destinationUrl)}` : `/app/qr/direct/new`}
                className="text-lynx-400 hover:text-lynx-300 underline"
              >
                Generate a direct QR
              </Link>
            </div>
          </div>

          <div className="lg:sticky lg:top-8 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Preview</CardTitle>
              </CardHeader>
              <CardContent>
                <QRPreview data={previewUrl || 'https://example.com'} style={style} />
                <p className="mt-4 text-xs text-center text-muted-foreground">
                  Encodes your managed Link URL
                </p>
              </CardContent>
            </Card>

            <div className="flex gap-4">
              <Link href="/app" className="flex-1">
                <Button type="button" variant="outline" className="w-full">
                  Cancel
                </Button>
              </Link>
              <Button type="submit" className="flex-1" disabled={isLoading || !!urlError}>
                {isLoading ? 'Creating…' : 'Create Link'}
              </Button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
```

- [ ] **Step 3: Type-check + lint**

Run: `npm run type-check && npm run lint`
Expected: PASS.

- [ ] **Step 4: Manual dev server smoke test**

Run: `timeout 15 npm run dev`

In a browser:
- `/app/new` loads with "Create a Link" title, Link details card, QR carrier expanded, NFC carrier locked with upgrade link (assuming free plan).
- Fill in name + destination, submit. Redirects to `/app/qr/<id>`.

- [ ] **Step 5: Commit**

```bash
git add src/app/app/new/page.tsx src/app/api/org/current-plan/route.ts
git commit -m "feat(app): restructure /app/new as Link-first Create a Link page"
```

---

## Task 11: `DirectQRConfirmationModal` component

**Files:**
- Create: `src/components/qr/direct-qr-confirmation-modal.tsx`

- [ ] **Step 1: Implement the modal**

Create `src/components/qr/direct-qr-confirmation-modal.tsx`:

```tsx
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui';

interface DirectQRConfirmationModalProps {
  open: boolean;
  /** The destination URL currently entered; forwarded as ?url= to /app/new */
  destinationUrl: string;
  onCancel: () => void;
  onConfirm: () => void;
}

/**
 * Compact modal nudging users toward managed Links before they generate
 * an unchangeable direct QR. Dismissible via Esc or backdrop click.
 */
export function DirectQRConfirmationModal({
  open,
  destinationUrl,
  onCancel,
  onConfirm,
}: DirectQRConfirmationModalProps) {
  const router = useRouter();

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onCancel();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onCancel]);

  if (!open) return null;

  const linkHref = destinationUrl
    ? `/app/new?url=${encodeURIComponent(destinationUrl)}`
    : '/app/new';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="direct-qr-modal-title"
    >
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onCancel}
        aria-hidden="true"
      />
      <div className="relative w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl p-6">
        <h2 id="direct-qr-modal-title" className="text-lg font-semibold text-zinc-50">
          Generate a one-off QR?
        </h2>
        <p className="mt-2 text-sm text-zinc-400">
          Direct QRs encode the destination into the image permanently.
          You won&apos;t be able to change where it points later.
        </p>

        <div className="mt-4 rounded-xl bg-zinc-800/50 border border-zinc-800 p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-lynx-400 mb-2">
            Managed Links give you
          </p>
          <ul className="space-y-1 text-sm text-zinc-300">
            <li>• Change the destination any time</li>
            <li>• Scan analytics (who, when, where)</li>
            <li>• Custom /r/yourslug URL</li>
          </ul>
        </div>

        <div className="mt-6 flex flex-col sm:flex-row gap-2">
          <Button
            type="button"
            className="flex-1"
            onClick={() => router.push(linkHref)}
          >
            Create a Link instead
          </Button>
          <Button
            type="button"
            variant="outline"
            className="flex-1"
            onClick={onConfirm}
          >
            Generate anyway
          </Button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Type-check + lint**

Run: `npm run type-check && npm run lint`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/components/qr/direct-qr-confirmation-modal.tsx
git commit -m "feat(ui): add DirectQRConfirmationModal"
```

---

## Task 12: New `/app/qr/direct/new` page

**Files:**
- Create: `src/app/app/qr/direct/new/page.tsx`

- [ ] **Step 1: Implement the page**

Create `src/app/app/qr/direct/new/page.tsx`:

```tsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Link2, AlertCircle } from 'lucide-react';
import {
  Button,
  Input,
  Label,
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  useToast,
} from '@/components/ui';
import { QRPreview } from '@/components/qr/qr-preview';
import { StylePanel } from '@/components/qr/style-panel';
import { DirectQRConfirmationModal } from '@/components/qr/direct-qr-confirmation-modal';
import { validateUrl } from '@/lib/security/url-validator';
import { QR_DEFAULTS } from '@/lib/constants';
import type { QRStyleConfig } from '@/types/qr';

export default function DirectQRPage() {
  const router = useRouter();
  const search = useSearchParams();
  const { addToast } = useToast();

  const prefilledUrl = search.get('url') ?? '';

  const [name, setName] = useState('');
  const [destinationUrl, setDestinationUrl] = useState(prefilledUrl);
  const [urlError, setUrlError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);

  const [style, setStyle] = useState<QRStyleConfig>({
    foregroundColor: '#000000',
    backgroundColor: '#FFFFFF',
    errorCorrection: 'M',
    quietZone: QR_DEFAULTS.QUIET_ZONE,
    moduleShape: 'square',
    eyeShape: 'square',
    logoMode: 'none',
    logoDataUrl: undefined,
    logoSizeRatio: QR_DEFAULTS.DEFAULT_LOGO_RATIO,
  });

  useEffect(() => {
    if (!destinationUrl) {
      setUrlError(null);
      return;
    }
    const result = validateUrl(destinationUrl);
    setUrlError(result.isValid ? null : result.error || 'Invalid URL');
  }, [destinationUrl]);

  const openConfirmation = (e: React.FormEvent) => {
    e.preventDefault();
    if (!destinationUrl) {
      addToast({ title: 'Destination URL is required', variant: 'error' });
      return;
    }
    if (urlError) {
      addToast({ title: 'Please fix the URL error', variant: 'error' });
      return;
    }
    setModalOpen(true);
  };

  const submitDirect = async () => {
    setModalOpen(false);
    setIsLoading(true);
    try {
      const res = await fetch('/api/qr', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          name: name || 'One-off QR',
          mode: 'direct',
          destination_url: destinationUrl,
          analytics_enabled: false,
          style: {
            foreground_color: style.foregroundColor,
            background_color: style.backgroundColor,
            error_correction: style.errorCorrection,
            quiet_zone: style.quietZone,
            module_shape: style.moduleShape,
            eye_shape: style.eyeShape,
          },
        }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        addToast({
          title: 'Failed to generate QR',
          description: body.error || 'Unknown error',
          variant: 'error',
        });
        return;
      }
      const { id } = await res.json();
      addToast({ title: 'QR generated!', variant: 'success' });
      router.push(`/app/qr/${id}`);
    } catch (error: any) {
      addToast({
        title: 'Failed to generate QR',
        description: error.message,
        variant: 'error',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="mb-8">
        <Link
          href="/app"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-4"
        >
          <ArrowLeft className="h-4 w-4" />
          back to dashboard
        </Link>
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-50">
          Generate a one-off QR
        </h1>
        <p className="text-sm text-zinc-400 mt-1">
          The destination is encoded into the image permanently and cannot be changed later.
        </p>
        <p className="text-sm mt-2">
          <Link
            href={destinationUrl ? `/app/new?url=${encodeURIComponent(destinationUrl)}` : '/app/new'}
            className="text-lynx-400 hover:text-lynx-300 underline"
          >
            Or create a managed Link instead
          </Link>
        </p>
      </div>

      <form onSubmit={openConfirmation}>
        <div className="grid lg:grid-cols-2 gap-8">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Name (optional)</Label>
                  <Input
                    id="name"
                    placeholder="e.g., Flyer for October event"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="url">Destination URL *</Label>
                  <div className="relative">
                    <Link2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="url"
                      type="url"
                      placeholder="https://example.com/flyer"
                      value={destinationUrl}
                      onChange={(e) => setDestinationUrl(e.target.value)}
                      className="pl-10"
                      error={!!urlError}
                      required
                    />
                  </div>
                  {urlError && (
                    <p className="text-xs text-destructive flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      {urlError}
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Style</CardTitle>
              </CardHeader>
              <CardContent>
                <StylePanel style={style} onChange={setStyle} />
              </CardContent>
            </Card>
          </div>

          <div className="lg:sticky lg:top-8 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Preview</CardTitle>
              </CardHeader>
              <CardContent>
                <QRPreview data={destinationUrl || 'https://example.com'} style={style} />
                <p className="mt-4 text-xs text-center text-muted-foreground">
                  Encodes the URL directly
                </p>
              </CardContent>
            </Card>
            <div className="flex gap-4">
              <Link href="/app" className="flex-1">
                <Button type="button" variant="outline" className="w-full">
                  Cancel
                </Button>
              </Link>
              <Button type="submit" className="flex-1" disabled={isLoading || !!urlError}>
                {isLoading ? 'Generating…' : 'Generate'}
              </Button>
            </div>
          </div>
        </div>
      </form>

      <DirectQRConfirmationModal
        open={modalOpen}
        destinationUrl={destinationUrl}
        onCancel={() => setModalOpen(false)}
        onConfirm={submitDirect}
      />
    </div>
  );
}
```

- [ ] **Step 2: Type-check + lint**

Run: `npm run type-check && npm run lint`
Expected: PASS.

- [ ] **Step 3: Manual smoke test**

Run: `timeout 15 npm run dev`

- `/app/qr/direct/new` loads.
- Click "Generate" — modal appears with "Create a Link instead" / "Generate anyway".
- Esc dismisses the modal.
- "Generate anyway" submits and routes to the QR detail page.

- [ ] **Step 4: Commit**

```bash
git add src/app/app/qr/direct/new/page.tsx
git commit -m "feat(app): add /app/qr/direct/new direct QR page with managed-Link nudge"
```

---

## Task 13: Dashboard — filter chips + carrier badges

**Files:**
- Create: `src/components/qr/link-list-filter.tsx`
- Modify: `src/app/app/page.tsx`

- [ ] **Step 1: Implement the filter component**

Create `src/components/qr/link-list-filter.tsx`:

```tsx
'use client';

import { useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import type { QRCarrier, QRMode } from '@/types/qr';
import { CarrierBadge } from '@/components/qr/carrier-badge';

type FilterValue = 'all' | 'qr' | 'nfc' | 'direct';

interface LinkWithCarrier {
  id: string;
  mode: QRMode;
  carrier: QRCarrier;
}

interface LinkListFilterProps<T extends LinkWithCarrier> {
  items: T[];
  renderItem: (item: T, badge: ReactNode) => ReactNode;
}

const FILTERS: { value: FilterValue; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'qr', label: 'QR' },
  { value: 'nfc', label: 'NFC' },
  { value: 'direct', label: 'Direct' },
];

export function LinkListFilter<T extends LinkWithCarrier>({
  items,
  renderItem,
}: LinkListFilterProps<T>) {
  const [filter, setFilter] = useState<FilterValue>('all');

  const counts = useMemo(() => {
    return {
      all: items.length,
      qr: items.filter((i) => i.mode === 'managed' && i.carrier === 'qr').length,
      nfc: items.filter(
        (i) => i.mode === 'managed' && (i.carrier === 'nfc' || i.carrier === 'both')
      ).length,
      direct: items.filter((i) => i.mode === 'direct').length,
    };
  }, [items]);

  const filtered = useMemo(() => {
    if (filter === 'all') return items;
    if (filter === 'qr')
      return items.filter((i) => i.mode === 'managed' && i.carrier === 'qr');
    if (filter === 'nfc')
      return items.filter(
        (i) => i.mode === 'managed' && (i.carrier === 'nfc' || i.carrier === 'both')
      );
    return items.filter((i) => i.mode === 'direct');
  }, [items, filter]);

  return (
    <>
      <div
        role="group"
        aria-label="Filter links by carrier"
        className="flex flex-wrap items-center gap-2 mb-4"
      >
        {FILTERS.map((f) => {
          const active = f.value === filter;
          return (
            <button
              key={f.value}
              type="button"
              onClick={() => setFilter(f.value)}
              aria-pressed={active}
              className={[
                'inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-colors',
                active
                  ? 'bg-lynx-500 text-zinc-950'
                  : 'bg-zinc-900 text-zinc-400 border border-zinc-800 hover:text-zinc-100 hover:border-lynx-400/40',
              ].join(' ')}
            >
              {f.label}
              <span
                className={[
                  'text-xs rounded-full px-1.5 py-0.5 font-semibold tabular-nums leading-none',
                  active ? 'bg-zinc-950/20 text-zinc-950' : 'bg-zinc-800 text-zinc-500',
                ].join(' ')}
              >
                {counts[f.value]}
              </span>
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filtered.map((item) =>
          renderItem(
            item,
            <CarrierBadge mode={item.mode} carrier={item.carrier} />
          )
        )}
      </div>
    </>
  );
}
```

- [ ] **Step 2: Wire the filter into the dashboard**

The existing dashboard uses an inline `QRCard` server render. To preserve that pattern while adding client-side filtering, we introduce a small client wrapper component inside the dashboard. Since dashboard is a server component, we'll split the QR grid into its own client component.

Create `src/app/app/qr-list-section.tsx`:

```tsx
'use client';

import Link from 'next/link';
import { ExternalLink, BarChart3, Hash } from 'lucide-react';
import { Card, CardContent } from '@/components/ui';
import { formatDate, formatNumber } from '@/lib/utils';
import { LinkListFilter } from '@/components/qr/link-list-filter';
import { QRDeleteButton } from '@/components/qr/qr-delete-button';
import type { QRCarrier, QRMode } from '@/types/qr';

export interface QRRow {
  id: string;
  name: string;
  mode: QRMode;
  carrier: QRCarrier;
  slug: string | null;
  destination_url: string;
  is_active: boolean;
  total_scans: number;
  created_at: string;
}

export function QRListSection({ qrCodes }: { qrCodes: QRRow[] }) {
  if (qrCodes.length === 0) {
    return (
      <Card className="rounded-xl">
        <CardContent className="p-8 text-center">
          <p className="text-sm text-zinc-400">No Links yet. Create one to get started.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <LinkListFilter
      items={qrCodes}
      renderItem={(qr, badge) => (
        <Card key={qr.id} className="rounded-xl hover:border-lynx-400/40 transition-colors">
          <CardContent className="p-5 space-y-3">
            <div className="flex items-start justify-between gap-3">
              <Link href={`/app/qr/${qr.id}`} className="flex-1 min-w-0">
                <h3 className="font-semibold text-zinc-50 truncate">{qr.name}</h3>
                <p className="text-xs text-zinc-500 mt-0.5 truncate">
                  {qr.mode === 'managed' ? `/r/${qr.slug}` : qr.destination_url}
                </p>
              </Link>
              {badge}
            </div>
            <div className="flex items-center gap-4 text-xs text-zinc-500">
              <span className="flex items-center gap-1">
                <BarChart3 className="h-3.5 w-3.5" />
                {formatNumber(qr.total_scans)} scans
              </span>
              <span className="flex items-center gap-1">
                <Hash className="h-3.5 w-3.5" />
                {formatDate(qr.created_at)}
              </span>
            </div>
            <div className="flex items-center justify-between pt-2 border-t border-zinc-800">
              <Link
                href={`/app/qr/${qr.id}`}
                className="text-xs text-lynx-400 hover:text-lynx-300"
              >
                Manage →
              </Link>
              <QRDeleteButton qrId={qr.id} />
            </div>
          </CardContent>
        </Card>
      )}
    />
  );
}
```

Modify `src/app/app/page.tsx`:

1. Replace the QR grid block (the "QR Code Grid" section) — swap the existing grid render with `<QRListSection qrCodes={...} />`.

Find the existing block (approximately):

```tsx
      {/* QR Code Grid */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-medium tracking-tight text-zinc-100">QR Codes</h2>
      </div>
      {!qrCodes || qrCodes.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {qrCodes.map((qr) => (
            <QRCard key={qr.id} qr={qr} />
          ))}
        </div>
```

Replace with:

```tsx
      {/* Links Grid */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-medium tracking-tight text-zinc-100">Your Links</h2>
      </div>
      <QRListSection
        qrCodes={(qrCodes ?? []).map((qr: any) => ({
          id: qr.id,
          name: qr.name,
          mode: qr.mode,
          carrier: qr.carrier ?? 'qr',
          slug: qr.slug,
          destination_url: qr.destination_url,
          is_active: qr.is_active,
          total_scans: qr.total_scans ?? 0,
          created_at: qr.created_at,
        }))}
      />
```

Add the import at the top:

```tsx
import { QRListSection } from './qr-list-section';
```

Also update the header: change `"Manage and track your QR codes"` to `"Manage and track your Links"`, and the "Create QR" button label to `"Create Link"`.

Old block (find this):

```tsx
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-50">Dashboard</h1>
          <p className="text-sm text-zinc-400 mt-1">
            Manage and track your QR codes
          </p>
        </div>
        <Link href="/app/new">
          <Button className="rounded-lg">
            <Plus className="h-4 w-4 mr-2" />
            Create QR
          </Button>
        </Link>
```

Replace with:

```tsx
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-50">Dashboard</h1>
          <p className="text-sm text-zinc-400 mt-1">
            Manage and track your Links
          </p>
        </div>
        <Link href="/app/new">
          <Button className="rounded-lg">
            <Plus className="h-4 w-4 mr-2" />
            Create Link
          </Button>
        </Link>
```

Remove the now-unused inline `QRCard` and `EmptyState` components from `page.tsx` if they have no other consumers. Run `npm run lint` after and address any unused-variable warnings by deleting.

- [ ] **Step 3: Type-check + lint**

Run: `npm run type-check && npm run lint`
Expected: PASS (no unused-import warnings).

- [ ] **Step 4: Manual smoke test**

Run: `timeout 15 npm run dev`

- `/app` shows "Dashboard · Your Links · Create Link"
- Filter chips show All / QR / NFC / Direct with counts
- Each row has a carrier badge
- Clicking a filter narrows the grid

- [ ] **Step 5: Commit**

```bash
git add src/components/qr/link-list-filter.tsx src/app/app/qr-list-section.tsx src/app/app/page.tsx
git commit -m "feat(app): dashboard filter + carrier badges on Link rows"
```

---

## Task 14: Detail page — carrier badge + copy rename

**Files:**
- Modify: `src/app/app/qr/[id]/page.tsx`

- [ ] **Step 1: Add CarrierBadge and rename page copy**

Edit `src/app/app/qr/[id]/page.tsx`:

1. Add imports:

```tsx
import { CarrierBadge } from '@/components/qr/carrier-badge';
import type { QRCarrier } from '@/types/qr';
```

2. In the header section, inside the `<div className="flex items-start justify-between">`, replace the existing badges block:

Old block:

```tsx
            <div className="flex items-center gap-3 mt-2">
              <Badge variant={qr.is_active ? 'success' : 'secondary'}>
                {qr.is_active ? 'Active' : 'Inactive'}
              </Badge>
              <Badge variant="outline">{qr.mode}</Badge>
              {qr.analytics_enabled && (
                <span className="flex items-center gap-1 text-sm text-zinc-400">
                  <BarChart3 className="h-4 w-4" />
                  {formatNumber(qr.total_scans)} total scans
                </span>
              )}
            </div>
```

With:

```tsx
            <div className="flex items-center gap-3 mt-2">
              <Badge variant={qr.is_active ? 'success' : 'secondary'}>
                {qr.is_active ? 'Active' : 'Inactive'}
              </Badge>
              <CarrierBadge mode={qr.mode} carrier={(qr.carrier ?? 'qr') as QRCarrier} />
              {qr.analytics_enabled && (
                <span className="flex items-center gap-1 text-sm text-zinc-400">
                  <BarChart3 className="h-4 w-4" />
                  {formatNumber(qr.total_scans)} total scans
                </span>
              )}
            </div>
```

> Note: `qr.carrier` may be `undefined` on local DB clones that haven't run the migration; `?? 'qr'` makes this safe either way.

- [ ] **Step 2: Rename copy references from "QR code" to "Link"**

In the same file, change any user-visible "QR code" / "QR Code" text to "Link" / "Link" (keep the `<Badge>{qr.mode}</Badge>` removal already done above). Specifically:
- If there's a delete-confirmation string saying "Delete QR code" → "Delete Link"
- If there are section headings like "QR settings" → "Link settings"

Scan the file visually after editing; a quick grep helps:

Run: `grep -n "QR" src/app/app/qr/\[id\]/page.tsx`
Ensure remaining matches are legitimate references to the QR carrier artifact (e.g., style preview) — not the Link concept itself.

- [ ] **Step 3: Type-check + lint**

Run: `npm run type-check && npm run lint`
Expected: PASS.

- [ ] **Step 4: Manual smoke test**

Run: `timeout 15 npm run dev` and visit a detail page.
Verify: carrier badge renders, copy says "Link" where appropriate.

- [ ] **Step 5: Commit**

```bash
git add src/app/app/qr/[id]/page.tsx
git commit -m "feat(app): carrier badge + Link copy on detail page"
```

---

## Task 15: Sidebar — rename + One-off QR entry

**Files:**
- Modify: `src/components/layout/app-sidebar.tsx`

- [ ] **Step 1: Update NAV_ITEMS**

Edit `src/components/layout/app-sidebar.tsx`. Replace the `NAV_ITEMS` array:

Old:

```tsx
const NAV_ITEMS = [
  { href: '/app', icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/app/new', icon: Plus, label: 'Create QR' },
  { href: '/app/bio', icon: Link2, label: 'Bio Pages' },
  { href: '/app/settings/team', icon: Users, label: 'Team' },
  { href: '/app/shop', icon: ShoppingBag, label: 'Shop' },
] as const;
```

New:

```tsx
const NAV_ITEMS = [
  { href: '/app', icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/app/new', icon: Plus, label: 'Create Link' },
  { href: '/app/qr/direct/new', icon: QrCode, label: 'One-off QR' },
  { href: '/app/bio', icon: Link2, label: 'Bio Pages' },
  { href: '/app/settings/team', icon: Users, label: 'Team' },
  { href: '/app/shop', icon: ShoppingBag, label: 'Shop' },
] as const;
```

Update the imports line to include `QrCode`:

Old:

```tsx
import { LayoutDashboard, Plus, Link2, Menu, X, Users, ShoppingBag } from 'lucide-react';
```

New:

```tsx
import { LayoutDashboard, Plus, Link2, Menu, X, Users, ShoppingBag, QrCode } from 'lucide-react';
```

- [ ] **Step 2: Type-check + lint**

Run: `npm run type-check && npm run lint`
Expected: PASS.

- [ ] **Step 3: Manual smoke test**

Run: `timeout 15 npm run dev`. Sidebar shows "Create Link" + "One-off QR". Both nav items route correctly.

- [ ] **Step 4: Commit**

```bash
git add src/components/layout/app-sidebar.tsx
git commit -m "feat(ui): sidebar — rename to Create Link, add One-off QR"
```

---

## Task 16: Full-suite regression + build

**Files:** (none — verification only)

- [ ] **Step 1: Full test suite**

Run: `npm run test:run`
Expected: PASS. All existing tests + new carrier tests.

- [ ] **Step 2: Full type-check**

Run: `npm run type-check`
Expected: PASS.

- [ ] **Step 3: Full lint**

Run: `npm run lint`
Expected: PASS (no new errors).

- [ ] **Step 4: Production build**

Run: `npm run build`
Expected: Build succeeds. No type errors, no missing imports.

- [ ] **Step 5: Slug integrity snapshot + diff**

Run: `npm run migration:snapshot` (if applicable for dev; skip silently if the script requires prod DB access).

- [ ] **Step 6: Final manual smoke — existing production slug**

With dev server running, hit `/r/<existing-slug-from-dev-data>` and confirm 307. This guards the non-negotiable constraint that printed QRs in the wild keep working.

- [ ] **Step 7: No commit** — this task is verification only.

If any of the above fail, address the issue in a small follow-up commit before considering the plan complete.

---

## Self-Review Summary

**Spec coverage check:**

| Spec section | Covered by task |
|---|---|
| § Non-Negotiable Constraints | Tasks 1, 7, 16 |
| § 1. Data Model (migration, types) | Tasks 1, 2 |
| § 2. Create a Link Page | Task 10 |
| § 3. Direct QR — Dedicated Page | Tasks 11, 12 |
| § 4. Manage a Link — Edit Page (badge + copy) | Task 14 |
| § 5. Dashboard List (filter + badges) | Task 13 |
| § 6. Nomenclature rename | Tasks 10, 13, 14, 15 |
| § 7. Pro Gate Mechanics | Tasks 4, 5, 6 |
| § 9. Error Handling | Tasks 5, 6 |
| § 10. Testing | Tasks 4, 5, 6, 7, 16 |

**Note on § 4 carrier sections on the edit page:** The spec calls for NFC carrier sections visible (locked for free) on the edit page in addition to the badge. This plan ships the badge + copy rename; the full carrier sections on the edit page are deferred as a small follow-up (rationale: the edit page today does not let users re-run the create wizard, and changing `carrier` is already API-supported via PATCH for Phase 2's shop pipeline). If you want carrier sections on the edit page in this pass, add a Task 14.5 mirroring Task 10's CarrierCard usage inside `QRDetailClient`.

**Placeholder scan:** All code blocks are complete. No TBD / TODO / "similar to" references.

**Type consistency:** `QRCarrier` type and `carrier` field names are stable across tasks 2→6. `CarrierCard` / `CarrierBadge` / `LinkListFilter` / `DirectQRConfirmationModal` names are stable across tasks 8→13.
