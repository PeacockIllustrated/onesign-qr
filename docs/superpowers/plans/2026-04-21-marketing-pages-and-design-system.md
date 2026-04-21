# Marketing Pages + Design System Primitives Implementation Plan (Plan A)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extract the "DTC-editorial" design direction that currently lives inside `/app/shop` into a reusable design system, and rebuild the public marketing surface (`/`, `/features`, `/pricing`, `/shop`) on that system. Reflects the current and planned feature set of OneSign – Lynx so the marketing pages are the authoritative external story of what the product is.

**Architecture:** Design primitives extracted to `src/components/design/` — small, focused, reusable components (`<DarkShell>`, `<Eyebrow>`, `<Section>`, `<StatStrip>`, `<FeatureCard>`, `<CtaButton>`, `<MarketingNav>`, `<MarketingFooter>`). Four marketing pages (`/`, `/features`, `/pricing`, `/shop`) each compose these primitives. No new dependencies. All surfaces use the zinc-950 + lynx-400 palette. Customer UI (`/app/shop`) keeps its own version but shares the same tokens conceptually — later plans may DRY those into the new primitives.

**Tech Stack:** Next.js 16 App Router (server components for data, client components for interactivity), TypeScript, Tailwind CSS. `frontend-design` skill invoked for Tasks 3, 4, 5, and 6 (the page-level rebuilds) so design quality is consistent with /app/shop.

**Prerequisites:**
- Rebrand-to-Lynx commits shipped (logo, colour palette, theme colour).
- `/app/shop` already shipped and exemplifies the target aesthetic (reference point for the skill invocations).

**Scope boundary:**
- ✅ **In scope:** design primitives, four marketing pages (`/`, `/features`, `/pricing`, `/shop`), marketing-specific nav + footer.
- ❌ **Out of scope — Plan B:** authenticated app chrome rebuild (sidebar, auth pages, `/app/*` dashboards). The marketing pages link to `/auth/login` and `/auth/signup` but those pages continue to look like their current light-theme selves until Plan B ships.
- ❌ **Out of scope — other plans:** Stripe subscription flow (the `/pricing` CTAs point at `/auth/signup` for now, not at a live checkout — "Upgrade to Pro" becomes live when Pricing Tiers plan ships).
- ❌ **Deliberately NOT rebuilt:** `/app/shop` and `/app/shop/[slug]` — they already look how we want. No changes there.

**Reference spec:** `docs/superpowers/specs/2026-04-17-onesign-lynx-h1-h2-design.md` — feature list for what the marketing pages promote.

**Design reference:** `src/app/app/shop/page.tsx`, `src/app/app/shop/shop-catalog.tsx`, `src/app/app/shop/[slug]/page.tsx`, `src/components/shop/product-hero.tsx`, `src/components/shop/product-card.tsx`. These are the visual source of truth.

---

## Feature inventory (what the marketing pages promote)

Keep this list accurate or the pages lie. Update alongside this plan if feature state changes.

### Live in production
- Bio pages — multi-page per org, block-based editor, four starter templates, forms, galleries, contact forms, payment links, countdown timers, Maps/Spotify/YouTube embeds
- Managed QR codes — stable redirect URLs, custom styling, SVG/PNG/PDF exports, scan analytics
- Team invites — multi-user organisations with owner/admin/member roles, email invites, accept flow
- Super-admin dashboard — platform-wide support tooling for OneSign staff (internal; mention in CTO/enterprise messaging only)
- Shopfront catalog — browse branded NFC cards, review boards, table talkers, window decals, magnetic van panels, A-frames (checkout **coming soon**)

### Shipped to `main`, awaiting operator-applied migrations in production
- Invite flow (migration 00022)
- Super-admin audit log (migration 00023)
- Shopfront schema (migration 00024)

Assume these are live on the deploy that marketing points at. If they're not yet, hold off on the marketing launch or hedge the copy.

### In the pipeline (positioned as "coming soon" or roadmap)
- Shopfront checkout (Stripe, follow-up plan)
- NFC-first QR mode (medium tagging, NFC-writer helper)
- Lead capture inbox + CSV export
- Custom domains per bio page (Pro)
- Pricing tiers (Free / Pro)
- Email signature generator (Pro)
- Review funnel block (5★-to-Google / 1–3★-to-private)
- Business card generator (real-time preview, layout templates, quantity variants)

---

## File structure

