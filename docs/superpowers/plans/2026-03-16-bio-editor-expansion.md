# Bio Editor Expansion Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Expand the bio page editor with 4 new block types (countdown, payment link, gallery, contact form), per-block styling, preview modes, and starter templates.

**Architecture:** Each new block follows the existing pattern: TypeScript interface + Zod schema + editor form component + editor preview renderer + public page renderer + registration in all dispatchers. Database changes are a single migration. Templates are static TypeScript definitions applied at creation time.

**Tech Stack:** Next.js 16 (App Router), React 19, TypeScript, Supabase (PostgreSQL + Storage), Tailwind CSS, Zod, Vitest

**Spec:** `docs/superpowers/specs/2026-03-16-bio-editor-expansion-design.md`

---

## File Structure

### New Files
| File | Responsibility |
|------|---------------|
| `supabase/migrations/00014_bio_editor_expansion.sql` | Migration: enum additions, `bio_form_submissions` table, `bio-gallery` bucket, RLS policies |
| ~~`src/types/bio-expansion.ts`~~ | *(Removed — types added directly to `src/types/bio.ts` to match existing patterns)* |
| `src/components/bio/grid/forms/countdown-form.tsx` | Editor form for countdown timer block |
| `src/components/bio/grid/forms/payment-link-form.tsx` | Editor form for payment link block |
| `src/components/bio/grid/forms/gallery-form.tsx` | Editor form for image gallery block |
| `src/components/bio/grid/forms/contact-form-form.tsx` | Editor form for contact form block |
| `src/components/bio/public/block-renderers/countdown-block.tsx` | Public renderer for countdown timer |
| `src/components/bio/public/block-renderers/payment-link-block.tsx` | Public renderer for payment link |
| `src/components/bio/public/block-renderers/gallery-block.tsx` | Public renderer for gallery (grid/carousel/lightbox) |
| `src/components/bio/public/block-renderers/contact-form-block.tsx` | Public renderer for contact form |
| `src/app/api/bio/[id]/form/route.ts` | POST: public form submission endpoint |
| `src/app/api/bio/[id]/submissions/route.ts` | GET: list form submissions for owner |
| `src/app/api/bio/[id]/submissions/[subId]/route.ts` | PATCH/DELETE: manage individual submissions |
| `src/app/api/bio/[id]/gallery/route.ts` | POST: upload gallery images |
| `src/lib/bio/templates.ts` | Starter template definitions (creator, business, event, portfolio) |
| `src/components/bio/template-picker.tsx` | Template picker modal component |
| `src/components/bio/preview-mode-toggle.tsx` | Desktop/tablet/mobile preview toggle |
| `src/__tests__/validations/bio-expansion.test.ts` | Tests for new Zod schemas |
| `src/__tests__/lib/bio/templates.test.ts` | Tests for template definitions |

### Modified Files
| File | Changes |
|------|---------|
| `src/types/bio.ts:10-20,95-106` | Add 4 new block types to union + content types |
| `src/validations/bio.ts:188-265` | Add 4 new content schemas + style overrides schema + extend blockTypes array + extend blockContentSchemas map |
| `src/lib/constants.ts:36-44,73-83` | Add `BIO_FORM_SUBMIT` rate limit + `MAX_GALLERY_IMAGES` constant |
| `src/lib/security/rate-limiter.ts:101-109,197-215` | Add `bioFormSubmit` limiter (3600s window) + sync/async check functions |
| `src/components/bio/grid/bio-block-toolbar.tsx:23-38` | Add 4 new entries to BLOCK_TYPES array |
| `src/components/bio/grid/bio-block-edit-panel.tsx:1-168` | Import new forms + add cases to BlockFormSwitch + add entries to BLOCK_TYPE_LABELS |
| `src/components/bio/grid/bio-block-renderers.tsx:1-522` | Import new types + add 4 renderer functions + add 4 cases to BlockRenderer switch |
| `src/components/bio/public/bio-public-block.tsx:1-127` | Import new renderers + add 4 cases to BioPublicBlock switch |

---

## Chunk 1: Database Migration & Foundation Types

### Task 1: Database Migration

**Files:**
- Create: `supabase/migrations/00014_bio_editor_expansion.sql`

- [ ] **Step 1: Write the migration file**

```sql
-- Migration: Bio Editor Expansion
-- Adds new block types, form submissions table, and gallery storage bucket.

-- =============================================================================
-- ENUM ADDITIONS
-- =============================================================================

ALTER TYPE bio_block_type ADD VALUE IF NOT EXISTS 'contact_form';
ALTER TYPE bio_block_type ADD VALUE IF NOT EXISTS 'gallery';
ALTER TYPE bio_block_type ADD VALUE IF NOT EXISTS 'countdown';
ALTER TYPE bio_block_type ADD VALUE IF NOT EXISTS 'payment_link';

-- =============================================================================
-- NEW TABLE: bio_form_submissions
-- =============================================================================

CREATE TABLE IF NOT EXISTS bio_form_submissions (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
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

-- Note: No updated_at column. Append-only except for is_read toggling.

CREATE INDEX idx_bio_form_submissions_page_time
  ON bio_form_submissions(page_id, submitted_at DESC);
CREATE INDEX idx_bio_form_submissions_block
  ON bio_form_submissions(block_id);

-- =============================================================================
-- RLS POLICIES: bio_form_submissions
-- =============================================================================

ALTER TABLE bio_form_submissions ENABLE ROW LEVEL SECURITY;

-- Owner can read submissions for their own pages
CREATE POLICY bio_form_submissions_select_own
  ON bio_form_submissions
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM bio_link_pages
      WHERE bio_link_pages.id = bio_form_submissions.page_id
      AND bio_link_pages.owner_id = auth.uid()
    )
  );

-- Owner can update is_read on their own submissions
CREATE POLICY bio_form_submissions_update_own
  ON bio_form_submissions
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM bio_link_pages
      WHERE bio_link_pages.id = bio_form_submissions.page_id
      AND bio_link_pages.owner_id = auth.uid()
    )
  );

-- Owner can delete their own submissions
CREATE POLICY bio_form_submissions_delete_own
  ON bio_form_submissions
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM bio_link_pages
      WHERE bio_link_pages.id = bio_form_submissions.page_id
      AND bio_link_pages.owner_id = auth.uid()
    )
  );

-- Public inserts handled via service-role client in API route (no anon policy needed)

-- =============================================================================
-- STORAGE BUCKET: bio-gallery
-- =============================================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'bio-gallery',
  'bio-gallery',
  true,  -- Public bucket (images displayed on public bio pages)
  2097152,  -- 2MB limit
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Public read access
CREATE POLICY bio_gallery_select_public
  ON storage.objects
  FOR SELECT
  USING (bucket_id = 'bio-gallery');

-- Owner can upload to their own folder
CREATE POLICY bio_gallery_insert_own
  ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'bio-gallery'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- Owner can update their own files
CREATE POLICY bio_gallery_update_own
  ON storage.objects
  FOR UPDATE
  USING (
    bucket_id = 'bio-gallery'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- Owner can delete their own files
CREATE POLICY bio_gallery_delete_own
  ON storage.objects
  FOR DELETE
  USING (
    bucket_id = 'bio-gallery'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );
```

- [ ] **Step 2: Commit migration**

```bash
git add supabase/migrations/00014_bio_editor_expansion.sql
git commit -m "feat: add migration for bio editor expansion (new block types, form submissions, gallery bucket)"
```

### Task 2: TypeScript Types

**Files:**
- Modify: `src/types/bio.ts:10-20,95-106`

- [ ] **Step 1: Write failing test for new types**

