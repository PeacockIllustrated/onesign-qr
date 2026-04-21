# Link-Centric Restructure Design

**Status:** Draft · **Date:** 2026-04-21 · **Phase:** 1 of 3

## Goal

Reframe the primary user-facing concept from "QR code" to "Link" — a managed redirect record that can be expressed through multiple physical carriers (a printable QR code today, pre-programmed NFC chips in the future). Lay the data-model groundwork and ship the new create/edit UX, without yet wiring the shop fulfillment pipeline or self-serve billing.

## Non-Negotiable Constraints

1. **Existing production links must not break.** Every `/r/<slug>` that resolves today must resolve identically after this change. No slug changes, no redirect logic changes, no analytics changes for existing rows.
2. **Existing `qr_codes` rows must not require manual intervention.** Schema changes are additive, with safe defaults.
3. **Printed QR codes already in the wild keep working.** The underlying redirect handler is out of scope — we do not touch `src/app/r/[slug]/route.ts` in this spec.
4. **Direct QRs created pre-change remain viewable and usable.** The `mode = 'direct'` enum value and its existing behaviour are preserved.

## Architecture

The change is primarily conceptual and UX-facing. The `qr_codes` table gains one column (`carrier`) that captures *user intent* about how a managed link is physically delivered. The redirect engine is carrier-agnostic and does not consult this column. Free orgs can use the QR carrier freely; the NFC carrier UI is always visible but gated behind `organizations.plan = 'pro'`.

Direct QR creation moves out of the primary "Create a Link" flow into a dedicated `/app/qr/direct/new` page, with a confirmation modal on generation that nudges users toward managed Links.

## Tech Stack

- Next.js App Router (existing)
- Supabase Postgres + RLS (existing; one additive migration)
- TypeScript types in `src/types/qr.ts`
- No new dependencies

---

## 1. Data Model

### Migration — additive, non-breaking

Add a `carrier` column to `qr_codes`:

```sql
-- supabase/migrations/00025_qr_carrier.sql

ALTER TABLE qr_codes
  ADD COLUMN carrier text NOT NULL DEFAULT 'qr'
  CHECK (carrier IN ('qr', 'nfc', 'both'));

COMMENT ON COLUMN qr_codes.carrier IS
  'User intent about physical delivery of a managed link. ''qr'' = printable QR only (default), ''nfc'' = NFC chips only, ''both'' = QR + NFC campaign. Only meaningful when mode = ''managed''; ignored for mode = ''direct''.';
```

All existing rows receive `carrier = 'qr'`. No other columns change. RLS policies already scope by `org_id` and do not need updating for this column.

### TypeScript type updates

In `src/types/qr.ts`:

```ts
export type QRCarrier = 'qr' | 'nfc' | 'both';

export interface QRCode {
  // ...existing fields...
  carrier: QRCarrier;
}

export interface CreateQRRequest {
  // ...existing fields...
  carrier?: QRCarrier; // Defaults to 'qr' server-side
}

export interface UpdateQRRequest {
  // ...existing fields...
  carrier?: QRCarrier;
}
```

The API endpoints that create/update QR records (`/api/qr`, `/api/qr/[id]`) accept an optional `carrier` field; omitted = unchanged (update) / `'qr'` (create).

### Redirect handler

**No changes.** `src/app/r/[slug]/route.ts` continues to filter by `mode = 'managed'` only. `carrier` is UX metadata.

---

## 2. "Create a Link" Page (`/app/new`)

The existing `/app/new` page is restructured. Current mode toggle (`managed` / `direct`) is replaced with a Link-first layout; direct QR creation moves to its own page (Section 3).

### Layout, top to bottom

**Page header**
- Title: "Create a Link"
- Subtitle: "Manage one destination across QR codes, NFC chips, and more."
- Breadcrumb: `Dashboard → Create a Link`

**Section 1 — Link details** (always visible, required)
- `Name` — text input
- `Destination URL` — URL input with validation
- `Custom slug` — text input with auto-suggest from name; validated against existing slugs
- `Analytics` — toggle, default on

