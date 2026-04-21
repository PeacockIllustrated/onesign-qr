# Business Card Generator Implementation Roadmap

**Date:** 2026-04-18
**Feature:** Business card design + lightweight shop + order fulfillment
**Depends on:**
- Phase 0.A–0.C **complete in production** (org model, RLS rewrite, active-org
  session cookie). Every table in this plan uses `org_id` for authorisation —
  nullable-`org_id` rows from Phase 0.A are not sufficient.
- Phase 1 H1 features live (multi-page, pricing tiers, `orgHasFeature`).
- Phase 2.A shopfront foundation shipped (`shop_products`,
  `shop_product_variants`, `shop_product_customizations`, `shop_orders`,
  `shop_order_items`, Stripe Checkout session creation, post-purchase
  emails via Resend).
**Integrates with:** Shopfront in Phase 2 (Release 2.0)

---

## Overview

The business card generator is a Horizon 2 feature that ship as part of the shopfront in Release 2.0. It differs from other shopfront products (NFC cards, review boards, etc.) in that it has:

1. **Per-user customization** — each org member designs their own card using their name, title, email from Lynx profile data
2. **Real-time live preview** — SVG front/back rendered on the client as the user adjusts design
3. **Org branding lock** — admins set the layout template and colour scheme once; members fill in their personal fields
4. **Managed URL integration** — optionally embed the user's bio page QR code on the card

This roadmap divides implementation into discrete phases that can be built in parallel with other shopfront work.

---

## Architecture Overview

### Database Schema Additions

**New tables:**
- `business_card_templates` — layout templates (horizontal, vertical, stacked, compact, minimal). Managed by super-admin.
- `business_card_customizations` — per-org settings locked by the org admin (layout template, org colour scheme, font family).
- `business_card_orders` — references `shop_orders.id`, stores the final SVG design + rendered options.

**Extend existing tables:**
- `shop_product_customizations` — add entries for business card product: `member_name`, `title`, `email`, `phone`, `website`, `layout_template`, `color_scheme`, `finish_option`, `include_qr` (true/false), `quantity`.

### Frontend Components

- **CardDesignEditor** — real-time live preview with form inputs for customizable fields
- **CardPreview** — renders front/back SVG from a design spec
- **LayoutSelector** — choose from available templates
- **ColourSchemeEditor** — pick accent/text colours within org's locked brand

### Backend API Routes

- `POST /api/business-cards/preview` — generate SVG for live preview
- `POST /api/business-cards/validate-design` — validate design before checkout
- `POST /api/business-cards/render` — render final SVG for fulfillment (called on order creation)

---

## Implementation Phases

### Phase 2.A — Shopfront Foundation (Prerequisite)

**Goal:** Build the generic shopfront infrastructure that all products depend on.

**Delivers:**
- `organizations.plan` column + `orgHasFeature()` helper
- `shop_products`, `shop_product_variants`, `shop_product_customizations` tables
- Stripe Checkout integration + Stripe Tax
- `shop_orders` and `shop_order_items` tables
- Admin product CRUD screens
- Customer `/app/shop` with category filter and product detail page
- Post-purchase email flow

**Deliverables:**
- [ ] Database schema migration
- [x] Admin product CRUD API endpoints
- [x] `/app/shop` listing page with categories
- [x] Product detail page shell (ready for per-product customization UI)
- [x] Stripe Checkout session creation
- [x] Order confirmation emails via Resend

**Estimated effort:** 3–4 weeks

---

### Phase 2.B — Business Card Product Record

**Goal:** Set up the business card as a shopfront product with its customization schema.

**Delivers:**
- `business_card_templates` table with 5 seed templates (horizontal, vertical, stacked, compact, minimal)
- `business_card_customizations` table for per-org admin settings
- `shop_product_customizations` entries for the business card product
- Super-admin interface to manage card templates

**Deliverables:**
- [ ] Database migrations: templates, customizations tables
- [x] TypeScript types for business card customizations
- [x] `POST /api/admin/business-card-templates` — CRUD for templates
- [x] `POST /api/app/business-card-customizations` — org admin sets template + branding lock
- [x] Seed data: 5 default templates with layout JSON

**Tasks:**
- [ ] Create migration `00021_business_card_products.sql` (exact number
  depends on what migrations have landed by Release 2.0 — 00017 is Phase 0.B
  backfill, 00018–00020 are reserved for Phase 0.C RLS rewrite and Phase 2.A
  shopfront tables; confirm the next free number at implementation time).
  - `business_card_templates` (id, name, description, layout_json, version,
    is_active, created_at)
  - `business_card_customizations` (org_id, layout_template_id, primary_color,
    accent_color, font_family, locked_at, locked_by)
  - Add shop_products row for "Premium Business Cards" product