**Created — design primitives:**
- `src/components/design/dark-shell.tsx` — zinc-950 page wrapper with grid-line overlay + optional radial glow. The equivalent of the shop's hero background, made reusable.
- `src/components/design/eyebrow.tsx` — small label ("OneSign · Lynx merch" style) with the horizontal dash + lynx-400 uppercase tracking-wide text.
- `src/components/design/section.tsx` — a section wrapper with consistent padding, max-width, and optional top/bottom rule.
- `src/components/design/stat-strip.tsx` — three-column trust signal strip with icon + label (like the shop hero's "UK-made / 48hr dispatch / NFC-enabled").
- `src/components/design/feature-card.tsx` — a card with icon, title, body, optional link. Used in feature grids.
- `src/components/design/cta-button.tsx` — primary (lynx-500 bg, zinc-950 text) and secondary (ghost with lynx-400 border) button variants for marketing CTAs.
- `src/components/design/index.ts` — barrel export.

**Created — marketing chrome:**
- `src/components/marketing/marketing-nav.tsx` — top nav with the `OneSignWordmark` (default dark variant, now readable on the zinc-950 hero), links to Features / Pricing / Shop, Sign in CTA, Sign up button.
- `src/components/marketing/marketing-footer.tsx` — zinc-950 footer with wordmark, site map, small print.

**Created — marketing pages:**
- `src/app/page.tsx` — **rebuilt** home page on the new design system (replaces the current light-theme version).
- `src/app/features/page.tsx` — feature deep-dive (can be long-scroll single page; see Task 4 for structure).
- `src/app/pricing/page.tsx` — Free vs Pro comparison.
- `src/app/shop/page.tsx` — public shopfront preview (different from authenticated `/app/shop` — no auth, shows the catalog but the Buy CTA links to `/auth/signup` with `?next=/app/shop/<slug>`).

**Modified:**
- `src/app/page.tsx` — being replaced by the new marketing home page (Task 3). The current file is effectively removed and rewritten.

**Not touched:**
- Any `/app/*` route (the authenticated app — that's Plan B).
- Any `/admin/*` route.
- Any API route.
- `/app/shop`, `/app/shop/[slug]` (already on the target aesthetic).

---

## Part 1 — Design primitives

### Task 1: Create the reusable design primitives (first batch)

**Files:**
- Create: `src/components/design/dark-shell.tsx`
- Create: `src/components/design/eyebrow.tsx`
- Create: `src/components/design/section.tsx`
- Create: `src/components/design/cta-button.tsx`
- Create: `src/components/design/index.ts`

Extract the four most-reused patterns from the shop first. Keep them tight and unstyled beyond necessity so pages can compose without fighting.

- [ ] **Step 1: DarkShell**

Create `src/components/design/dark-shell.tsx`:

```tsx
import { ReactNode } from 'react';

interface DarkShellProps {
  children: ReactNode;
  /**
   * Add a subtle lynx-tinted radial glow behind content. Use sparingly — on
   * hero sections, not body sections.
   */
  glow?: boolean;
  /**
   * Overlay a faint grid-line texture at ~4% opacity. Use on hero sections
   * where you want a "canvas" feel.
   */
  grid?: boolean;
  className?: string;
}

export function DarkShell({
  children,
  glow = false,
  grid = false,
  className = '',
}: DarkShellProps) {
  return (
    <div
      className={`relative bg-zinc-950 text-zinc-50 overflow-hidden ${className}`}
    >
      {grid && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage:
              'linear-gradient(to right, currentColor 1px, transparent 1px), linear-gradient(to bottom, currentColor 1px, transparent 1px)',
            backgroundSize: '48px 48px',
          }}
        />
      )}
      {glow && (
        <>
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -top-32 -left-32 w-[40rem] h-[40rem] rounded-full opacity-20 blur-3xl"
            style={{
              background:
                'radial-gradient(circle, rgba(88,163,134,0.45) 0%, transparent 60%)',
            }}
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -bottom-32 -right-32 w-[36rem] h-[36rem] rounded-full opacity-15 blur-3xl"
            style={{
              background:
                'radial-gradient(circle, rgba(88,163,134,0.35) 0%, transparent 60%)',
            }}
          />
        </>
      )}
      <div className="relative z-10">{children}</div>
    </div>
  );
}
```

- [ ] **Step 2: Eyebrow**

Create `src/components/design/eyebrow.tsx`:

```tsx
import { ReactNode } from 'react';

interface EyebrowProps {
  children: ReactNode;
  className?: string;
}

/**
 * Small above-headline label. The dash is decorative; colour is lynx-400 so
 * it reads as brand accent on zinc-950.
 */
export function Eyebrow({ children, className = '' }: EyebrowProps) {
  return (
    <p
      className={`inline-flex items-center gap-2 text-xs uppercase tracking-[0.2em] font-semibold text-lynx-400 ${className}`}
    >
      <span aria-hidden="true" className="inline-block w-6 h-px bg-lynx-400" />
      <span>{children}</span>
    </p>
  );
}
```

- [ ] **Step 3: Section**

Create `src/components/design/section.tsx`:

```tsx
import { ReactNode } from 'react';

interface SectionProps {
  children: ReactNode;
  /**
   * Default: max-w-6xl mx-auto px-5 md:px-8. Pass `widthClass` to override
   * (e.g. "max-w-5xl" for narrower content).
   */
  widthClass?: string;
  /**
   * Default vertical padding. Override for hero ("py-20 md:py-28") or
   * compressed sections ("py-10").
   */
  paddingClass?: string;
  /** Add a thin border-top for visual rhythm between sections. */
  topRule?: boolean;
  className?: string;
}

export function Section({
  children,
  widthClass = 'max-w-6xl',
  paddingClass = 'py-16 md:py-20',
  topRule = false,
  className = '',
}: SectionProps) {
  return (
    <section
      className={`${topRule ? 'border-t border-zinc-800' : ''} ${paddingClass} ${className}`}
    >
      <div className={`${widthClass} mx-auto px-5 md:px-8`}>{children}</div>
    </section>
  );
}
```

- [ ] **Step 4: CtaButton**

Create `src/components/design/cta-button.tsx`:

```tsx
import Link from 'next/link';
import { ReactNode } from 'react';

interface CtaButtonProps {
  href: string;
  children: ReactNode;
  variant?: 'primary' | 'secondary';
  size?: 'md' | 'lg';
  className?: string;
}

export function CtaButton({
  href,
  children,
  variant = 'primary',
  size = 'md',
  className = '',
}: CtaButtonProps) {
  const sizeClasses =
    size === 'lg'
      ? 'px-6 py-3.5 text-base'
      : 'px-5 py-2.5 text-sm';

  const variantClasses =
    variant === 'primary'
      ? 'bg-lynx-500 text-zinc-950 hover:bg-lynx-400 font-semibold shadow-sm'
      : 'border border-zinc-700 text-zinc-50 hover:border-lynx-400 hover:text-lynx-400';

  return (
    <Link
      href={href}
      className={`inline-flex items-center justify-center gap-2 rounded-lg transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lynx-400 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950 ${sizeClasses} ${variantClasses} ${className}`}
    >
      {children}
    </Link>
  );
}
```

- [ ] **Step 5: Barrel export**

Create `src/components/design/index.ts`:

```typescript
export { DarkShell } from './dark-shell';
export { Eyebrow } from './eyebrow';
export { Section } from './section';
export { CtaButton } from './cta-button';
```

- [ ] **Step 6: Typecheck + tests**

Run: `npm run type-check`
Expected: exit 0.

Run: `npm run test:run`
Expected: 226 tests still pass (no new tests; pure presentational components).

- [ ] **Step 7: Commit**

```bash
git add src/components/design/dark-shell.tsx src/components/design/eyebrow.tsx src/components/design/section.tsx src/components/design/cta-button.tsx src/components/design/index.ts
git commit -m "feat: add design primitives (DarkShell, Eyebrow, Section, CtaButton)"
```

---

### Task 2: Create the remaining primitives + marketing chrome

**Files:**
- Create: `src/components/design/stat-strip.tsx`
- Create: `src/components/design/feature-card.tsx`
- Create: `src/components/marketing/marketing-nav.tsx`
- Create: `src/components/marketing/marketing-footer.tsx`
- Modify: `src/components/design/index.ts` (extend barrel)

Before writing these, **invoke the `frontend-design` skill** to propose visuals for:

1. A three-item `StatStrip` — icon + label pairs separated by lynx-400 dot dividers, used on hero sections. Reference: the shop hero's "UK-made · 48hr dispatch · NFC-enabled" strip.
2. A `FeatureCard` — icon + title + body + optional link. Must work in grids of 3 and 4 columns. Reference: the shop's product cards but adapted for features (no price badge; add a "learn more →" link).
3. `MarketingNav` — top navigation with the `OneSignWordmark` on the left, nav links (Features, Pricing, Shop) centred, "Sign in" (text link) + "Sign up" (CtaButton primary) on the right. Mobile: hamburger → slide-down drawer. Reference: any premium DTC brand's top nav (clean horizontal rule underneath).
4. `MarketingFooter` — zinc-950 footer. Wordmark + tagline left. Three link columns (Product, Company, Legal) right. Thin zinc-800 rule at top, small-print row at bottom (© year + built-in-UK note + social links if any).

Take the skill's output, adapt to the file structure, and keep the same Tailwind-only constraint.

- [ ] **Step 1: Invoke frontend-design**

Use the Skill tool to request the four components above. Give it the shop hero as explicit style reference.

- [ ] **Step 2: Implement StatStrip, FeatureCard, MarketingNav, MarketingFooter**

Files listed above. Maintain accessibility: semantic HTML, visible focus rings via `focus-visible:ring-lynx-400`, alt text on any images, keyboard-navigable mobile drawer.

- [ ] **Step 3: Extend barrel**

Update `src/components/design/index.ts` to export `StatStrip` and `FeatureCard`. Keep marketing-chrome exports in `src/components/marketing/` (they're page-specific not reusable primitives).

- [ ] **Step 4: Typecheck + tests**

```
npm run type-check
npm run test:run
```
Expected: 226 tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/components/design/stat-strip.tsx src/components/design/feature-card.tsx src/components/design/index.ts src/components/marketing/marketing-nav.tsx src/components/marketing/marketing-footer.tsx
git commit -m "feat: add StatStrip, FeatureCard primitives + marketing nav/footer"
```

---

## Part 2 — Marketing pages

Each page-rebuild task follows the same pattern: invoke `frontend-design` with specific context (what the page is for, what content blocks it needs), take its output, wire up data (static content from the feature inventory above), compose primitives, commit. All pages wrap their content in `<DarkShell>`.

### Task 3: Rebuild `/` (home)

**Files:**
- Modify: `src/app/page.tsx` (wholesale rewrite)

- [ ] **Step 1: Invoke frontend-design for the home page**

Via the Skill tool. Context to provide:

> Home page for OneSign – Lynx, a business presence platform (bio pages, QR codes, NFC merchandise, review funnels, team accounts). UK SMB focus — cafés, salons, trades, retail. Current `/app/shop` is the design reference — zinc-950 + lynx-400 + amber(-ish) accents, DTC-editorial feel.
>
> Sections I need:
> 1. **Hero** — "One presence. Every channel." or similar headline. Subheadline explaining the platform. Dual CTA: "Get started" (primary, → /auth/signup) + "See features" (secondary, → /features). Supporting visual (could be a decorative QR or bio-page mock-up).
> 2. **Stat strip** — three numbers (e.g. "1000+ businesses", "sub-200ms redirects", "UK-made merch").
> 3. **What you get** — three-column FeatureCard grid for the pillar capabilities: Bio Pages, Managed QR Codes, Team Accounts. Each with an icon, headline, body, "learn more →" link pointing into `/features`.
> 4. **Shop teaser** — narrow image-led strip showing two or three shop products, link to `/shop`.
> 5. **Roadmap / coming soon** — two-column or single card noting checkout + Pro tier coming soon. Soft, not over-promising.
> 6. **CTA footer-strip** — big "Ready?" headline + single primary CTA (`/auth/signup`).

Tailwind only. Use `DarkShell`, `Section`, `Eyebrow`, `StatStrip`, `FeatureCard`, `CtaButton`, `MarketingNav`, `MarketingFooter` from what's already built in Tasks 1–2. Responsive: grids collapse on mobile, hero stacks on <md.

- [ ] **Step 2: Implement the home page**

Wholesale replace `src/app/page.tsx` with the frontend-design output, wired up with:
- Primitives imported from `@/components/design` and `@/components/marketing`.
- Feature copy pulled from the **Live in production** list in the Feature inventory section of this plan.
- Coming-soon callouts reference the **In the pipeline** list, but don't over-promise.
- CTAs: primary → `/auth/signup`, secondary → `/features`.

- [ ] **Step 3: Typecheck + tests + local smoke**

```
npm run type-check
npm run test:run
```
Expected: 226 tests pass.

Optional: `npm run dev` and visit `http://localhost:3000/` to eyeball the result.

- [ ] **Step 4: Commit**

```bash
git add src/app/page.tsx
git commit -m "feat: rebuild / on the dark design system (marketing home)"
```

---

### Task 4: `/features` (feature deep-dive)

**Files:**
- Create: `src/app/features/page.tsx`

Long-scroll single page (don't split into multiple routes in this first release). Each live + shipped feature gets a dedicated anchor section; "coming soon" features live in a lighter roadmap strip at the bottom.

- [ ] **Step 1: Invoke frontend-design for the features page**

Context:

> Features page for OneSign – Lynx. Long-scroll. Reader is a UK SMB owner trying to decide if this is worth signing up for.
>
> Sections:
> 1. **Page hero** — short, crisp: "Every way to be found." (or similar). Optional sticky anchor nav with Bio Pages / QR Codes / Team / Shop / Roadmap.
> 2. **Bio Pages** — screenshot or mock, bullet list of capabilities (block editor, templates, forms, galleries, payment links, countdown, Maps/Spotify/YouTube embeds).
> 3. **Managed QR Codes** — explain the "print once, redirect anywhere" concept. Bullets: custom styling, SVG/PNG/PDF exports, scan analytics, stable URLs.
> 4. **Team Accounts** — multi-user orgs, role-based access (owner/admin/member), email invites.
> 5. **Shop** — branded physical merch. Link across to `/shop`. Preview a handful of SKUs.
> 6. **Roadmap** — "coming soon" strip: checkout, NFC mode, lead inbox, custom domains, pricing tiers, email signatures, review funnel, business cards.
> 7. **Final CTA**.
>
> Alternating section backgrounds for visual rhythm — zinc-950 default with zinc-900 every other section. Lynx-400 accents throughout. Same primitives as the home page.

- [ ] **Step 2: Implement**

Create `src/app/features/page.tsx` using the skill output. Pull copy from the feature inventory. For each feature, include 3–5 concrete bullet points drawn from what actually shipped (look at the plans in `docs/superpowers/plans/` if you need accurate detail).

- [ ] **Step 3: Typecheck + tests + commit**

```
npm run type-check
npm run test:run
git add src/app/features/page.tsx
git commit -m "feat: add /features long-scroll feature deep-dive"
```

---

### Task 5: `/pricing`

**Files:**
- Create: `src/app/pricing/page.tsx`

Two-plan comparison. Pricing Tiers plan hasn't landed yet — so "Pro" is described but the Pro CTA points at `/auth/signup` with a note "Upgrade to Pro from any account — coming with the next release."

- [ ] **Step 1: Invoke frontend-design for the pricing page**

Context:

> Pricing page for OneSign – Lynx. Two tiers: Free and Pro. Physical-goods purchases (shop) are orthogonal to tier and mentioned separately.
>
> Tier feature split:
> - **Free**: up to 5 bio pages per org, unlimited managed QR codes, basic analytics, contact forms, team accounts (up to 3 members).
> - **Pro**: everything in Free + custom domain per bio page, email signature generator, unlimited team members, priority support, review funnel block.
>
> CTAs:
> - Free → "Start free" → `/auth/signup`
> - Pro → "Get Pro" → `/auth/signup?plan=pro` (the signup will honour this later; for now the query param is ignored and both land in Free).
>
> Layout: two-column comparison card, hero strip above it, FAQ below. Use `DarkShell` + `Section` + existing primitives. Badge the Pro plan as "Recommended" with a lynx-400 accent.
>
> Below the pricing: small "Physical merch" strip pointing at `/shop` — explains shop purchases are one-off, independent of tier.

- [ ] **Step 2: Implement**

Create `src/app/pricing/page.tsx`. Make sure the Pro feature list matches the spec's Section 3.5 (Pricing tier system) and Section 4.1 (email signature is Pro). Don't invent features.

Add a simple in-page FAQ: 4–6 Q&As (e.g. "Can I switch from Free to Pro later?", "Do shop purchases need Pro?", "What about custom domains?", "How does team billing work?" — note where answers are "coming with the next release").

- [ ] **Step 3: Typecheck + tests + commit**

```
npm run type-check
npm run test:run
git add src/app/pricing/page.tsx
git commit -m "feat: add /pricing with Free/Pro comparison + FAQ"
```

---

### Task 6: `/shop` (public shopfront preview)

**Files:**
- Create: `src/app/shop/page.tsx`

Mirror of `/app/shop` but unauthenticated and marketing-oriented. Uses the admin Supabase client (service-role) to read active products — RLS on `shop_products` requires `authenticated` role, so unauthenticated marketing access needs the admin client.

- [ ] **Step 1: Invoke frontend-design for the public shop page**

Context:

> Public (unauthenticated) preview of the OneSign – Lynx merch shop. Similar layout to /app/shop but the top nav is the MarketingNav, not the authenticated app sidebar. Product cards link to `/shop/<slug>` publicly OR to `/auth/signup?next=/app/shop/<slug>` (your call — current preference is signup-gating on click, so clicking a product takes you to signup with a post-auth redirect).
>
> Hero: "Merch that actually does something." Subhead explaining these are branded, QR/NFC-programmed products linked to your Lynx account. StatStrip with "UK-made / 48hr dispatch / NFC-enabled" (copied from /app/shop).
>
> Category filter + card grid, same as /app/shop but slightly airier (this is marketing, not admin browse).

- [ ] **Step 2: Implement**

Create `src/app/shop/page.tsx`:
- Fetch products via `createAdminClient()` because RLS on `shop_products` requires an authenticated user and this page serves unauthenticated visitors.
- Filter to `is_active = true AND deleted_at IS NULL`.
- Render with `DarkShell`, `Eyebrow`, `Section`, `MarketingNav`, `MarketingFooter`.
- Each product card's click target: `/auth/signup?next=/app/shop/${slug}` (signup-gated preview).

Do NOT build a public `/shop/[slug]` in this plan — clicking any card routes to signup. If/when you want a fully-public product detail, that's a follow-up.

- [ ] **Step 3: Typecheck + tests + commit**

```
npm run type-check
npm run test:run
git add src/app/shop/page.tsx
git commit -m "feat: add public /shop marketing preview (signup-gated clicks)"
```

---

## Part 3 — Verify + merge + deploy

### Task 7: Final whole-branch review

Dispatch the `superpowers:code-reviewer` agent across the branch. Key checks:

- **Scope discipline**: only `src/components/design/*`, `src/components/marketing/*`, `src/app/page.tsx` (rewritten), `src/app/features/page.tsx` (new), `src/app/pricing/page.tsx` (new), `src/app/shop/page.tsx` (new) — no other files.
- **Accessibility**: semantic HTML (one `<h1>` per page, logical heading order, alt text on all `<img>`/`<Image>`, visible focus rings).
- **Responsive**: mobile (< 640px) works cleanly on every page — hero stacks, grids collapse, nav switches to a drawer.
- **No new dependencies**: `package.json` unchanged.
- **Palette consistency**: zinc-950 / zinc-900 / zinc-800 / zinc-50 / zinc-300 / zinc-500 + `lynx-400` / `lynx-500` only. No legacy `amber-*` sneaking back in.
- **Linking**: marketing → `/auth/signup` and `/auth/login` everywhere the user is asked to act.
- **Test/typecheck**: `npm run test:run` green, `npm run type-check` clean.

If the reviewer flags issues, fix them on-branch before merging.

### Task 8: Merge + push

```bash
# Assuming this was done on a feature branch lynx/marketing-and-design-system
git checkout main
git merge --no-ff lynx/marketing-and-design-system -m "Merge: marketing pages + design system primitives"
git push origin main
git branch -d lynx/marketing-and-design-system
```

Vercel will auto-deploy.

### Task 9 (MANUAL): Smoke test the live URLs

Once Vercel shows **Ready** on the deploy:

- [ ] Visit `https://<your-vercel-url>/` — home renders on dark aesthetic, wordmark visible, CTAs work.
- [ ] Visit `/features` — long-scroll loads, anchor links work.
- [ ] Visit `/pricing` — Free/Pro comparison + FAQ render.
- [ ] Visit `/shop` — products render (requires migration 00024 already applied). Click a product → lands at `/auth/signup?next=...`.
- [ ] Mobile check: open all four pages on a phone viewport — no horizontal scroll, nav drawer works.

---

## Completion criteria

Plan A is done when:

1. Seven new/rebuilt files landed on `main` (3 design primitives in wave 1, 4 in wave 2; 4 marketing pages; marketing chrome).
2. `npm run type-check` clean, `npm run test:run` green.
3. All four marketing URLs render on the dark aesthetic with no legacy light-theme chrome.
4. Feature copy accurately reflects the inventory section above.
5. No changes outside the scope boundary.

**Next up after this ships:** Plan B (authenticated app chrome — sidebar, auth pages, `/app/*` dashboard home → dark aesthetic), which will also remove the explicit `variant="light"`/`variant="black"` overrides on the logo callers now that backgrounds flip dark.