**Section 2 — QR code carrier** (card, expanded by default, always available)
- Header: "QR code" with a small "Free" pill
- Body: current style controls (foreground color, background color, error correction, quiet zone, module shape, eye shape, logo mode + upload, logo size ratio)
- Small preview of the generated QR updates live

**Section 3 — NFC chips carrier** (card, collapsed by default)
- Header: "NFC chips" with a "Pro" pill
- Body differs by plan:
  - **Free orgs:** The entire section is visually present but disabled. Shows a greyed-out "Order pre-programmed NFC chips" block with a lock icon, a short value prop ("NFC cards let customers tap-to-connect — no scanning needed"), and an "Upgrade to Pro" link pointing at `/pricing`. The control is not interactive; no carrier value can be set by free users.
  - **Pro orgs:** The block is enabled. A "Show me NFC chip options" button deep-links to `/app/shop?category=nfc_card&link=<draft-id>`. (The `link=<draft-id>` query is received by the shop but has no effect in Phase 1; it is forward-compatibility for Phase 2. The shop page ignores unknown query params.)
- Toggling this section on sets the carrier intent (see below).

**Footer — actions**
- "Create Link" (primary button) — submits the form
- "Cancel" (text link) — back to dashboard
- Small secondary link at the bottom: "Need a one-off QR instead?" → `/app/qr/direct/new` (carries the entered destination URL as a `?url=` query param if present)

### Carrier value derivation on submit

The submitted `carrier` is derived from which carrier sections are enabled at submit time:

| QR card (always on) | NFC card enabled | Resulting `carrier` |
|---|---|---|
| Yes | No | `'qr'` |
| Yes | Yes (Pro only) | `'both'` |

Free users cannot reach `'nfc'` or `'both'`; the server validates this (`org.plan === 'pro'` required if `carrier !== 'qr'`). A free user attempting it via direct API call gets `403 Forbidden` with code `pro_plan_required`.

The `'nfc'` standalone value (no QR carrier) is not reachable from this page in Phase 1 and is reserved for Phase 2 (shop checkout may set it when a customer orders only NFC cards).

---

## 3. Direct QR — Dedicated Page

### New page: `/app/qr/direct/new`

A stripped-down generator that produces a `mode = 'direct'` QR record. No slug, no analytics, no carrier (it ignores the column).

**Layout**
- Title: "Generate a one-off QR"
- Subtitle: "The destination is encoded into the image permanently and cannot be changed later."
- Fields: `Name` (optional), `Destination URL` (required), style controls (same as managed flow)
- A prominent "Or create a managed Link instead" link at the top of the page, routing to `/app/new` and preserving any entered URL via `?url=`
- "Generate" button at the bottom

### Confirmation modal on Generate

When the user clicks "Generate", a compact modal appears before submission:

```
┌─────────────────────────────────────────────┐
│ Generate a one-off QR?                      │
│                                             │
│ Direct QRs encode the destination into the  │
│ image permanently. You won't be able to     │
│ change where it points later.               │
│                                             │
│ Managed Links give you:                     │
│   • Change the destination any time         │
│   • Scan analytics                          │
│   • Custom /r/yourslug URL                  │
│                                             │
│ [ Create a Link instead ] [ Generate ]      │
└─────────────────────────────────────────────┘
```

- Primary button **"Create a Link instead"** routes to `/app/new?url=<current_url>` (the destination URL prefills on the Link page)
- Secondary button **"Generate"** proceeds with direct QR creation and closes the modal
- Modal is dismissible via Esc key and backdrop click (dismiss = no action, form remains unsubmitted)

### Entry points into `/app/qr/direct/new`

- Small "Need a one-off QR instead?" link at the bottom of `/app/new`
- Item in sidebar under a "More" / "Advanced" collapsible — copy: "One-off QR"

Direct QR remains a first-class citizen of the dashboard list (Section 5) — it is not hidden, just no longer the primary path.

---

## 4. Manage a Link — Edit Page (`/app/qr/[id]`)

The existing detail/edit page for a QR code. Changes:

### Copy changes
- "QR code" → "Link" in page title, breadcrumbs, confirmation dialogs, and section labels
- "Edit QR" → "Edit Link"
- "Delete QR" → "Delete Link"