- [ ] Create `src/types/business-card.ts`
- [ ] Create `src/validations/business-card.ts` (Zod schemas)
- [ ] Create `src/__tests__/validations/business-card.test.ts`
- [ ] Create `src/lib/business-card/template-rendering.ts` (pure functions to render SVG from spec)
- [ ] Create API route handlers for admin + org customization
- [ ] Add unit tests

**Estimated effort:** 1–1.5 weeks

---

### Phase 2.C — Live Preview Component

**Goal:** Build the real-time SVG preview component and backend preview API.

**Delivers:**
- CardPreview component (renders front/back SVG from design data)
- CardDesignEditor component (form inputs for name, title, email, phone, website, QR toggle)
- `POST /api/business-cards/preview` endpoint
- Client-side live re-rendering on field change

**Deliverables:**
- [ ] `src/components/business-card/CardPreview.tsx`
- [x] `src/components/business-card/CardDesignEditor.tsx`
- [x] `src/lib/business-card/generate-preview-svg.ts` (pure function)
- [x] API route: `src/app/api/business-cards/preview/route.ts`
- [x] React hook: `useCardPreview()` for client-side updates
- [x] Unit tests for SVG generation

**Tasks:**
- [ ] Design CardPreview component
  - Takes design spec (layout, fields, colours, options)
  - Outputs Canvas or SVG element showing front/back
  - Responsive, mobile-friendly
- [ ] Implement live SVG generation (no external rendering service yet)
- [ ] Build CardDesignEditor form with fields:
  - Text inputs: name (auto-filled from user profile), title, phone, email (auto-filled), website
  - Toggle: include QR code (yes/no)
  - QR code size slider (if included)
  - Layout template selector (locked by org admin)
  - Colour scheme preview (locked by org admin)
- [ ] API endpoint for preview generation (calls pure SVG generator)
- [ ] Client-side wiring: onChange → debounced API call → preview update
- [ ] Test suite for SVG generation with various field combinations

**Estimated effort:** 1.5–2 weeks

---

### Phase 2.D — Checkout Integration

**Goal:** Wire business card design into the existing shopfront checkout flow.

**Delivers:**
- Product detail page for business cards (reuses generic product-detail shell)
- Design editor embedded in the product detail page
- Customization data captured and stored with order

**Deliverables:**
- [ ] `/app/shop/[productId]` page extended for business cards
- [x] Design editor embedded in product detail
- [x] Quantity and finish options (gloss, matte, velvet)
- [x] "Add to cart" → Stripe Checkout (with design data passed through to order)
- [x] `POST /api/business-cards/validate-design` — pre-checkout validation
- [ ] Post-order: design SVG stored in `shop_order_items.customization_values` JSON

**Tasks:**
- [ ] Extend product detail page to detect business card product
- [ ] Embed CardDesignEditor + CardPreview on the product detail page
- [ ] Add quantity selector (250, 500, 1000, 2500)
- [ ] Add finish dropdown (gloss, matte, velvet) using `shop_product_variants`
- [ ] Validation endpoint: check fields are non-empty, QR URL is valid (if included)
- [ ] Extend Stripe checkout session creation to pass design data as metadata
- [ ] On order creation, store final design SVG in order items
- [ ] Test: full flow from design → checkout → order confirmation email (with proof SVG)

**Estimated effort:** 1 week

---

### Phase 2.E — Full-Page PDF Rendering (Proof Generation)

**Goal:** Generate printable PDFs showing the customer's design for proofing before fulfillment.

**Delivers:**
- `POST /api/business-cards/render-pdf` endpoint
- Proof PDF attached to order confirmation email
- Proof PDF viewable in order detail page (super-admin & org)

**Deliverables:**
- [ ] `src/lib/business-card/render-proof-pdf.ts` using `@sparticuz/chromium` + `playwright-core`
- [x] API route for PDF generation
- [x] Proof PDF emailed to org + order link
- [x] Super-admin fulfillment UI shows link to proof PDF

**Tasks:**
- [ ] Create `src/lib/business-card/render-proof-pdf.ts`
  - Takes design spec + org branding
  - Renders HTML → headless browser → PDF (A4 sheet showing front/back at print scale)
  - Includes bleed lines and crop marks