Create `src/__tests__/validations/bio-expansion.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { blockContentSchemas } from '@/validations/bio';

describe('New block content schemas', () => {
  describe('countdown', () => {
    it('validates a valid countdown block', () => {
      const result = blockContentSchemas.countdown.safeParse({
        target_datetime: '2026-04-01T18:00:00Z',
        label: 'Launch in',
        expired_message: "We're live!",
        style: 'large',
      });
      expect(result.success).toBe(true);
    });

    it('rejects missing target_datetime', () => {
      const result = blockContentSchemas.countdown.safeParse({
        label: 'Launch in',
      });
      expect(result.success).toBe(false);
    });

    it('rejects invalid style', () => {
      const result = blockContentSchemas.countdown.safeParse({
        target_datetime: '2026-04-01T18:00:00Z',
        style: 'invalid',
      });
      expect(result.success).toBe(false);
    });
  });

  describe('payment_link', () => {
    it('validates a valid payment link block', () => {
      const result = blockContentSchemas.payment_link.safeParse({
        platform: 'buymeacoffee',
        url: 'https://buymeacoffee.com/user',
        display_text: 'Buy me a coffee',
        suggested_amounts: ['$5', '$10'],
      });
      expect(result.success).toBe(true);
    });

    it('rejects invalid platform', () => {
      const result = blockContentSchemas.payment_link.safeParse({
        platform: 'invalid_platform',
        url: 'https://example.com',
      });
      expect(result.success).toBe(false);
    });

    it('rejects too many suggested amounts', () => {
      const result = blockContentSchemas.payment_link.safeParse({
        platform: 'paypal',
        url: 'https://paypal.me/user',
        suggested_amounts: ['$1', '$2', '$3', '$4', '$5', '$6'],
      });
      expect(result.success).toBe(false);
    });

    it('rejects suggested amount that is too long', () => {
      const result = blockContentSchemas.payment_link.safeParse({
        platform: 'paypal',
        url: 'https://paypal.me/user',
        suggested_amounts: ['a'.repeat(21)],
      });
      expect(result.success).toBe(false);
    });
  });

  describe('gallery', () => {
    it('validates a valid gallery block', () => {
      const result = blockContentSchemas.gallery.safeParse({
        display_mode: 'grid',
        columns: 2,
        images: [
          { storage_path: 'user/page/img1.jpg', caption: 'My work', link_url: null },
        ],
      });
      expect(result.success).toBe(true);
    });

    it('rejects more than 12 images', () => {
      const images = Array.from({ length: 13 }, (_, i) => ({
        storage_path: `path/img${i}.jpg`,
      }));
      const result = blockContentSchemas.gallery.safeParse({
        display_mode: 'grid',
        images,
      });
      expect(result.success).toBe(false);
    });

    it('rejects invalid display_mode', () => {
      const result = blockContentSchemas.gallery.safeParse({
        display_mode: 'slideshow',
        images: [],
      });
      expect(result.success).toBe(false);
    });
  });

  describe('contact_form', () => {
    it('validates a valid contact form block', () => {
      const result = blockContentSchemas.contact_form.safeParse({
        form_title: 'Get in touch',
        fields: ['name', 'email', 'message'],
        success_message: 'Thanks!',
        notify_email: true,
      });
      expect(result.success).toBe(true);
    });

    it('rejects invalid field names', () => {
      const result = blockContentSchemas.contact_form.safeParse({
        fields: ['name', 'email', 'message', 'invalid_field'],
      });
      expect(result.success).toBe(false);
    });
  });

  describe('style_overrides', () => {
    it('accepts content with style_overrides', () => {
      const result = blockContentSchemas.heading.safeParse({
        text: 'Welcome',
        level: 1,
        style_overrides: {
          bg_color: '#1a1a2e',
          padding: 'lg',
          shadow: 'md',
        },
      });
      expect(result.success).toBe(true);
    });

    it('accepts content without style_overrides', () => {
      const result = blockContentSchemas.heading.safeParse({
        text: 'Welcome',
        level: 1,
      });
      expect(result.success).toBe(true);
    });

    it('rejects invalid padding value in style_overrides', () => {
      const result = blockContentSchemas.heading.safeParse({
        text: 'Welcome',
        level: 1,
        style_overrides: {
          padding: 'xl',
        },
      });
      expect(result.success).toBe(false);
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/__tests__/validations/bio-expansion.test.ts`
Expected: FAIL — schemas don't exist yet

- [ ] **Step 3: Add new content interfaces to types**

In `src/types/bio.ts`, after `BioBlockContentMap` (line 93), add:

```typescript
export interface BioBlockContentCountdown {
  target_datetime: string;
  label?: string;
  expired_message?: string;
  style?: 'compact' | 'large';
}

export interface BioBlockContentPaymentLink {
  platform: 'paypal' | 'venmo' | 'cashapp' | 'stripe' | 'buymeacoffee' | 'ko-fi' | 'custom';
  url: string;
  display_text?: string;
  suggested_amounts?: string[];
}

export interface BioBlockContentGallery {
  display_mode: 'grid' | 'carousel';
  columns?: 2 | 3;
  images: Array<{
    storage_path: string;
    caption?: string | null;
    link_url?: string | null;
  }>;
}

export interface BioBlockContentContactForm {
  form_title?: string;
  fields: Array<'name' | 'email' | 'message' | 'phone' | 'subject'>;
  success_message?: string;
  notify_email?: boolean;
}

/** Per-block style overrides — stored in content JSONB */
export interface BioStyleOverrides {
  bg_color?: string;
  border_radius?: 'sharp' | 'rounded' | 'pill' | 'soft' | 'chunky' | 'organic';
  border?: string;
  padding?: 'sm' | 'md' | 'lg';
  shadow?: 'none' | 'sm' | 'md' | 'lg';
}
```

- [ ] **Step 4: Update BioBlockType union** (line 10-20)

Add `| 'contact_form' | 'gallery' | 'countdown' | 'payment_link'` to the union.

- [ ] **Step 5: Update BioBlockContent union** (line 95-106)

Add `| BioBlockContentCountdown | BioBlockContentPaymentLink | BioBlockContentGallery | BioBlockContentContactForm` to the union.

- [ ] **Step 6: Add form submission type**

After `BioBlockClickEvent` (line 134), add:

```typescript
/** Bio form submission database record */
export interface BioFormSubmission {
  id: string;
  page_id: string;
  block_id: string;
  name: string;
  email: string;
  message: string;
  phone: string | null;
  subject: string | null;
  ip_hash: string;
  is_read: boolean;
  submitted_at: string;
}
```

- [ ] **Step 7: Add Zod schemas to validations**

In `src/validations/bio.ts`, after `mapContentSchema` (line 251), add:

```typescript
// ─── Style Overrides (shared across all block types) ─────────────

const styleOverridesSchema = z.object({
  bg_color: hexColor.optional(),
  border_radius: z.enum(borderRadiusOptions).optional(),
  border: z.string().max(100).optional(),
  padding: z.enum(['sm', 'md', 'lg']).optional(),
  shadow: z.enum(['none', 'sm', 'md', 'lg']).optional(),
}).optional();

// ─── New Block Content Schemas ───────────────────────────────────

const countdownContentSchema = z.object({
  target_datetime: z.string().min(1, 'Target date is required'),
  label: z.string().max(100).optional(),
  expired_message: z.string().max(200).optional(),
  style: z.enum(['compact', 'large']).optional(),
  style_overrides: styleOverridesSchema,
});

const paymentLinkPlatforms = ['paypal', 'venmo', 'cashapp', 'stripe', 'buymeacoffee', 'ko-fi', 'custom'] as const;

const paymentLinkContentSchema = z.object({
  platform: z.enum(paymentLinkPlatforms),
  url: z.string().min(1).max(2048),
  display_text: z.string().max(100).optional(),
  suggested_amounts: z.array(z.string().max(20)).max(5).optional(),
  style_overrides: styleOverridesSchema,
});

const galleryImageSchema = z.object({
  storage_path: z.string().min(1).max(2048),
  caption: z.string().max(200).nullable().optional(),
  link_url: z.string().max(2048).nullable().optional(),
});

const galleryContentSchema = z.object({
  display_mode: z.enum(['grid', 'carousel']),
  columns: z.union([z.literal(2), z.literal(3)]).optional(),
  images: z.array(galleryImageSchema).max(12),
  style_overrides: styleOverridesSchema,
});

const contactFormFields = ['name', 'email', 'message', 'phone', 'subject'] as const;

const contactFormContentSchema = z.object({
  form_title: z.string().max(100).optional(),
  fields: z.array(z.enum(contactFormFields)).min(1),
  success_message: z.string().max(300).optional(),
  notify_email: z.boolean().optional(),
  style_overrides: styleOverridesSchema,
});
```

- [ ] **Step 8: Add style_overrides to ALL existing content schemas**

Append `.extend({ style_overrides: styleOverridesSchema })` to each existing content schema. For example, change:

```typescript
const headingContentSchema = z.object({
  text: z.string().max(200),
  level: z.union([z.literal(1), z.literal(2), z.literal(3)]),
});
```

to:

```typescript
const headingContentSchema = z.object({
  text: z.string().max(200),
  level: z.union([z.literal(1), z.literal(2), z.literal(3)]),
  style_overrides: styleOverridesSchema,
});
```

Do this for all 10 existing schemas: `linkContentSchema`, `headingContentSchema`, `textContentSchema`, `imageContentSchema`, `socialIconsContentSchema`, `dividerContentSchema`, `spacerContentSchema`, `spotifyEmbedContentSchema`, `youtubeEmbedContentSchema`, `mapContentSchema`.

- [ ] **Step 9: Update blockTypes array** (line 189-192)

```typescript
const blockTypes = [
  'link', 'heading', 'text', 'image', 'social_icons',
  'divider', 'spacer', 'spotify_embed', 'youtube_embed', 'map',
  'contact_form', 'gallery', 'countdown', 'payment_link',
] as const;
```