### Visual additions
- **Carrier badge** in the page header, next to the Link name: a pill showing `QR`, `NFC`, or `QR + NFC` based on `carrier`
- **Carrier sections** below the main edit form, mirroring the Create a Link layout:
  - QR carrier card — always shown, contains current style options (unchanged behaviour)
  - NFC carrier card — always shown for all plan tiers. For free orgs, the card is greyed-out/locked with the same upgrade hint as the create page. For Pro orgs, the card is active and shows "Order more NFC chips" / "View order status" (Phase 2 wires the order list in; for now the button is a no-op or links to `/app/shop?category=nfc_card&link=<id>`).

### Behaviour
- Changing `destination_url` works exactly as today and applies to all physical carriers of this Link simultaneously — this is the whole point.
- Changing `carrier` from the edit page (e.g., a Pro user enabling NFC on an existing Link) is allowed; saves through the same `PATCH /api/qr/[id]` endpoint.
- For `mode = 'direct'` records, the carrier sections are not rendered (direct QRs have no carrier); the page behaves identically to today.

---

## 5. Dashboard List (`/app`)

The existing QR list gains:

### Filter row at the top
A simple chip/button group: **All · QR · NFC · Direct**
- "All" — no filter (default)
- "QR" — `mode = 'managed' AND carrier = 'qr'`
- "NFC" — `mode = 'managed' AND carrier IN ('nfc', 'both')`
- "Direct" — `mode = 'direct'`

Filter state is client-side; no URL query param required in Phase 1.

### Per-row carrier badge
Each Link row shows a small pill:
- `QR` (plain zinc) for `carrier = 'qr'`
- `NFC` (lynx accent) for `carrier = 'nfc'`
- `QR + NFC` (lynx accent) for `carrier = 'both'`
- `Direct` (muted) for `mode = 'direct'`

No other list changes.

---

## 6. Nomenclature / Copy Rename

User-facing "QR code" → "Link" rename affects:

- `/app/new` page title, subtitle, button labels
- `/app/qr/[id]` page title and related copy
- `/app` dashboard list heading ("Your QR codes" → "Your Links")
- Sidebar navigation ("QR codes" → "Links"; new sub-item "One-off QR" under More/Advanced)
- Empty states, error messages, confirmation dialogs
- Marketing copy is **out of scope** for this spec — the public `/` and `/pricing` pages use their own copy and can be updated in a later pass

**Not renamed:**
- Database table name `qr_codes` stays (internal only; renaming would be churn)
- URL path `/app/qr/[id]` stays (existing bookmarks)
- API endpoints `/api/qr/*` stay
- Internal type names like `QRCode` can stay; we are not doing a code-wide rename

The rename is UX copy only, not identifier rename.

---

## 7. Pro Gate Mechanics

- **Gate source of truth:** `organizations.plan === 'pro'` (column exists today in `organizations` table)
- **Enforcement layers:**
  - UI: greyed-out NFC carrier section with lock icon + upgrade hint on create and edit pages for non-Pro orgs
  - Server: `POST /api/qr` and `PATCH /api/qr/[id]` reject requests where `carrier !== 'qr'` if the org's plan is not `'pro'`, returning `403` with `{ error: 'pro_plan_required' }`
- **Self-serve upgrade:** out of scope. `/pricing` already exists; the upgrade hint links there. Actual Pro upgrades are performed manually by platform admins until Phase 3 ships Stripe billing.
- **Existing Pro behaviour preserved:** no changes to how `organizations.plan` is set or read elsewhere.

---

## 8. File Structure — Created, Modified, Untouched

### Created
- `supabase/migrations/00025_qr_carrier.sql` — the additive migration
- `src/app/qr/direct/new/page.tsx` — new direct QR generator page
- `src/components/qr/carrier-card.tsx` — shared carrier card UI (QR + NFC variants, handles greyed-out state)
- `src/components/qr/direct-qr-confirmation-modal.tsx` — the "are you sure?" modal
- `src/components/qr/link-list-filter.tsx` — the All/QR/NFC/Direct filter chips