- [ ] API endpoint: `POST /api/business-cards/render-pdf`
- [ ] Call render-pdf on order creation (fire-and-forget)
- [ ] Store proof PDF path in `shop_orders` table
- [ ] Attach proof to order confirmation email
- [ ] Super-admin fulfillment screen shows "View Proof PDF" link
- [ ] Test: proof matches design spec, PDF is valid, email attachment works

**Estimated effort:** 1.5–2 weeks

---

### Phase 2.F — Fulfillment Workflow + Merchant Integrations

**Goal:** Connect order fulfillment to print-on-demand or bulk printing supplier.

**Deliverables:**
- [ ] Kanban board in super-admin: new → in production → shipped → delivered
- [x] Supplier API integration (placeholder for print-on-demand, real for chosen vendor)
- [x] Webhook receiver: supplier sends shipment tracking
- [x] Shipping email with tracking number sent to org

**Tasks:**
- [ ] Design specification for supplier API integration (vendor TBD until Release 2.0 prep)
- [ ] Super-admin fulfillment UI (new → in production → shipped → delivered states)
- [ ] Manual fulfillment entry: upload production proof image, enter tracking number
- [ ] Automated supplier integration (if applicable for chosen vendor):
  - `POST /api/fulfillment/send-to-supplier` — webhook triggered by super-admin
  - `POST /api/fulfillment/receive-tracking` — supplier webhook updates order with tracking
- [ ] Shipping email template via Resend
- [ ] Test: full fulfillment flow from order → fulfillment → shipping email

**Estimated effort:** 2–3 weeks

---

### Phase 2.G — QA, Load Testing, Dog-fooding

**Goal:** Ensure design quality, performance, and reliability before Release 2.0.

**Deliverables:**
- [ ] End-to-end test: design card → checkout → order email with proof → fulfillment
- [x] Load test: 1000 simultaneous preview requests
- [x] Staff ordering: internal test orders from each dept (marketing, sales, support)
- [x] Accessibility audit: form inputs, preview, PDF output
- [x] Browser compatibility (Chrome, Firefox, Safari, Edge)

**Tasks:**
- [ ] Write E2E test using Playwright (or current test framework)
- [ ] Perf benchmark: preview generation under load (target: <200ms p99)
- [ ] Internal launch: staff orders placed, reviewed, shipped (real supplier test)
- [ ] Collect feedback on UX, design, email experience
- [ ] Fix bugs, polish edge cases
- [ ] Final security review: are design SVGs HTML-escaped? (XSS risk)

**Estimated effort:** 1.5–2 weeks

---

## Dependency Graph and Timeline

```
Phase 2.A: Shopfront Foundation (3–4 weeks)
  └─ Phase 2.B: Card Product Record (1–1.5 weeks)
     └─ Phase 2.C: Live Preview Component (1.5–2 weeks)
        └─ Phase 2.D: Checkout Integration (1 week)
           ├─ Phase 2.E: PDF Rendering (1.5–2 weeks) [parallel okay]
           └─ Phase 2.F: Fulfillment Workflow (2–3 weeks) [parallel okay]
              └─ Phase 2.G: QA + Dog-fooding (1.5–2 weeks)
```

**Sequential path (critical):** A → B → C → D  
**Parallel:** E and F can start after D is done  
**Final:** G after E and F complete

**Total:** ~13–16 weeks (with parallelization)

---

## Pre-flight Checklist Before Each Phase

### Before Phase 2.B starts
- [ ] Phase 2.A complete and merged to staging
- [ ] Shopfront product model is stable (no breaking schema changes expected)
- [ ] Super-admin dashboard exists and is deployable
- [ ] Stripe Checkout integration tested end-to-end

### Before Phase 2.D starts
- [ ] CardPreview and CardDesignEditor fully tested and performant
- [ ] SVG generation handles all template variants without error
- [ ] Org admin can set business card customizations successfully

### Before Phase 2.F starts
- [ ] Physical supplier relationship confirmed and API documented
- [ ] Order data model can accommodate supplier integrations
- [ ] Send-to-supplier and receive-tracking flows designed

### Before Phase 2.G starts
- [ ] All phases B–F shipped to staging
- [ ] Database integrity checks pass
- [ ] No regressions in existing shopfront products (NFC, boards, etc.)

---

---

## Security and integrity requirements

These cut across every phase and must be enforced by Phase 2.G.

### SVG injection / XSS
- **All user-controlled fields** (member_name, title, phone, email, website,
  custom_text) must be HTML-entity-escaped before being interpolated into an
  SVG `<text>` element. Treat the preview, validate, render, and PDF paths
  as four independent boundaries; each must escape. Do not rely on React
  string interpolation alone — server-rendered SVGs bypass it.