- [ ] **Step 10: Update blockContentSchemas map** (line 254-265)

Add the four new entries:

```typescript
  contact_form: contactFormContentSchema,
  gallery: galleryContentSchema,
  countdown: countdownContentSchema,
  payment_link: paymentLinkContentSchema,
```

- [ ] **Step 11: Run tests to verify they pass**

Run: `npx vitest run src/__tests__/validations/bio-expansion.test.ts`
Expected: ALL PASS

- [ ] **Step 12: Commit**

```bash
git add src/types/bio.ts src/validations/bio.ts src/__tests__/validations/bio-expansion.test.ts
git commit -m "feat: add TypeScript types and Zod schemas for 4 new block types + style overrides"
```

### Task 2b: Stub Registration (Prevent Build Breakage)

Adding 4 new types to `BioBlockType` makes `Record<BioBlockType, string>` in `bio-block-edit-panel.tsx` incomplete. Register all 4 stubs now to keep the build green throughout the plan.

**Files:**
- Modify: `src/components/bio/grid/bio-block-edit-panel.tsx:36-47`
- Modify: `src/components/bio/grid/bio-block-toolbar.tsx:23-38`
- Modify: `src/components/bio/grid/bio-block-renderers.tsx:46-125`
- Modify: `src/components/bio/public/bio-public-block.tsx:43-126`

- [ ] **Step 1: Add stub labels to edit panel**

In `src/components/bio/grid/bio-block-edit-panel.tsx`, add to `BLOCK_TYPE_LABELS`:

```typescript
  countdown: 'Countdown Timer',
  payment_link: 'Payment Link',
  gallery: 'Image Gallery',
  contact_form: 'Contact Form',
```

Add stub cases to `BlockFormSwitch`:

```typescript
    case 'countdown':
    case 'payment_link':
    case 'gallery':
    case 'contact_form':
      return <p className="text-xs text-muted-foreground">Editor coming soon for this block type.</p>;
```

- [ ] **Step 2: Add stub entries to toolbar**

In `src/components/bio/grid/bio-block-toolbar.tsx`, add lucide imports `Timer, DollarSign, Images, FileText` and entries:

```typescript
  { type: 'countdown', icon: Timer, label: 'Timer' },
  { type: 'payment_link', icon: DollarSign, label: 'Payment' },
  { type: 'gallery', icon: Images, label: 'Gallery' },
  { type: 'contact_form', icon: FileText, label: 'Form' },
```

- [ ] **Step 3: Add stub cases to editor preview renderer**