### Modified
- `src/app/app/new/page.tsx` — restructure into Link-first layout with carrier cards
- `src/app/app/qr/[id]/page.tsx` — add carrier badge + carrier sections, rename copy
- `src/app/app/page.tsx` — add filter row + carrier badges to list rows
- `src/components/layout/app-sidebar.tsx` — "QR codes" → "Links", add "One-off QR" under More
- `src/types/qr.ts` — add `QRCarrier` type and `carrier` field on `QRCode`, `CreateQRRequest`, `UpdateQRRequest`
- `src/app/api/qr/route.ts` (create endpoint) — accept + validate `carrier` with Pro gate
- `src/app/api/qr/[id]/route.ts` (update endpoint) — accept + validate `carrier` with Pro gate

### Explicitly untouched (safety)
- `src/app/r/[slug]/route.ts` — redirect handler stays byte-for-byte identical
- `qr_scan_events` table and scan-recording logic
- `qr_styles` and `qr_assets` tables
- All `direct` mode QR generation code paths
- `/pricing` and `/` marketing pages

---

## 9. Error Handling

- **Pro gate violation (server):** `POST/PATCH /api/qr` returns `403 { error: 'pro_plan_required' }` if `carrier !== 'qr'` and `org.plan !== 'pro'`. UI shows "Only Pro organizations can enable NFC. Upgrade at /pricing." with a link.
- **Invalid carrier value:** server validates against the CHECK constraint values; returns `400 { error: 'invalid_carrier' }` for anything else.
- **Direct QR generation when `/app/qr/direct/new` is not reachable (e.g., JS disabled, modal state broken):** the existing server-side direct creation still works; the modal is a UX nudge, not a gate.
- **Slug collision on Link create:** current behaviour preserved (server returns an error; the form shows "Slug already taken").

## 10. Testing

### Migration safety
- Unit: apply `00025_qr_carrier.sql` to a clone of current production schema; assert all existing rows have `carrier = 'qr'` and no rows are locked/blocked.
- Smoke: after migration, resolve an existing slug via `/r/<slug>`; assert 307 to expected destination (regression guard for constraint #1).

### API
- `POST /api/qr` with `carrier: 'qr'` on Free org → 201
- `POST /api/qr` with `carrier: 'nfc'` on Free org → 403 `pro_plan_required`
- `POST /api/qr` with `carrier: 'both'` on Pro org → 201
- `PATCH /api/qr/[id]` changing carrier from `'qr'` to `'both'` on Pro org → 200
- `PATCH /api/qr/[id]` changing carrier from `'qr'` to `'both'` on Free org → 403

### UI
- Free org on `/app/new`: NFC card is visible, greyed-out, non-interactive, upgrade link points to `/pricing`
- Pro org on `/app/new`: NFC card is enabled and expands
- Direct QR modal appears on "Generate" click; "Create a Link instead" routes to `/app/new?url=<entered>` and prefills the URL
- Dashboard filter chips correctly partition the list
- Carrier badges render on list rows and edit-page header

### Regression
- Existing printed QR codes: generate a fresh redirect URL for an existing slug and confirm HTTP 307 response identical to pre-migration
- Direct QRs: existing `mode = 'direct'` rows continue to render on the list, display correctly on the edit page (with carrier sections hidden), and can still be viewed and deleted

---

## 11. Out of Scope / Deferred

Explicitly deferred to later specs so Phase 1 stays shippable:

- **Phase 2 — Shop pipeline:** Shop checkout creating `qr_codes` rows, admin fulfillment programming queue, order-to-link binding, `?src=nfc` URL suffix for per-carrier analytics.
- **Phase 3 — Self-serve Pro billing:** Stripe integration, checkout, subscription management. Until it ships, Pro is set manually by platform admins.
- **Public marketing copy update:** `/` and `/pricing` marketing pages referring to "QR codes" are not rewritten here.
- **Multiple carriers beyond QR + NFC:** future physical carriers (e.g., RFID wristbands) would extend the `carrier` CHECK constraint; not in Phase 1.
- **Carrier-level analytics split:** scan events are carrier-agnostic in Phase 1. Splitting requires Phase 2's shop pipeline to control the exact URL written to each physical carrier.
