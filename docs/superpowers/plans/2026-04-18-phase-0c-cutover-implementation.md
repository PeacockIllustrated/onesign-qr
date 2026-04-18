# Phase 0.C — Cutover (RLS rewrite + active-org session) Implementation Plan

**Date:** 2026-04-18
**Depends on:** Phase 0.A + 0.B complete in production; `backfill-verify`
returned clean on a production re-run the morning of Phase 0.C.
**Blocks:** all Phase 1 H1 features (multi-page dashboard, NFC, lead inbox,
custom domains, Pro tier). Also unblocks Phase 2 super-admin dashboard.

**Goal:** Move the authenticated `/app/*` surface from owner-based
row-level security to org-based row-level security, without ever breaking
the production redirect path at `/r/{slug}`, and introduce the session
primitives the B2B product needs: active-org cookie, org switcher, invite
flow, signup that auto-creates a personal org.

## Strategy: Expand → Cutover → Contract, with dual writes

1. **Expand**: Drop `UNIQUE(owner_id)` on `bio_link_pages`. Add helper SQL
   functions. Land app-layer primitives (active-org cookie, switcher UI,
   orgs API) behind a feature flag, reading from `organization_members`
   but *not yet* required.
2. **Cutover per table**: rewrite each RLS policy from `auth.uid() =
   owner_id` to an `organization_members` EXISTS check. Start with
   `bio_form_submissions` (lowest risk). Monitor 24h. Next table. End
   with `qr_codes`.
3. **Dual writes for 2 weeks**: every insert/update in `/app/*` writes
   both `org_id` and `owner_id`. Reads remain mixed (queries can filter
   by either). This keeps rollback cheap.
4. **Contract** (Phase 0.D, ≥30 days later, separate plan): drop
   `owner_id` columns.

The redirect handler at `/r/[slug]` is unaffected throughout — it bypasses
RLS via the admin client and reads only `slug`, `destination_url`,
`is_active`, `analytics_enabled`, `mode` on `qr_codes`, all protected by
the schema-lint CI gate.

## Scope

✅ **In scope for Phase 0.C**
- Migration 00018: `is_member_of_org(org_id, user_id)` SQL function; drop
  `UNIQUE(owner_id)` on `bio_link_pages`; enable RLS on the four org
  tables with their initial policies.
- One RLS-rewrite migration per owned table (00019…), feature-flagged at
  the app level so reads/writes can fall back to the old RLS if a policy
  bug surfaces.
- Active-org cookie module (`src/lib/org/active-org.ts`) plus tests.
- `GET /api/orgs` — list the logged-in user's orgs.
- `POST /api/orgs/switch` — set active-org cookie.
- Signup flow update: on new `auth.users` creation, insert a personal
  org + owner membership (mirror of the Phase 0.B seeding logic).
- Invite flow: `POST /api/orgs/[id]/invites`, invite email via Resend,
  `POST /api/orgs/invites/accept` accept endpoint, signup landing page
  handling the invite token.
- Org switcher UI component in dashboard nav.
- Dual-write helpers in the existing bio/qr service layer.
- Regression tests for redirect handler run against every RLS-cutover PR.
- Runbook section per-table with monitor + rollback.

❌ **Out of scope**
- Dropping `owner_id` columns (Phase 0.D).
- Custom domains, NFC, multi-page dashboard, Pro tier — those are H1.
- Super-admin dashboard — that's H2.
- Activity feed / audit log for org actions — H1/H2 non-goal.

## File structure