In `src/components/bio/grid/bio-block-renderers.tsx`, add a generic fallback for the 4 new types in the switch (they'll be replaced with real renderers later):

```typescript
    case 'countdown':
    case 'payment_link':
    case 'gallery':
    case 'contact_form':
      return (
        <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
          {block.block_type.replace('_', ' ')}
        </div>
      );
```

- [ ] **Step 4: Add stub cases to public block dispatcher**

In `src/components/bio/public/bio-public-block.tsx`, add before `default`:

```typescript
    case 'countdown':
    case 'payment_link':
    case 'gallery':
    case 'contact_form':
      return null; // Replaced with real renderers in later tasks
```

- [ ] **Step 5: Add `style_overrides` to existing TypeScript interfaces**

In `src/types/bio.ts`, add `style_overrides?: BioStyleOverrides;` to every existing content interface: `BioBlockContentLink`, `BioBlockContentHeading`, `BioBlockContentText`, `BioBlockContentImage`, `BioBlockContentSocialIcons`, `BioBlockContentDivider`, `BioBlockContentSpacer`, `BioBlockContentSpotifyEmbed`, `BioBlockContentYouTubeEmbed`, `BioBlockContentMap`, and all 4 new interfaces.

- [ ] **Step 6: Verify build passes**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 7: Commit**

```bash
git add src/components/bio/grid/bio-block-edit-panel.tsx src/components/bio/grid/bio-block-toolbar.tsx src/components/bio/grid/bio-block-renderers.tsx src/components/bio/public/bio-public-block.tsx src/types/bio.ts
git commit -m "feat: register 4 new block types with stubs to keep build green"
```

### Task 3: Rate Limiter for Form Submissions

**Files:**
- Modify: `src/lib/constants.ts:36-44`
- Modify: `src/lib/security/rate-limiter.ts:101-109,197-215`

- [ ] **Step 1: Add constant**

In `src/lib/constants.ts`, add to `RATE_LIMITS` (after `BIO_TRACK: 1000`):

```typescript
  BIO_FORM_SUBMIT: 5,  // 5 per hour per IP per page
```

Add to `BIO_DEFAULTS`:

```typescript
  MAX_GALLERY_IMAGES: 12,
```

- [ ] **Step 2: Add rate limiter**

In `src/lib/security/rate-limiter.ts`:

Add to `upstashLimiters` (line 101-109):

```typescript
  bioFormSubmit: createUpstashLimiter(RATE_LIMITS.BIO_FORM_SUBMIT, 3_600_000), // 1 hour window
```

Add sync function (after `checkBioTrackLimit`):

```typescript
/** Rate limit for bio form submissions (5/hr) — sync/in-memory */
export function checkBioFormSubmitLimit(identifier: string): RateLimitResult {
  return checkMemoryRateLimit(`bio-form:${identifier}`, RATE_LIMITS.BIO_FORM_SUBMIT, 3_600_000);
}
```

Add async function:

```typescript
/** Async rate limit for bio form submissions — uses Upstash Redis in production */
export function checkBioFormSubmitLimitAsync(identifier: string) {
  return checkLimit('bioFormSubmit', identifier, RATE_LIMITS.BIO_FORM_SUBMIT);
}
```

- [ ] **Step 3: Commit**

```bash
git add src/lib/constants.ts src/lib/security/rate-limiter.ts
git commit -m "feat: add BIO_FORM_SUBMIT rate limit (5/hr, 3600s window)"
```

---

## Chunk 2: Countdown Timer Block (Phase 1)

### Task 4: Countdown Editor Form

**Files:**
- Create: `src/components/bio/grid/forms/countdown-form.tsx`

- [ ] **Step 1: Create the editor form**

```typescript
'use client';

import type { BioBlockContentCountdown } from '@/types/bio';

interface CountdownFormProps {
  content: BioBlockContentCountdown;
  onChange: (content: BioBlockContentCountdown) => void;
}

export function CountdownForm({ content, onChange }: CountdownFormProps) {
  // Convert ISO string to local datetime-local input value
  const localDatetime = content.target_datetime
    ? new Date(content.target_datetime).toISOString().slice(0, 16)
    : '';

  return (
    <div className="space-y-3">
      <div>
        <label className="mb-1 block text-xs font-medium text-muted-foreground">
          Target date & time
        </label>
        <input
          type="datetime-local"
          value={localDatetime}
          onChange={(e) =>
            onChange({
              ...content,
              target_datetime: e.target.value
                ? new Date(e.target.value).toISOString()
                : '',
            })
          }
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
        />
      </div>

      <div>
        <label className="mb-1 block text-xs font-medium text-muted-foreground">
          Label
        </label>
        <input
          type="text"
          value={content.label ?? ''}
          onChange={(e) => onChange({ ...content, label: e.target.value })}
          placeholder="Countdown"
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
        />
      </div>

      <div>
        <label className="mb-1 block text-xs font-medium text-muted-foreground">
          Expired message
        </label>
        <input
          type="text"
          value={content.expired_message ?? ''}
          onChange={(e) =>
            onChange({ ...content, expired_message: e.target.value })
          }
          placeholder="We're live!"
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
        />
      </div>

      <div>
        <label className="mb-1 block text-xs font-medium text-muted-foreground">
          Style
        </label>
        <select
          value={content.style ?? 'large'}
          onChange={(e) =>
            onChange({
              ...content,
              style: e.target.value as 'compact' | 'large',
            })
          }
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
        >
          <option value="large">Large (boxes)</option>
          <option value="compact">Compact (single line)</option>
        </select>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/bio/grid/forms/countdown-form.tsx
git commit -m "feat: add countdown timer editor form"
```

### Task 5: Countdown Editor Preview

**Files:**
- Modify: `src/components/bio/grid/bio-block-renderers.tsx`

- [ ] **Step 1: Add import and type**

At top of file, add to lucide imports: `Timer`
Add to type imports: `BioBlockContentCountdown`

- [ ] **Step 2: Add renderer function**

After `MapBlockRenderer` (line ~522), add:

```typescript
// ─── Countdown ───────────────────────────────────────────────────

function CountdownBlockRenderer({
  content,
  compact,
}: {
  content: BioBlockContentCountdown;
  compact?: boolean;
}) {
  if (!content.target_datetime) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center gap-1.5 rounded-sm border border-dashed border-border">
        <Timer className={`text-muted-foreground ${compact ? 'h-4 w-4' : 'h-6 w-6'}`} />
        <span className="text-[10px] text-muted-foreground">Set target date</span>
      </div>
    );
  }

  return (
    <div className="flex h-full w-full items-center justify-center gap-2.5 rounded-sm bg-secondary px-3">
      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-foreground/5">
        <Timer className={compact ? 'h-3 w-3' : 'h-3.5 w-3.5'} />
      </div>
      <div className="min-w-0 flex-1">
        <span className={`block truncate font-medium text-foreground ${compact ? 'text-xs' : 'text-sm'}`}>
          {content.label || 'Countdown'}
        </span>
        <span className="block truncate text-[10px] text-muted-foreground">
          {content.style ?? 'large'}
        </span>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Add case to BlockRenderer switch** (line ~46)

```typescript
    case 'countdown':
      return (
        <CountdownBlockRenderer
          content={block.content as BioBlockContentCountdown}
          compact={compact}
        />
      );
```

- [ ] **Step 4: Commit**

```bash
git add src/components/bio/grid/bio-block-renderers.tsx
git commit -m "feat: add countdown timer editor preview renderer"
```

### Task 6: Countdown Public Renderer

**Files:**
- Create: `src/components/bio/public/block-renderers/countdown-block.tsx`

- [ ] **Step 1: Create the public renderer**

```typescript
'use client';

import { useState, useEffect } from 'react';
import type { BioBlockContentCountdown, BioThemeConfig } from '@/types/bio';

interface PublicCountdownBlockProps {
  content: BioBlockContentCountdown;
  themeConfig: BioThemeConfig;
  colSpan: number;
}

function getTimeRemaining(target: string) {
  const diff = new Date(target).getTime() - Date.now();
  if (diff <= 0) return null;
  return {
    days: Math.floor(diff / (1000 * 60 * 60 * 24)),
    hours: Math.floor((diff / (1000 * 60 * 60)) % 24),
    minutes: Math.floor((diff / (1000 * 60)) % 60),
    seconds: Math.floor((diff / 1000) % 60),
  };
}

export function PublicCountdownBlock({
  content,
  themeConfig,
  colSpan,
}: PublicCountdownBlockProps) {
  const [remaining, setRemaining] = useState(() =>
    getTimeRemaining(content.target_datetime),
  );

  useEffect(() => {
    const interval = setInterval(() => {
      setRemaining(getTimeRemaining(content.target_datetime));
    }, 1000);
    return () => clearInterval(interval);
  }, [content.target_datetime]);

  // Use compact style for 1-column span or when explicitly set
  const useCompact = colSpan <= 1 || content.style === 'compact';

  if (!remaining) {
    return (
      <div className="flex items-center justify-center py-4 text-center transition-opacity duration-500">
        <p
          className="text-lg font-semibold"
          style={{ color: themeConfig.colors.accent }}
        >
          {content.expired_message || "We're live!"}
        </p>
      </div>
    );
  }

  if (useCompact) {
    return (
      <div className="flex flex-col items-center justify-center py-2">
        {content.label && (
          <p
            className="mb-1 text-xs"
            style={{ color: themeConfig.colors.textSecondary }}
          >
            {content.label}
          </p>
        )}
        <p
          className="text-sm font-mono"
          style={{
            color: themeConfig.colors.text,
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          {remaining.days}d {remaining.hours}h {remaining.minutes}m{' '}
          {remaining.seconds}s
        </p>
      </div>
    );
  }

  const units = [
    { value: remaining.days, label: 'Days' },
    { value: remaining.hours, label: 'Hours' },
    { value: remaining.minutes, label: 'Min' },
    { value: remaining.seconds, label: 'Sec' },
  ];

  return (
    <div className="flex flex-col items-center justify-center py-4">
      {content.label && (
        <p
          className="mb-3 text-sm"
          style={{ color: themeConfig.colors.textSecondary }}
        >
          {content.label}
        </p>
      )}
      <div className="flex gap-2">
        {units.map(({ value, label }) => (
          <div
            key={label}
            className="flex flex-col items-center rounded-md px-3 py-2"
            style={{
              backgroundColor: themeConfig.colors.accent + '15',
              borderRadius: themeConfig.borderRadius,
            }}
          >
            <span
              className="text-2xl font-bold"
              style={{
                color: themeConfig.colors.text,
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              {String(value).padStart(2, '0')}
            </span>
            <span
              className="text-[10px] uppercase tracking-wider"
              style={{ color: themeConfig.colors.textSecondary }}
            >
              {label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Register in bio-public-block.tsx**

In `src/components/bio/public/bio-public-block.tsx`:

Add import:
```typescript
import { PublicCountdownBlock } from './block-renderers/countdown-block';
import type { BioBlockContentCountdown } from '@/types/bio';
```

Add case in the switch (before `default`):
```typescript
    case 'countdown':
      return (
        <PublicCountdownBlock
          content={block.content as BioBlockContentCountdown}
          themeConfig={themeConfig}
          colSpan={block.grid_col_span}
        />
      );
```

- [ ] **Step 3: Register in toolbar and edit panel**

In `src/components/bio/grid/bio-block-toolbar.tsx`:
- Add `Timer` to lucide imports
- Add to BLOCK_TYPES array: `{ type: 'countdown', icon: Timer, label: 'Timer' }`

In `src/components/bio/grid/bio-block-edit-panel.tsx`:
- Add import: `import { CountdownForm } from './forms/countdown-form';`
- Add type import: `BioBlockContentCountdown`
- Add to `BLOCK_TYPE_LABELS`: `countdown: 'Countdown Timer'`
- Add case to `BlockFormSwitch`: `case 'countdown': return <CountdownForm content={block.content as BioBlockContentCountdown} onChange={onUpdate} />;`

- [ ] **Step 4: Commit**

```bash
git add src/components/bio/public/block-renderers/countdown-block.tsx src/components/bio/public/bio-public-block.tsx src/components/bio/grid/bio-block-toolbar.tsx src/components/bio/grid/bio-block-edit-panel.tsx
git commit -m "feat: add countdown timer block (editor + public renderer + registration)"
```

---

## Chunk 3: Payment Link Block (Phase 2)

### Task 7: Payment Link Editor Form

**Files:**
- Create: `src/components/bio/grid/forms/payment-link-form.tsx`

- [ ] **Step 1: Create the editor form**

```typescript
'use client';

import type { BioBlockContentPaymentLink } from '@/types/bio';

interface PaymentLinkFormProps {
  content: BioBlockContentPaymentLink;
  onChange: (content: BioBlockContentPaymentLink) => void;
}

const PLATFORM_OPTIONS = [
  { value: 'paypal', label: 'PayPal' },
  { value: 'venmo', label: 'Venmo' },
  { value: 'cashapp', label: 'Cash App' },
  { value: 'stripe', label: 'Stripe' },
  { value: 'buymeacoffee', label: 'Buy Me a Coffee' },
  { value: 'ko-fi', label: 'Ko-fi' },
  { value: 'custom', label: 'Custom Link' },
] as const;

export function PaymentLinkForm({ content, onChange }: PaymentLinkFormProps) {
  return (
    <div className="space-y-3">
      <div>
        <label className="mb-1 block text-xs font-medium text-muted-foreground">
          Platform
        </label>
        <select
          value={content.platform}
          onChange={(e) =>
            onChange({
              ...content,
              platform: e.target.value as BioBlockContentPaymentLink['platform'],
            })
          }
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
        >
          {PLATFORM_OPTIONS.map(({ value, label }) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="mb-1 block text-xs font-medium text-muted-foreground">
          Payment URL
        </label>
        <input
          type="url"
          value={content.url}
          onChange={(e) => onChange({ ...content, url: e.target.value })}
          placeholder="https://..."
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
        />
      </div>

      <div>
        <label className="mb-1 block text-xs font-medium text-muted-foreground">
          Button text
        </label>
        <input
          type="text"
          value={content.display_text ?? ''}
          onChange={(e) =>
            onChange({ ...content, display_text: e.target.value })
          }
          placeholder="Buy me a coffee"
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
        />
      </div>

      <div>
        <label className="mb-1 block text-xs font-medium text-muted-foreground">
          Suggested amounts (comma separated)
        </label>
        <input
          type="text"
          value={(content.suggested_amounts ?? []).join(', ')}
          onChange={(e) =>
            onChange({
              ...content,
              suggested_amounts: e.target.value
                .split(',')
                .map((s) => s.trim())
                .filter(Boolean)
                .slice(0, 5),
            })
          }
          placeholder="$5, $10, $25"
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
        />
        <p className="mt-1 text-[10px] text-muted-foreground">
          Display only. Max 5, each max 20 chars.
        </p>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/bio/grid/forms/payment-link-form.tsx
git commit -m "feat: add payment link editor form"
```

### Task 8: Payment Link Editor Preview + Public Renderer

**Files:**
- Modify: `src/components/bio/grid/bio-block-renderers.tsx`
- Create: `src/components/bio/public/block-renderers/payment-link-block.tsx`

- [ ] **Step 1: Add editor preview renderer**

In `bio-block-renderers.tsx`, add import for `DollarSign` from lucide + `BioBlockContentPaymentLink` type.

Add renderer function:

```typescript
// ─── Payment Link ────────────────────────────────────────────────

const PLATFORM_COLORS: Record<string, string> = {
  paypal: '#003087',
  venmo: '#008CFF',
  cashapp: '#00D632',
  stripe: '#635BFF',
  buymeacoffee: '#FFDD00',
  'ko-fi': '#FF5E5B',
  custom: 'currentColor',
};

function PaymentLinkBlockRenderer({
  content,
  compact,
}: {
  content: BioBlockContentPaymentLink;
  compact?: boolean;
}) {
  if (!content.url) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center gap-1.5 rounded-sm border border-dashed border-border">
        <DollarSign className={`text-muted-foreground ${compact ? 'h-4 w-4' : 'h-6 w-6'}`} />
        <span className="text-[10px] text-muted-foreground">Add payment link</span>
      </div>
    );
  }

  const color = PLATFORM_COLORS[content.platform] ?? PLATFORM_COLORS.custom;

  return (
    <div className="flex h-full w-full items-center justify-center gap-2.5 rounded-sm bg-secondary px-3">
      <div
        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full"
        style={{ backgroundColor: color + '15' }}
      >
        <DollarSign
          className={compact ? 'h-3 w-3' : 'h-3.5 w-3.5'}
          style={{ color }}
        />
      </div>
      <span className={`truncate font-medium text-foreground ${compact ? 'text-xs' : 'text-sm'}`}>
        {content.display_text || content.platform}
      </span>
    </div>
  );
}
```

Add case to `BlockRenderer` switch:

```typescript
    case 'payment_link':
      return (
        <PaymentLinkBlockRenderer
          content={block.content as BioBlockContentPaymentLink}
          compact={compact}
        />
      );
```

- [ ] **Step 2: Create public renderer**

Create `src/components/bio/public/block-renderers/payment-link-block.tsx`:

```typescript
import { DollarSign, ChevronRight } from 'lucide-react';
import type { BioBlockContentPaymentLink, BioThemeConfig } from '@/types/bio';

interface PublicPaymentLinkBlockProps {
  content: BioBlockContentPaymentLink;
  themeConfig: BioThemeConfig;
  blockId: string;
  pageId: string;
}

const PLATFORM_COLORS: Record<string, string> = {
  paypal: '#003087',
  venmo: '#008CFF',
  cashapp: '#00D632',
  stripe: '#635BFF',
  buymeacoffee: '#FFDD00',
  'ko-fi': '#FF5E5B',
  custom: '',
};

const PLATFORM_LABELS: Record<string, string> = {
  paypal: 'PayPal',
  venmo: 'Venmo',
  cashapp: 'Cash App',
  stripe: 'Stripe',
  buymeacoffee: 'Buy Me a Coffee',
  'ko-fi': 'Ko-fi',
  custom: 'Support',
};

export function PublicPaymentLinkBlock({
  content,
  themeConfig,
}: PublicPaymentLinkBlockProps) {
  if (!content.url) return null;

  const platformColor =
    PLATFORM_COLORS[content.platform] || themeConfig.colors.accent;
  const displayText =
    content.display_text ||
    PLATFORM_LABELS[content.platform] ||
    'Support';

  return (
    <div className="flex flex-col items-center gap-2">
      <a
        href={content.url}
        target="_blank"
        rel="noopener noreferrer"
        className="flex w-full items-center gap-3 px-4 py-3 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md"
        style={{
          backgroundColor: platformColor + '15',
          borderRadius: themeConfig.borderRadius,
          color: themeConfig.colors.text,
        }}
      >
        <DollarSign
          className="h-5 w-5 shrink-0"
          style={{ color: platformColor }}
        />
        <span className="flex-1 text-sm font-medium">{displayText}</span>
        <ChevronRight className="h-4 w-4 shrink-0 opacity-50" />
      </a>

      {content.suggested_amounts && content.suggested_amounts.length > 0 && (
        <div className="flex flex-wrap justify-center gap-1.5">
          {content.suggested_amounts.map((amount, i) => (
            <span
              key={i}
              className="rounded-full px-3 py-1 text-xs"
              style={{
                backgroundColor: themeConfig.colors.accent + '10',
                color: themeConfig.colors.textSecondary,
              }}
            >
              {amount}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Register in bio-public-block.tsx, toolbar, and edit panel**

Same registration pattern as countdown (Task 6, Step 3):
- `bio-public-block.tsx`: import + case
- `bio-block-toolbar.tsx`: `DollarSign` icon, `{ type: 'payment_link', icon: DollarSign, label: 'Payment' }`
- `bio-block-edit-panel.tsx`: import `PaymentLinkForm` + type + label `'Payment Link'` + case

- [ ] **Step 4: Commit**

```bash
git add src/components/bio/grid/bio-block-renderers.tsx src/components/bio/public/block-renderers/payment-link-block.tsx src/components/bio/public/bio-public-block.tsx src/components/bio/grid/bio-block-toolbar.tsx src/components/bio/grid/bio-block-edit-panel.tsx
git commit -m "feat: add payment link block (editor + public renderer + registration)"
```

---

## Chunk 4: Per-Block Styling & Preview Modes (Phases 3-4)

### Task 9: Per-Block Style Overrides in Public Renderer

**Files:**
- Modify: `src/components/bio/public/bio-public-block.tsx`

- [ ] **Step 1: Add style override rendering**

In `bio-public-block.tsx`, extract `style_overrides` from block content and wrap the renderer output:

```typescript
import type { BioStyleOverrides } from '@/types/bio';

// Inside BioPublicBlock, before the switch:
const styleOverrides = (block.content as { style_overrides?: BioStyleOverrides }).style_overrides;

const overrideStyle: React.CSSProperties = {};
if (styleOverrides?.bg_color) overrideStyle.backgroundColor = styleOverrides.bg_color;
if (styleOverrides?.border) overrideStyle.border = styleOverrides.border;
if (styleOverrides?.border_radius) {
  const radiusMap: Record<string, string> = {
    sharp: '0px', rounded: '8px', pill: '9999px', soft: '12px', chunky: '16px', organic: '20px',
  };
  overrideStyle.borderRadius = radiusMap[styleOverrides.border_radius] ?? undefined;
}
if (styleOverrides?.padding) {
  const paddingMap: Record<string, string> = { sm: '8px', md: '16px', lg: '24px' };
  overrideStyle.padding = paddingMap[styleOverrides.padding] ?? undefined;
}
if (styleOverrides?.shadow) {
  const shadowMap: Record<string, string> = {
    none: 'none', sm: '0 1px 2px rgba(0,0,0,0.05)', md: '0 4px 6px rgba(0,0,0,0.1)', lg: '0 10px 15px rgba(0,0,0,0.1)',
  };
  overrideStyle.boxShadow = shadowMap[styleOverrides.shadow] ?? undefined;
}

// Wrap the switch return in a div with overrideStyle (only if overrides exist)
```

- [ ] **Step 2: Commit**

```bash
git add src/components/bio/public/bio-public-block.tsx
git commit -m "feat: apply per-block style overrides on public bio pages"
```

### Task 10: Preview Mode Toggle

**Files:**
- Create: `src/components/bio/preview-mode-toggle.tsx`

- [ ] **Step 1: Create the toggle component**

```typescript
'use client';

import { Monitor, Tablet, Smartphone } from 'lucide-react';

type PreviewMode = 'desktop' | 'tablet' | 'mobile';

interface PreviewModeToggleProps {
  mode: PreviewMode;
  onChange: (mode: PreviewMode) => void;
}

const MODES: { id: PreviewMode; icon: typeof Monitor; label: string }[] = [
  { id: 'desktop', icon: Monitor, label: 'Desktop' },
  { id: 'tablet', icon: Tablet, label: 'Tablet' },
  { id: 'mobile', icon: Smartphone, label: 'Mobile' },
];

export function PreviewModeToggle({ mode, onChange }: PreviewModeToggleProps) {
  return (
    <div className="flex items-center gap-0.5 rounded-md border border-border bg-card p-0.5">
      {MODES.map(({ id, icon: Icon, label }) => (
        <button
          key={id}
          type="button"
          onClick={() => onChange(id)}
          title={label}
          className={`rounded-sm p-1.5 transition-colors ${
            mode === id
              ? 'bg-foreground text-background'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <Icon className="h-3.5 w-3.5" />
        </button>
      ))}
    </div>
  );
}

export const PREVIEW_WIDTHS: Record<PreviewMode, string | undefined> = {
  desktop: undefined,
  tablet: '768px',
  mobile: '375px',
};
```

- [ ] **Step 2: Integrate into the bio editor page**

Find the bio editor page that hosts the preview pane and add:
- Import `PreviewModeToggle` and `PREVIEW_WIDTHS`
- Add state: `const [previewMode, setPreviewMode] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');`
- Render toggle at top of preview pane
- Wrap preview content in a container with `maxWidth: PREVIEW_WIDTHS[previewMode]` and `transition: max-width 200ms ease`

*(Exact integration depends on which component hosts the preview — check `src/app/app/bio/[id]/page.tsx` or the grid editor component.)*

- [ ] **Step 3: Commit**

```bash
git add src/components/bio/preview-mode-toggle.tsx src/app/app/bio/[id]/page.tsx
git commit -m "feat: add desktop/tablet/mobile preview mode toggle in bio editor"
```

---

## Chunk 5: Image Gallery Block (Phase 5)

### Task 11: Gallery Upload API Route

**Files:**
- Create: `src/app/api/bio/[id]/gallery/route.ts`

- [ ] **Step 1: Create the upload route**

Follow the exact pattern from `src/app/api/bio/[id]/avatar/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { checkApiLimit, getRateLimitHeaders } from '@/lib/security/rate-limiter';

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB
const MAX_IMAGES = 12;

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  // Validate UUID
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(id)) {
    return NextResponse.json({ error: 'Invalid page ID' }, { status: 400 });
  }

  // Auth
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Rate limit
  const rateLimit = checkApiLimit(user.id);
  if (!rateLimit.success) {
    return NextResponse.json(
      { error: 'Rate limit exceeded' },
      { status: 429, headers: getRateLimitHeaders(rateLimit) },
    );
  }

  // Verify ownership
  const { data: page } = await supabase
    .from('bio_link_pages')
    .select('id')
    .eq('id', id)
    .eq('owner_id', user.id)
    .is('deleted_at', null)
    .single();

  if (!page) {
    return NextResponse.json({ error: 'Page not found' }, { status: 404 });
  }

  // Parse form data
  const formData = await request.formData();
  const files = formData.getAll('files');

  if (files.length === 0) {
    return NextResponse.json({ error: 'No files provided' }, { status: 400 });
  }
  if (files.length > MAX_IMAGES) {
    return NextResponse.json(
      { error: `Maximum ${MAX_IMAGES} images allowed` },
      { status: 400 },
    );
  }

  const uploadedPaths: string[] = [];

  for (const file of files) {
    if (!(file instanceof File)) continue;

    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: `Invalid file type: ${file.type}` },
        { status: 400 },
      );
    }
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: `File too large: ${file.name}` },
        { status: 400 },
      );
    }

    const ext = file.type.split('/')[1] === 'jpeg' ? 'jpg' : file.type.split('/')[1];
    const imageId = crypto.randomUUID();
    const storagePath = `${user.id}/${id}/${imageId}.${ext}`;
    const buffer = Buffer.from(await file.arrayBuffer());

    const { error: uploadError } = await supabase.storage
      .from('bio-gallery')
      .upload(storagePath, buffer, { contentType: file.type, upsert: false });

    if (uploadError) {
      return NextResponse.json(
        { error: `Upload failed: ${uploadError.message}` },
        { status: 500 },
      );
    }

    uploadedPaths.push(storagePath);
  }

  return NextResponse.json(
    { data: { paths: uploadedPaths } },
    { status: 201, headers: getRateLimitHeaders(rateLimit) },
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/api/bio/[id]/gallery/route.ts
git commit -m "feat: add gallery image upload API route"
```

### Task 12: Gallery Editor Form + Renderers

**Files:**
- Create: `src/components/bio/grid/forms/gallery-form.tsx`
- Create: `src/components/bio/public/block-renderers/gallery-block.tsx`
- Modify: `src/components/bio/grid/bio-block-renderers.tsx`
- Modify: `src/components/bio/public/bio-public-block.tsx`
- Modify: `src/components/bio/grid/bio-block-toolbar.tsx`
- Modify: `src/components/bio/grid/bio-block-edit-panel.tsx`

- [ ] **Step 1: Create editor form**

Create `src/components/bio/grid/forms/gallery-form.tsx` with:
- Display mode select (grid/carousel)
- Columns select (2/3, visible only in grid mode)
- File upload button (multi-file)
- Image list with caption input and link_url input per image
- Remove button per image
- Upload calls `POST /api/bio/{pageId}/gallery`, then updates content via `onChange`

- [ ] **Step 2: Create public renderer**

Create `src/components/bio/public/block-renderers/gallery-block.tsx` with:
- `'use client'` (needs state for lightbox/carousel)
- Grid mode: CSS grid with `columns` count, 8px gap, `object-cover`, rounded corners from theme
- Carousel mode: horizontal scroll-snap container, dot indicators, prev/next arrows
- Lightbox: modal overlay (90% dark bg), centered image, close button, fade-in

Builds public URLs: `{NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/bio-gallery/{storage_path}`

- [ ] **Step 3: Add editor preview renderer in bio-block-renderers.tsx**

Import `ImageIcon` (or `Images`) from lucide + `BioBlockContentGallery` type. Add renderer showing image count and display mode. Add case to switch.

- [ ] **Step 4: Register in all dispatchers** (toolbar, edit panel, public block)

Same pattern as previous blocks.

- [ ] **Step 5: Commit**

```bash
git add src/components/bio/grid/forms/gallery-form.tsx src/components/bio/public/block-renderers/gallery-block.tsx src/components/bio/grid/bio-block-renderers.tsx src/components/bio/public/bio-public-block.tsx src/components/bio/grid/bio-block-toolbar.tsx src/components/bio/grid/bio-block-edit-panel.tsx
git commit -m "feat: add image gallery block (editor form, public renderer, lightbox, carousel)"
```

---

## Chunk 6: Contact Form Block (Phase 6)

### Task 13: Form Submission API Routes

**Files:**
- Create: `src/app/api/bio/[id]/form/route.ts`
- Create: `src/app/api/bio/[id]/submissions/route.ts`
- Create: `src/app/api/bio/[id]/submissions/[subId]/route.ts`

- [ ] **Step 1: Create public form submission endpoint**

`src/app/api/bio/[id]/form/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { checkBioFormSubmitLimitAsync, getRateLimitHeaders } from '@/lib/security/rate-limiter';
import { z } from 'zod';
import crypto from 'crypto';

const formSubmissionSchema = z.object({
  block_id: z.string().uuid(),
  name: z.string().min(1).max(200),
  email: z.string().email().max(200),
  message: z.string().min(1).max(2000),
  phone: z.string().max(50).optional(),
  subject: z.string().max(200).optional(),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(id)) {
    return NextResponse.json({ error: 'Invalid page ID' }, { status: 400 });
  }

  // Rate limit by IP + page
  const forwarded = request.headers.get('x-forwarded-for');
  const ip = forwarded?.split(',')[0]?.trim() ?? 'unknown';
  const ipHash = crypto.createHash('sha256').update(ip).digest('hex').slice(0, 16);
  const rateLimitKey = `${ipHash}:${id}`;

  const rateLimit = await checkBioFormSubmitLimitAsync(rateLimitKey);
  if (!rateLimit.success) {
    return NextResponse.json(
      { error: 'Too many submissions. Please try again later.' },
      { status: 429, headers: getRateLimitHeaders(rateLimit) },
    );
  }

  // Parse body
  const body = await request.json();
  const parsed = formSubmissionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid submission', details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const supabase = createAdminClient();

  // Verify page exists and is active
  const { data: page } = await supabase
    .from('bio_link_pages')
    .select('id, owner_id')
    .eq('id', id)
    .eq('is_active', true)
    .is('deleted_at', null)
    .single();

  if (!page) {
    return NextResponse.json({ error: 'Page not found' }, { status: 404 });
  }

  // Verify block belongs to page and is a contact_form
  const { data: block } = await supabase
    .from('bio_blocks')
    .select('id, block_type')
    .eq('id', parsed.data.block_id)
    .eq('page_id', id)
    .single();

  if (!block || block.block_type !== 'contact_form') {
    return NextResponse.json({ error: 'Form not found' }, { status: 404 });
  }

  // Insert submission
  const { error } = await supabase.from('bio_form_submissions').insert({
    page_id: id,
    block_id: parsed.data.block_id,
    name: parsed.data.name,
    email: parsed.data.email,
    message: parsed.data.message,
    phone: parsed.data.phone ?? null,
    subject: parsed.data.subject ?? null,
    ip_hash: ipHash,
  });

  if (error) {
    return NextResponse.json({ error: 'Failed to save submission' }, { status: 500 });
  }

  // Email notification (requires RESEND_API_KEY env var)
  if (process.env.RESEND_API_KEY) {
    try {
      const { data: owner } = await supabase
        .from('bio_link_pages')
        .select('contact_email, owner_id')
        .eq('id', id)
        .single();

      // Get owner auth email as fallback
      let notifyEmail = owner?.contact_email;
      if (!notifyEmail && owner?.owner_id) {
        const { data: authUser } = await supabase.auth.admin.getUserById(owner.owner_id);
        notifyEmail = authUser?.user?.email ?? null;
      }

      if (notifyEmail) {
        // Fire-and-forget — don't block the response
        fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: 'OneSign <noreply@onesign.app>',
            to: notifyEmail,
            subject: `New form submission from ${parsed.data.name}`,
            text: `Name: ${parsed.data.name}\nEmail: ${parsed.data.email}\nMessage: ${parsed.data.message}${parsed.data.phone ? `\nPhone: ${parsed.data.phone}` : ''}${parsed.data.subject ? `\nSubject: ${parsed.data.subject}` : ''}`,
          }),
        }).catch(() => {}); // Silently ignore email failures
      }
    } catch {
      // Silently skip notification on any error
    }
  }

  return NextResponse.json({ success: true }, { status: 201 });
}
```

- [ ] **Step 2: Create owner submissions list endpoint**

`src/app/api/bio/[id]/submissions/route.ts` — GET handler:
- Auth required, verify page ownership
- Query `bio_form_submissions` ordered by `submitted_at DESC`
- Optional query params: `?page=1&limit=20&block_id=xxx`
- Return `{ data: submissions[], total: number }`

- [ ] **Step 3: Create individual submission management endpoint**

`src/app/api/bio/[id]/submissions/[subId]/route.ts`:
- PATCH: toggle `is_read` boolean
- DELETE: remove submission
- Both require auth + page ownership verification

- [ ] **Step 4: Commit**

```bash
git add src/app/api/bio/[id]/form/route.ts src/app/api/bio/[id]/submissions/route.ts src/app/api/bio/[id]/submissions/[subId]/route.ts
git commit -m "feat: add contact form submission API routes (public submit, owner list/manage)"
```

### Task 14: Contact Form Editor + Public Renderer

**Files:**
- Create: `src/components/bio/grid/forms/contact-form-form.tsx`
- Create: `src/components/bio/public/block-renderers/contact-form-block.tsx`
- Modify: all dispatcher files

- [ ] **Step 1: Create editor form**

`src/components/bio/grid/forms/contact-form-form.tsx`:
- Form title input
- Checkbox list for fields (name/email/message always checked+disabled, phone/subject toggleable)
- Success message input
- Notify email toggle

- [ ] **Step 2: Create public renderer**

`src/components/bio/public/block-renderers/contact-form-block.tsx`:
- `'use client'` (needs form state)
- Renders form fields based on `content.fields` array
- Input styling: border matching `themeConfig.borderRadius`, focus ring using `themeConfig.colors.accent`
- Submit button: follows `themeConfig.buttonStyle` and `themeConfig.colors`
- On submit: POST to `/api/bio/{pageId}/form` with `block_id`
- Success state: fade transition, checkmark, success message in accent color
- Error state: red borders on invalid fields, inline error text
- Loading state: spinner in button during submission

- [ ] **Step 3: Add editor preview + register in all dispatchers**

Same pattern. Use `FileText` or `Mail` icon from lucide for toolbar.

- [ ] **Step 4: Commit**

```bash
git add src/components/bio/grid/forms/contact-form-form.tsx src/components/bio/public/block-renderers/contact-form-block.tsx src/components/bio/grid/bio-block-renderers.tsx src/components/bio/public/bio-public-block.tsx src/components/bio/grid/bio-block-toolbar.tsx src/components/bio/grid/bio-block-edit-panel.tsx
git commit -m "feat: add contact form block (editor form, public renderer, submission handling)"
```

---

## Chunk 7: Starter Templates (Phase 7)

### Task 15: Template Definitions

**Files:**
- Create: `src/lib/bio/templates.ts`
- Create: `src/__tests__/lib/bio/templates.test.ts`

- [ ] **Step 1: Write failing test**

```typescript
import { describe, it, expect } from 'vitest';
import { BIO_TEMPLATES_LIST } from '@/lib/bio/templates';
import { blockContentSchemas } from '@/validations/bio';

describe('Bio templates', () => {
  it('defines exactly 4 templates', () => {
    expect(BIO_TEMPLATES_LIST).toHaveLength(4);
  });

  it('each template has required fields', () => {
    for (const t of BIO_TEMPLATES_LIST) {
      expect(t.id).toBeTruthy();
      expect(t.name).toBeTruthy();
      expect(t.description).toBeTruthy();
      expect(t.category).toBeTruthy();
      expect(t.theme).toBeTruthy();
      expect(t.blocks.length).toBeGreaterThan(0);
    }
  });

  it('all template blocks have valid content for their type', () => {
    for (const t of BIO_TEMPLATES_LIST) {
      for (const b of t.blocks) {
        const schema = blockContentSchemas[b.block_type];
        expect(schema).toBeDefined();
        const result = schema.safeParse(b.content);
        expect(result.success).toBe(true);
      }
    }
  });

  it('each template has unique id', () => {
    const ids = BIO_TEMPLATES_LIST.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/__tests__/lib/bio/templates.test.ts`

- [ ] **Step 3: Create template definitions**

Create `src/lib/bio/templates.ts` with 4 templates (creator, business, event, portfolio). Each has:
- `id`, `name`, `description`, `category`, `theme`, `card_layout`, `spacing`, `border_radius`
- `blocks` array with `block_type`, `grid_col`, `grid_row`, `grid_col_span`, `grid_row_span`, `content`
- Realistic placeholder text (not lorem ipsum)
- Grid positions that create visual balance

Export `BIO_TEMPLATES_LIST` array and `BIO_TEMPLATES_MAP` record.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/__tests__/lib/bio/templates.test.ts`
Expected: ALL PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/bio/templates.ts src/__tests__/lib/bio/templates.test.ts
git commit -m "feat: add 4 starter bio page templates (creator, business, event, portfolio)"
```

### Task 16: Template Picker Component

**Files:**
- Create: `src/components/bio/template-picker.tsx`

- [ ] **Step 1: Create the template picker modal**

```typescript
'use client';

import { useState } from 'react';
import { X, Check, Plus } from 'lucide-react';
import { BIO_TEMPLATES_LIST } from '@/lib/bio/templates';

interface TemplatePickerProps {
  onSelect: (templateId: string | null) => void;
  onClose: () => void;
  isReplace?: boolean; // True when applying to existing page
}

export function TemplatePicker({ onSelect, onClose, isReplace }: TemplatePickerProps) {
  const [selected, setSelected] = useState<string | null>(null);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="mx-4 w-full max-w-lg rounded-lg border border-border bg-card shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <h2 className="text-sm font-semibold text-foreground">
            {isReplace ? 'Apply Template' : 'Choose a Template'}
          </h2>
          <button type="button" onClick={onClose} className="rounded-sm p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground">
            <X className="h-4 w-4" />
          </button>
        </div>

        {isReplace && (
          <div className="border-b border-border bg-destructive/5 px-4 py-2">
            <p className="text-xs text-destructive">
              This will replace your current blocks. Your settings (theme, colors, avatar) won't change.
            </p>
          </div>
        )}

        {/* Template grid */}
        <div className="grid grid-cols-2 gap-3 p-4">
          {/* Blank option */}
          <button
            type="button"
            onClick={() => setSelected(null)}
            className={`flex flex-col items-center justify-center gap-2 rounded-md border-2 border-dashed p-6 transition-all hover:scale-[1.02] ${
              selected === null ? 'border-foreground bg-secondary' : 'border-border hover:border-foreground/20'
            }`}
          >
            <Plus className="h-6 w-6 text-muted-foreground" />
            <span className="text-xs font-medium text-muted-foreground">Blank</span>
            {selected === null && <Check className="h-4 w-4 text-foreground" />}
          </button>

          {BIO_TEMPLATES_LIST.map((template) => (
            <button
              key={template.id}
              type="button"
              onClick={() => setSelected(template.id)}
              className={`relative flex flex-col items-start gap-1 rounded-md border-2 p-4 text-left transition-all hover:scale-[1.02] ${
                selected === template.id ? 'border-foreground bg-secondary' : 'border-border hover:border-foreground/20'
              }`}
            >
              <span className="text-sm font-medium text-foreground">{template.name}</span>
              <span className="text-[10px] text-muted-foreground">{template.description}</span>
              {selected === template.id && (
                <Check className="absolute right-2 top-2 h-4 w-4 text-foreground" />
              )}
            </button>
          ))}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 border-t border-border px-4 py-3">
          <button type="button" onClick={onClose} className="rounded-md px-3 py-1.5 text-sm text-muted-foreground hover:bg-secondary">
            Cancel
          </button>
          <button
            type="button"
            onClick={() => onSelect(selected)}
            className="rounded-md bg-foreground px-3 py-1.5 text-sm font-medium text-background transition hover:bg-foreground/90"
          >
            {isReplace ? 'Apply' : 'Continue'}
          </button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Integrate into bio page creation flow**

In the bio page creation form (`src/app/app/bio/new/page.tsx` or similar):
- After title/slug input, show template picker
- On template selection, include `template_id` in creation payload
- Server-side: if `template_id` is provided, apply template settings and insert template blocks after page creation

- [ ] **Step 3: Add "Templates" button to bio editor toolbar**

In the bio editor, add a button that opens the `TemplatePicker` with `isReplace={true}`. On confirm, delete existing blocks and insert template blocks via batch API.

- [ ] **Step 4: Commit**

```bash
git add src/components/bio/template-picker.tsx src/app/app/bio/new/page.tsx
git commit -m "feat: add template picker for bio page creation and editor"
```

---

## Chunk 8: Final Integration & Verification

### Task 17: Run All Tests

- [ ] **Step 1: Run full test suite**

```bash
npx vitest run
```

Expected: ALL PASS

- [ ] **Step 2: Fix any failures**

If tests fail, fix the issues before proceeding.

### Task 18: Build Verification

- [ ] **Step 1: Run TypeScript type check**

```bash
npx tsc --noEmit
```

Expected: No errors

- [ ] **Step 2: Run production build**

```bash
npm run build
```

Expected: Build succeeds with no errors

- [ ] **Step 3: Fix any issues**

If build fails, fix type errors or import issues.

- [ ] **Step 4: Final commit**

```bash
git add -A
git commit -m "fix: resolve any remaining type/build issues from bio editor expansion"
```

### Task 19: Smoke Test

- [ ] **Step 1: Start dev server and manually verify**

```bash
npm run dev
```

- Navigate to `/app/bio/new` — verify template picker appears
- Create a page with a template — verify blocks are pre-populated
- Add each new block type (countdown, payment link, gallery, contact form) — verify editor forms work
- Visit the public page `/p/{slug}` — verify all blocks render correctly
- Test countdown timer updates every second
- Test contact form submission
- Test preview mode toggle (desktop/tablet/mobile)
- Test per-block styling (add bg color, shadow to a block)

- [ ] **Step 2: Commit any fixes**

```bash
git add -A
git commit -m "fix: address issues found during smoke testing"
```

---

## Addendum: Implementation Notes

### A. Gallery Form Complete Code (Task 12, Step 1)

The gallery editor form must handle multi-file upload. The form should:

1. Show a file input (`<input type="file" multiple accept="image/jpeg,image/png,image/webp" />`)
2. On file selection, POST to `/api/bio/{pageId}/gallery` as `FormData` with key `files`
3. On success, append returned paths to `content.images` and call `onChange`
4. Render existing images as a sortable list with: thumbnail, caption input, link_url input, remove button
5. Show display_mode toggle (grid/carousel) and columns select (2/3, visible only in grid mode)

The page ID must be passed as a prop to the form. Update `BlockFormSwitch` to pass `pageId` for the gallery form case.

### B. Gallery Public Renderer Complete Code (Task 12, Step 2)

Must be `'use client'` for interactivity. Build public URLs as:
```
${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/bio-gallery/${storage_path}
```

**Grid mode:** Use CSS grid with `gridTemplateColumns: repeat(columns, 1fr)`, gap 8px. Images use `object-cover`, rounded corners from `themeConfig.borderRadius`.

**Carousel mode:** Horizontal scroll container with `scroll-snap-type: x mandatory`, each image `scroll-snap-align: start`. Add prev/next arrow buttons positioned absolutely. Dot indicators below.

**Lightbox:** State-managed modal. On image click (when no `link_url`), set `activeImageIndex`. Render fixed overlay with `bg-black/90`, centered `<img>`, close button (X), keyboard escape handler. Add `useEffect` to prevent body scroll when open.

### C. Contact Form Editor Form (Task 14, Step 1)

Fields:
- `form_title`: text input
- `fields`: checkboxes for each field. `name`, `email`, `message` are always checked and disabled. `phone` and `subject` are toggleable.
- `success_message`: text input
- `notify_email`: toggle switch (same switch component pattern from edit panel visibility toggle)

### D. Contact Form Public Renderer (Task 14, Step 2)

Must be `'use client'`. State management:
- `formData`: `Record<string, string>` for field values
- `errors`: `Record<string, string>` for validation errors
- `status`: `'idle' | 'submitting' | 'success' | 'error'`

On submit:
1. Client-side validate: all required fields non-empty, email format check
2. Set status to `'submitting'`
3. `fetch('/api/bio/${pageId}/form', { method: 'POST', body: JSON.stringify({ block_id, ...formData }) })`
4. On 201: set status to `'success'`, show success message with fade-in
5. On 429: show "Too many submissions" error
6. On other error: set status to `'error'`

Styling per spec: inputs use `themeConfig.borderRadius`, focus ring with `themeConfig.colors.accent`, submit button follows `themeConfig.buttonStyle`.

### E. Submissions API Routes (Task 13, Steps 2-3)

**GET `/api/bio/[id]/submissions`:**
Follow exact pattern from `GET /api/bio/[id]/blocks/route.ts`:
1. Validate UUID, auth, rate limit, ownership
2. Query `bio_form_submissions` with `.eq('page_id', id).order('submitted_at', { ascending: false })`
3. Optional filters: `?block_id=xxx` adds `.eq('block_id', blockId)`, `?unread_only=true` adds `.eq('is_read', false)`
4. Return `{ data: submissions }`

**PATCH `/api/bio/[id]/submissions/[subId]`:**
1. Same auth/ownership checks
2. Parse body: `z.object({ is_read: z.boolean() })`
3. Update `.eq('id', subId).eq('page_id', id)`
4. Return updated submission

**DELETE `/api/bio/[id]/submissions/[subId]`:**
1. Same auth/ownership checks
2. Delete `.eq('id', subId).eq('page_id', id)`
3. Return 204

### F. Per-Block Style Override Editor UI (Missing from main plan)

Add to **Chunk 4** as a new Task 9b:

**Files:**
- Modify: `src/components/bio/grid/bio-block-edit-panel.tsx`

Add a "Style" tab (paintbrush icon) alongside the content form in the edit panel. When the Style tab is active, show:
- **Background color**: hex input + swatch (reuse existing color picker pattern)
- **Border radius**: dropdown with options: sharp, rounded, pill, soft, chunky, organic
- **Border**: text input for CSS border value (e.g., "1px solid #ccc")
- **Padding**: segmented control with sm/md/lg
- **Shadow**: segmented control with none/sm/md/lg
- **"Reset to defaults" link**: clears all overrides

Changes are saved to `content.style_overrides` via the existing `onUpdate` callback. The edit panel state tracks which tab is active (content vs style).

### G. Preview Mode Integration Specifics

The bio editor lives at `src/app/app/bio/[id]/page.tsx`. The preview pane is likely rendered by a client component. Add the `PreviewModeToggle` at the top of the preview area. Wrap the preview content in:

```tsx
<div
  className="mx-auto transition-all duration-200"
  style={{ maxWidth: PREVIEW_WIDTHS[previewMode] }}
>
  {/* existing preview content */}
</div>
```

If the preview is inside a different component (e.g., `BioEditorPreview`), follow that component's structure.

### H. Template Font Fields

Each template definition should include `font_title` and `font_body` fields. Use Google Fonts that complement the theme:
- Creator (gradient-sunset): `font_title: 'Playfair Display'`, `font_body: 'Inter'`
- Business (minimal): `font_title: null`, `font_body: null` (use theme defaults)
- Event (bold): `font_title: 'Space Grotesk'`, `font_body: 'Inter'`
- Portfolio (glass): `font_title: 'Sora'`, `font_body: 'Inter'`

### I. Note on `uuid_generate_v4()` vs `gen_random_uuid()`

The spec says `gen_random_uuid()` but the codebase uses `uuid_generate_v4()` consistently across all migrations. The plan uses the codebase convention. This is correct.

### J. Gallery Storage Cleanup (Technical Debt)

When a gallery block is deleted, images in `bio-gallery` storage remain orphaned. This is acceptable for now — can be addressed later with a scheduled cleanup job. Not in scope for this plan.