- Reject any design spec whose field values contain `<`, `>`, or `&` unless
  they were produced by the escape function. Round-trip test in Phase 2.G.
- Never inline user-provided HTML anywhere, including inside `<foreignObject>`.

### Managed-URL allowlist for embedded QR
- The `include_qr` flag may only encode one of:
  - The org's active bio-page URL (`/r/{slug}` or the custom domain it
    resolves to), OR
  - The managed short URL (`/r/{slug}`) for a QR the member owns.
- Arbitrary user-supplied URLs are rejected at `validate-design`. This
  prevents a member from printing a QR that redirects to an attacker site
  under the org's brand.

### PDF render sandbox
- `@sparticuz/chromium` + `playwright-core` runs in a serverless sandbox.
  The HTML fed to it is built server-side from an escaped design spec and
  the org's locked template — no user-supplied HTML reaches the renderer.
- Outgoing network access from the renderer is disabled; all assets (fonts,
  logos) are fetched server-side, embedded as base64 data URIs, and then
  passed to the headless browser inline.

### Design-spec versioning
- `business_card_templates.version` (integer) is bumped on any change to
  `layout_json`. `shop_order_items.customization_values` snapshots the full
  spec including `template_version`. Proof PDFs re-rendered months later
  must render against the snapshot, not the current template.
- Template edits are additive. No existing version is rewritten in place.
  Deprecated templates remain renderable forever.

### Font licensing
- The 3–4 "professional fonts" must have a licence that permits both web
  embedding (hosted signature URL, live preview) and print use (PDF proofs
  and the supplier's physical output). Open-source fonts with OFL (SIL Open
  Font License) satisfy both; commercial foundry licences commonly do not
  cover print-on-demand — check before picking.
- Record the exact font filenames, versions, and licence URLs in
  `business_card_templates.layout_json`.

### Visual regression tests
- Phase 2.G must include a snapshot suite: for each template × each known
  field-set permutation (empty, longest-name, all-fields-filled,
  non-ASCII), generate the SVG and compare to a stored golden file.
  Changes require a deliberate update to the goldens.
- Run the snapshot suite in CI on any PR that touches
  `src/lib/business-card/**`.

### GDPR + supplier agreement
- Member name, phone, email, and physical shipping address cross into the
  print supplier's systems. Before Release 2.0, a Data Processing Agreement
  (DPA) with the supplier must be in place and referenced in the customer
  Terms. Retention windows for the supplier's copy of the design +
  shipping address must be ≤90 days unless the supplier can show GDPR
  Art. 28 compliance for longer retention.

---

## Open Questions

- **Supplier choice:** Which print-on-demand or bulk printer partner? Affects integration effort in Phase 2.F.
- **Variable data in bulk orders:** Can an org supply a CSV of employee names → each card printed individually? Deferred to H3; H2 is static design per order.
- **Digital proofing SLA:** Auto-approve proofs on order creation, or add a manual approval step? Current design: auto-approve (no SLA in H2).
- **Cardholder upsell:** Should the order confirmation email suggest purchasing card stands, storage boxes, etc.? Deferred beyond Release 2.0.

---

## Non-goals for Release 2.0

- No digital preview tool for choosing finishes (gloss / matte / velvet side-by-side).
- No augmented reality card preview.
- No in-browser file upload (logo must come from org profile).
- No batch ordering dashboard (bulk CSV upload for multi-user orgs) — use individual orders.
- No international shipping or multi-currency pricing.

---

## Team assignments and ownership

Populate at Phase 2.A kick-off. Leaving blank in the plan keeps it honest
about the open allocation rather than pretending assignments have been made.

| Phase | Owner | Reviewer |
|---|---|---|
| 2.A Shopfront foundation | | |
| 2.B Card product record | | |
| 2.C Live preview component | | |
| 2.D Checkout integration | | |
| 2.E PDF rendering | | |
| 2.F Fulfillment workflow | | |
| 2.G QA + dog-fooding | | |

---

## Success Metrics (Post-Release 2.0)

- DAU ordering business cards ≥5% of active orgs within first month.
- Average order value (AOV) >£50 (mix of 250/500/1000 unit quantities).
- Fulfillment SLA met: 100% of orders shipped within 5 business days of payment.
- Zero production defects: <0.1% of orders requested reprints due to design/print issues.
- NPS from card-ordering users ≥40.