**Created:**
- `supabase/migrations/00018_org_rls_helpers_and_unique_drop.sql`
- `supabase/migrations/00019_rls_bio_form_submissions.sql`
- `supabase/migrations/00020_rls_bio_link_pages.sql`
- `supabase/migrations/00021_rls_bio_blocks.sql`
- `supabase/migrations/00022_rls_qr_codes.sql`
- `supabase/migrations/00023_rls_qr_scan_events_and_audit.sql`
- `src/lib/org/active-org.ts` — cookie helpers + `getActiveOrgContext`.
- `src/lib/org/membership.ts` — `requireOrgMember(userId, orgId)`.
- `src/lib/feature-flags.ts` — per-table RLS cutover flags.
- `src/app/api/orgs/route.ts` — GET list user's orgs.
- `src/app/api/orgs/switch/route.ts` — POST set active org.
- `src/app/api/orgs/[id]/invites/route.ts` — POST invite.
- `src/app/api/orgs/invites/accept/route.ts` — POST accept.
- `src/components/org/OrgSwitcher.tsx` — dashboard nav switcher.
- `src/components/org/InviteDialog.tsx` — invite UI.
- `src/lib/email/invite-email.tsx` — Resend template.
- `src/__tests__/lib/org/active-org.test.ts`
- `src/__tests__/lib/org/membership.test.ts`
- `src/__tests__/app/api/orgs/*.test.ts`

**Modified:**
- `src/middleware.ts` — validate active-org cookie on `/app/*`.
- `src/app/auth/signup/**` — auto-create personal org on new user.
- `src/app/app/**` — route handlers read `org_id` via active-org context
  instead of `owner_id` via `auth.uid()`.
- `src/lib/supabase/server.ts` — no change; the same client is used,
  RLS does the scoping now.

## Feature flags

`src/lib/feature-flags.ts` exports:

- `ORG_SCOPE_BIO_FORM_SUBMISSIONS` (default false → true after cutover day 1)
- `ORG_SCOPE_BIO_LINK_PAGES`
- `ORG_SCOPE_BIO_BLOCKS`
- `ORG_SCOPE_QR_CODES`
- `ORG_SCOPE_QR_SCAN_EVENTS`

Source: env vars (`NEXT_PUBLIC_ORG_SCOPE_*=true`). Flipping a flag back
to `false` falls back to the pre-cutover read/write path. This is the
app-level lever that makes per-table cutover reversible without a
migration.

## SQL design

### Helper function (migration 00018)

```sql
CREATE OR REPLACE FUNCTION is_member_of_org(p_org_id UUID, p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM organization_members
    WHERE org_id = p_org_id AND user_id = p_user_id
  );
$$;
```

`SECURITY DEFINER` is deliberate: the helper must work even when the
caller has no direct SELECT privilege on `organization_members` (which
is desirable — we do not expose the whole table via PostgREST).

### RLS policy template

Each owned table gets one policy per operation:

```sql
-- SELECT
CREATE POLICY org_select ON bio_link_pages FOR SELECT
USING (
  is_member_of_org(org_id, auth.uid())
);

-- INSERT, UPDATE, DELETE use WITH CHECK / USING mirror
```

Policies run **in addition** to the existing `owner_id = auth.uid()`
policy for the duration of the dual-write window. A row is visible if
either policy permits it. Old rows backfilled by Phase 0.B satisfy both.
New rows inserted by the app in dual-write mode also satisfy both.

At Phase 0.D, the old owner-based policies are dropped and
`owner_id` goes with them.

### UNIQUE(owner_id) drop on bio_link_pages

```sql
ALTER TABLE bio_link_pages DROP CONSTRAINT IF EXISTS bio_link_pages_owner_id_key;
```

This is what unblocks multi-page per org (H1 feature). The drop is safe
because all existing rows have unique `(owner_id, id)`; nothing in the
data requires `owner_id` alone to be unique.

## App-layer: active-org session

### Cookie format
- Name: `oneSignActiveOrg`
- Value: org UUID
- Attributes: `HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=31536000`
- Validated server-side on every request that enters
  `getActiveOrgContext`.

### Validation

```ts
// Pseudocode; real impl in src/lib/org/active-org.ts
async function getActiveOrgContext(request) {
  const user = await getUser();
  if (!user) return null;
  const cookieOrgId = readCookie(request, 'oneSignActiveOrg');
  const membership = await lookupMembership(user.id, cookieOrgId);
  if (membership) return { userId: user.id, orgId: cookieOrgId, role: membership.role };
  // Fall back to the user's earliest personal org.
  const fallback = await firstOrgForUser(user.id);
  if (!fallback) return null;
  setCookie('oneSignActiveOrg', fallback.org_id);
  return { userId: user.id, orgId: fallback.org_id, role: fallback.role };
}
```

