# Bio Editor Expansion — Design Spec

**Date:** 2026-03-16
**Status:** Draft
**Goal:** Expand the bio page editor with new block types, starter templates, preview modes, and per-block styling to increase user stickiness and cover more use cases across all audience segments (creators, businesses, events, portfolios).
**Strategy:** Growth-first. Maximize adoption and shareability. Monetization comes later.

---

## Table of Contents

1. [New Block Types](#1-new-block-types)
2. [Starter Templates](#2-starter-templates)
3. [Editor Enhancements](#3-editor-enhancements)
4. [Aesthetic Standards](#4-aesthetic-standards)
5. [Data Model Changes](#5-data-model-changes)
6. [API Routes](#6-api-routes)
7. [Scope & Non-Goals](#7-scope--non-goals)
8. [Build Order](#8-build-order)

---

## 1. New Block Types

Four new block types added to the `block_type` enum: `contact_form`, `gallery`, `countdown`, `payment_link`.

### 1.1 Contact Form Block

A native form embedded directly in the bio page. Submissions stored in a new `bio_form_submissions` table and optionally forwarded to the page owner's email.

**Owner configuration:**

| Field | Type | Required | Default |
|-------|------|----------|---------|
| `form_title` | string | No | "Get in touch" |
| `fields` | string[] | Yes | `["name", "email", "message"]` |
| `success_message` | string | No | "Thanks! I'll be in touch." |
| `notify_email` | boolean | No | `true` |

Available fields: `name` (always required), `email` (always required), `message` (always required), `phone` (optional), `subject` (optional).

**Public page behavior:**
- Renders inline within the grid block
- Submits via `POST /api/bio/[id]/form` — no page reload
- Rate limited: 5 submissions per hour per IP per page
- Success: smooth fade transition to success message with checkmark icon
- Error: red border on invalid fields, inline error text below each field — no alert popups

**Owner management:**
- New "Inbox" tab in the bio editor sidebar
- Lists submissions with name, email, timestamp, read/unread status
- Click to expand full submission
- Mark read/unread, delete individual submissions

**Content JSONB shape:**
```json
{
  "form_title": "Get in touch",
  "fields": ["name", "email", "message", "phone"],
  "success_message": "Thanks! I'll be in touch.",
  "notify_email": true
}
```

### 1.2 Image Gallery Block

A grid or carousel of images within a single block.

**Owner configuration:**

| Field | Type | Required | Default |
|-------|------|----------|---------|
| `display_mode` | "grid" \| "carousel" | Yes | "grid" |
| `columns` | 2 \| 3 | No (grid only) | 2 |
| `images` | ImageItem[] | Yes | `[]` |

Each `ImageItem`:
- `storage_path` (string, required) — path in Supabase storage
- `caption` (string, nullable) — optional text below image
- `link_url` (string, nullable) — if set, clicking opens this URL

**Upload:** 2-12 images per gallery block. Stored in `bio-covers` bucket under `gallery/{page_id}/{image_id}`. Same 2MB limit, JPEG/PNG/WebP only.

**Click behavior:**
- If `link_url` is set: opens link in new tab
- If no `link_url`: opens lightbox (full-screen overlay with dark background at 90% opacity, centered image, close button, swipe support on mobile, fade-in animation)

**Carousel mode:** Smooth CSS scroll-snap, subtle left/right arrow overlays, dot indicators below.

**Content JSONB shape:**
```json
{
  "display_mode": "grid",
  "columns": 2,
  "images": [
    { "storage_path": "gallery/abc/img1.jpg", "caption": "My work", "link_url": null },
    { "storage_path": "gallery/abc/img2.jpg", "caption": null, "link_url": "https://example.com" }
  ]
}
```

### 1.3 Countdown Timer Block

Displays a live countdown to a target date/time.

**Owner configuration:**

| Field | Type | Required | Default |
|-------|------|----------|---------|
| `target_datetime` | ISO 8601 string | Yes | — |
| `label` | string | No | "Countdown" |
| `expired_message` | string | No | "We're live!" |
| `style` | "compact" \| "large" | No | "large" |

**Rendering:**
- **Large style:** Individual boxes for days/hours/minutes/seconds with subtle background differentiation, monospace numbers (`font-variant-numeric: tabular-nums`), label text below each box
- **Compact style:** Single line — "12d 5h 23m 10s" with consistent digit widths to prevent layout shift
- **Expired state:** Smooth crossfade from timer to expired message
- Numbers update every second via `setInterval`, cleaned up on component unmount

**Responsive:** At 1-column span, automatically uses compact style regardless of setting.

**Content JSONB shape:**
```json
{
  "target_datetime": "2026-04-01T18:00:00Z",
  "label": "Launch in",
  "expired_message": "We're live!",
  "style": "large"
}
```

### 1.4 Payment Link Block

A styled button/card linking to external payment platforms. Does NOT process payments — links out only.

**Owner configuration:**

| Field | Type | Required | Default |
|-------|------|----------|---------|
| `platform` | enum | Yes | — |
| `url` | string | Yes | — |
| `display_text` | string | No | Platform default (e.g., "Buy me a coffee") |
| `suggested_amounts` | string[] | No | `[]` |

Supported platforms: `paypal`, `venmo`, `cashapp`, `stripe`, `buymeacoffee`, `ko-fi`, `custom`.

**Rendering:**
- Card/button hybrid: platform icon left, text center, subtle arrow right
- Platform-specific brand colors (PayPal blue, Venmo blue, Cash App green, Ko-fi yellow, etc.)
- Suggested amounts render as pill-shaped badges below the main button (display only, non-interactive)
- Hover: translateY(-2px) + shadow increase, matching existing link block hover behavior
- `custom` platform: uses accent color, generic link icon

**Content JSONB shape:**
```json
{
  "platform": "buymeacoffee",
  "url": "https://buymeacoffee.com/username",
  "display_text": "Buy me a coffee",
  "suggested_amounts": ["$5", "$10", "$25"]
}
```

---

## 2. Starter Templates

Templates are pre-built page configurations applied during bio page creation or from the editor. They set the theme, card layout, typography, and pre-populate a grid of blocks.

### 2.1 Implementation

- **Stored as static TypeScript objects** in `src/lib/bio/templates.ts` — not in the database
- Each template defines: `name`, `description`, `category`, `thumbnail`, `theme`, `card_layout`, `font_title`, `font_body`, `border_radius`, `spacing`, and a `blocks` array with grid positions and content
- **On selection:** System creates the bio page with template settings and inserts the template's blocks as real `bio_blocks` rows — fully editable from that point
- **Apply to existing page:** Replaces current blocks (with confirmation warning). Page-level settings (avatar, cover, custom colors) are preserved.

### 2.2 Template Definitions

**Creator**
- Target: Influencers, artists, musicians
- Theme: `gradient-sunset`, card layout: `centered`, spacing: `spacious`
- Blocks: heading ("Hey, I'm [Name]"), social icons, YouTube embed, Spotify embed, image block, link ("My latest project"), payment link ("Support my work")

**Business**
- Target: Small businesses, freelancers, consultants
- Theme: `minimal`, card layout: `left-aligned`, spacing: `normal`
- Blocks: heading ("Welcome"), text (short intro), link x3 ("Our Services", "Book an Appointment", "Reviews"), contact form, map block, social icons

**Event**
- Target: Conferences, meetups, weddings, launches
- Theme: `bold`, card layout: `split`, spacing: `normal`
- Blocks: heading ("Event Name"), countdown timer, text (event details), map block, link ("Get Tickets"), image gallery (venue photos placeholder), social icons

**Portfolio**
- Target: Designers, photographers, developers
- Theme: `glass`, card layout: `minimal`, spacing: `compact`
- Blocks: heading ("My Work"), image gallery (grid, 3 columns), text (short bio), link x2 ("Resume", "Hire Me"), social icons, contact form

### 2.3 Template Picker UX

**During creation:**
- After entering page title/slug, user sees a template picker
- 2x2 grid of template cards with miniature screenshot-style previews (~200px wide)
- Template name and one-line description below each card
- "Blank" option first: dashed border, plus icon
- Hover: subtle scale-up (1.02) + border highlight
- Selected: accent-colored border + checkmark badge

**In the editor:**
- "Templates" button in the toolbar opens the same picker as a modal overlay
- Warning: "This will replace your current blocks. Your settings (theme, colors, avatar) won't change."
- Confirm/cancel before applying

---

## 3. Editor Enhancements

### 3.1 Preview Modes

Toggle bar at the top of the preview pane with three device icons (monitor/tablet/phone) in a segmented control:

| Mode | Preview Width | Behavior |
|------|-------------|----------|
| Desktop | Full width | Default, same as current |
| Tablet | 768px max | Centered in preview pane |
| Mobile | 375px max | Centered, subtle phone-frame border |

- Active device highlighted with `accent_color`
- Preview container transitions width smoothly (CSS transition, ~200ms)
- Pure frontend — no API changes

### 3.2 Per-Block Styling

Lightweight style overrides stored in an optional `style_overrides` object within the block's existing `content` JSONB column. No schema migration needed.

**Available overrides:**

| Property | Type | Default |
|----------|------|---------|
| `bg_color` | hex string | transparent (inherits theme) |
| `border_radius` | sharp \| rounded \| pill \| soft \| chunky \| organic | inherits page setting |
| `border` | CSS border string (e.g., "1px solid #ccc") | none |
| `padding` | sm \| md \| lg (8px / 16px / 24px) | md |
| `shadow` | none \| sm \| md \| lg | none |

**Editor UX:**
- Clicking a block shows a "Style" tab (paintbrush icon) alongside the content tab
- Color pickers: same hex input + swatch component used elsewhere in the app
- Border radius: visual selector showing the shape
- Shadow/padding: visual preview squares showing sm/md/lg scale
- "Reset to theme defaults" link at the bottom
- Preview updates live as user adjusts

**JSONB example:**
```json
{
  "level": "h1",
  "text": "Welcome",
  "alignment": "center",
  "style_overrides": {
    "bg_color": "#1a1a2e",
    "padding": "lg",
    "shadow": "md"
  }
}
```

---

## 4. Aesthetic Standards

### 4.1 General Design Language

- **Tailwind utility classes** — no inline styles in components (except dynamic user-set overrides)
- **Consistent spacing** — follow the existing compact/normal/spacious system (8px/16px/24px base units)
- **Color inheritance** — new blocks respect the page's `custom_accent_color`, `custom_text_color`, and `custom_bg_color` unless overridden via per-block styling
- **Theme compatibility** — every new block must render correctly across all 12 existing themes (minimal through brutalist). No block should break a theme.
- **Dark/light awareness** — blocks with backgrounds (gallery, contact form, payment link) must have sufficient contrast in both light and dark themes. Use the theme's text/bg colors, not hardcoded values.

### 4.2 Contact Form Aesthetics

- Input fields: subtle border, rounded corners matching page `border_radius`, focus ring using `accent_color`
- Submit button: follows the page's `button_style` (filled/outline/shadow) and `accent_color`
- Success state: smooth fade transition, checkmark icon, message in `accent_color`
- Error state: red border on invalid fields, inline error text below field — no alert popups

### 4.3 Image Gallery Aesthetics

- Grid mode: consistent 8px gap, images maintain aspect ratio via `object-cover`, rounded corners matching page theme
- Carousel mode: subtle left/right arrow overlays, dot indicators below, smooth CSS scroll-snap
- Lightbox: dark overlay (90% opacity), centered image with close button, swipe support on mobile, fade-in animation

### 4.4 Countdown Timer Aesthetics

- Large style: individual boxes with subtle background differentiation, monospace numbers (`font-variant-numeric: tabular-nums`), label text below each box
- Compact style: single line with consistent digit widths (tabular-nums) to prevent layout shift
- Expired state: smooth crossfade from timer to expired message

### 4.5 Payment Link Aesthetics

- Platform-specific brand colors and icons (PayPal blue, Venmo blue, Cash App green, Ko-fi yellow, etc.)
- Card/button hybrid: icon left, text center, subtle arrow right
- Hover: translateY(-2px) + shadow increase, matching existing link block hover behavior
- Suggested amounts: pill-shaped badges below the main button, non-interactive

### 4.6 Template Visual Quality

- Realistic placeholder text (not "Lorem ipsum") — e.g., "Welcome to my page" not "Heading goes here"
- Pre-set grid positions that create visual balance (no awkward gaps or single-column stacking)
- Each template should feel distinct — different rhythm, density, and emphasis
- Template preview cards: miniature screenshot-style rendering at ~200px wide

### 4.7 Responsive Behavior

All new blocks work within the existing 4-column grid system:

| Span | Contact Form | Gallery | Countdown | Payment Link |
|------|-------------|---------|-----------|-------------|
| 1 col | Fields stack vertically | 1 column | Compact style auto | Full width button |
| 2 col | Side-by-side name/email | 2 columns | Large style fits | Full width button |
| 3-4 col | Full layout | Full layout | Full layout | Full layout |

**Mobile (public page):** Grid collapses to single column. All blocks stack gracefully. Gallery carousel is swipe-native. Countdown boxes wrap if needed.

---

## 5. Data Model Changes

### 5.1 New Table: `bio_form_submissions`

```sql
CREATE TABLE bio_form_submissions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  page_id       UUID NOT NULL REFERENCES bio_link_pages(id) ON DELETE CASCADE,
  block_id      UUID NOT NULL REFERENCES bio_blocks(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  email         TEXT NOT NULL,
  message       TEXT NOT NULL,
  phone         TEXT,
  subject       TEXT,
  ip_hash       TEXT NOT NULL,
  is_read       BOOLEAN NOT NULL DEFAULT false,
  submitted_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_form_submissions_page_time ON bio_form_submissions(page_id, submitted_at DESC);
CREATE INDEX idx_form_submissions_block ON bio_form_submissions(block_id);
```

**RLS policies:**
- Owner can SELECT submissions where `page_id` belongs to them
- Owner can UPDATE `is_read` on their own submissions
- Owner can DELETE their own submissions
- Public can INSERT (rate limited at API level)
- No public SELECT

### 5.2 Enum Addition

Add to `block_type` enum:
```sql
ALTER TYPE block_type ADD VALUE 'contact_form';
ALTER TYPE block_type ADD VALUE 'gallery';
ALTER TYPE block_type ADD VALUE 'countdown';
ALTER TYPE block_type ADD VALUE 'payment_link';
```

### 5.3 No Other Schema Changes

- `style_overrides` lives inside the existing `content` JSONB column on `bio_blocks` — no migration needed
- Gallery images use the existing `bio-covers` storage bucket under `gallery/{page_id}/{image_id}`
- Templates are static TypeScript — no database storage

---

## 6. API Routes

### 6.1 New Routes

| Route | Method | Auth | Rate Limit | Purpose |
|-------|--------|------|-----------|---------|
| `/api/bio/[id]/form` | POST | Public | 5/hr per IP per page | Submit contact form |
| `/api/bio/[id]/submissions` | GET | Owner | 60/min | List form submissions (paginated) |
| `/api/bio/[id]/submissions/[subId]` | PATCH | Owner | 60/min | Mark read/unread |
| `/api/bio/[id]/submissions/[subId]` | DELETE | Owner | 60/min | Delete submission |
| `/api/bio/[id]/gallery` | POST | Owner | 30/min | Upload gallery images (multi-file) |

### 6.2 Form Submission Flow

1. Public user fills out form on `/p/[slug]`
2. Client POSTs to `/api/bio/[id]/form` with field values
3. Server validates fields against the block's configured `fields` array
4. Rate limit check (5/hr per IP per page via ip_hash)
5. Insert into `bio_form_submissions`
6. If `notify_email` is true, send notification email to owner's `contact_email`
7. Return 201 with success

### 6.3 Gallery Upload Flow

1. Owner selects images in editor
2. Client POSTs multipart form data to `/api/bio/[id]/gallery`
3. Server validates: max 12 images, 2MB each, JPEG/PNG/WebP
4. Upload each to `bio-covers` bucket at `gallery/{page_id}/{uuid}.{ext}`
5. Return array of storage paths
6. Client updates block content JSONB with new image entries via existing block PATCH

---

## 7. Scope & Non-Goals

### In Scope
- 4 new block types (contact form, gallery, countdown, payment link)
- 4 starter templates (creator, business, event, portfolio)
- Preview modes (desktop/tablet/mobile)
- Per-block styling (bg, border radius, border, padding, shadow)
- Form submissions inbox in editor
- Email notification for form submissions

### Explicitly Out of Scope
- Payment processing (blocks link out, we don't handle money)
- Full email delivery system (simple transactional email only — Supabase or Resend)
- Template marketplace or user-created templates
- Collaboration / team features
- Mobile app
- Custom domains
- New QR content types
- A/B testing for bio pages
- SEO meta tag customization

---

## 8. Build Order

Suggested implementation sequence based on dependencies and complexity:

| Phase | Feature | Complexity | Dependencies |
|-------|---------|-----------|-------------|
| 1 | Countdown timer block | Low | None |
| 2 | Payment link block | Low | Platform icon assets |
| 3 | Per-block styling | Low | None (JSONB only) |
| 4 | Preview modes | Low | None (frontend only) |
| 5 | Image gallery block | Medium | Gallery upload route |
| 6 | Contact form block | Medium | New table, API routes, email |
| 7 | Starter templates | Medium | All blocks must exist first |

Templates come last because they reference all new block types.