- Never trust the cookie alone — always re-check against
  `organization_members` per request (roles can be revoked mid-session).
- JWT payload stays minimal. Role is computed per request.

### Middleware

`src/middleware.ts` gets a small extension: when handling `/app/*`,
call `getActiveOrgContext`. If it returns `null`, redirect to
`/auth/login`. If it returns a valid context, set a `x-org-id`
request header for downstream route handlers to read.

## Invite flow

1. Owner/admin calls `POST /api/orgs/[id]/invites { email, role }`.
2. Route handler creates a row in `organization_invites` with a
   random base64url token (48 bytes) and `expires_at = now() + 7d`.
3. Resend sends an email with
   `${APP_URL}/auth/signup?invite=${token}` if the email does not
   match an existing user, or `${APP_URL}/app/invites/accept?invite=${token}`
   if it does. The distinction is computed server-side against
   `auth.users`.
4. Signup handler detects `?invite=`, completes normal signup,
   then automatically accepts the invite rather than creating a
   personal org.
5. Accept endpoint `POST /api/orgs/invites/accept { token }`:
   - Validates token, not expired, not already accepted.
   - Inserts `organization_members` row.
   - Marks invite `accepted_at = now()`.
   - Sets active-org cookie to the just-joined org.

### Abuse guards
- Rate limit: max 10 pending invites per org per hour.
- Token is single-use; re-sending invite generates a new row.
- Role enum on the Zod schema rejects `owner`.

## Per-table cutover order + verification

| # | Table | Migration | Read/write impact | Monitor window |
|---|---|---|---|---|
| 1 | `bio_form_submissions` | 00019 | Lowest risk; analytics only | 24h |
| 2 | `bio_link_pages` | 00020 | Dashboard list/edit; multi-page unblocks | 24h |
| 3 | `bio_blocks` | 00021 | Editor depends on this | 24h |
| 4 | `qr_codes` | 00022 | **Redirect unaffected** (admin client); dashboard only | 48h |
| 5 | `qr_scan_events`, `qr_audit_log`, `bio_link_audit_log` | 00023 | Analytics read path | 24h |

Each migration adds the org-based policy **without removing** the
owner-based one. Flag flips to `true` after the migration lands and the
24h monitor shows no 4xx/5xx spike on the relevant dashboard endpoint.

## Testing

- Unit: every new module gets a colocated `.test.ts`.
- Integration: redirect handler regression suite runs on every PR (CI
  already wired).
- Manual: operator walks the runbook per-table: open the dashboard as
  a normal user, list, edit, delete — must be unaffected.
- RLS soak: a test account with zero memberships attempting to read
  each owned table must always 0 rows back.

## Completion criteria

Phase 0.C is complete when:
1. All per-table RLS rewrite migrations are applied to production.
2. Every feature flag is `true` and has been for ≥72h without regression.
3. `UNIQUE(owner_id)` on `bio_link_pages` is dropped.
4. Active-org cookie is set for every logged-in user.
5. Org switcher is visible in the dashboard nav.
6. Invite email from Resend delivers end-to-end in production.
7. New signup auto-creates a personal org + owner membership.
8. No Phase 0.B re-sweep finds any `auth.users` row without a personal org.
9. Redirect handler synthetic monitor shows no 307-rate regression.

Phase 0.D (owner_id column drop) may then be scheduled ≥30 days later.

## Risk matrix

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| RLS rewrite breaks dashboard reads | Medium | Users can't access own data | Feature flag flips back; owner-based policy still present |
| Cookie set for user with no org | Low | Redirect loop | `getActiveOrgContext` auto-creates personal org if none exists (same helper as signup) |
| Invite email spam | Medium | Resend rate limits / abuse | Per-org rate limit + token expiry |
| Supabase Auth webhook for signup not reliable | Low | Users stuck without personal org | Also handle in the signup server action (belt and braces) |
| Redirect handler accidentally reads `org_id` | Very low | Redirects could flicker | Schema-lint + redirect regression tests; PRs touching `/r/[slug]` require review |
