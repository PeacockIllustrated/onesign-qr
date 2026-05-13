import type { BrandTemplate, BrandDesignKind } from '@/types/brand';

/**
 * Template registry. Each entry corresponds to a renderer in
 * `src/components/brand/templates/`. Adding a template = one entry here +
 * one React component + one render branch in the template index.
 *
 * Business card templates are double-sided. Email signature templates are
 * single-piece HTML.
 */
export const BRAND_TEMPLATES: BrandTemplate[] = [
  // ── Business cards ────────────────────────────────────────────
  {
    id: 'card-classic-plus',
    kind: 'business_card',
    name: 'Classic+',
    description: 'Asymmetric editorial layout. Refined typographic hierarchy, generous white space.',
    preview_aspect: '85 / 55',
  },
  {
    id: 'card-mono',
    kind: 'business_card',
    name: 'Mono',
    description: 'Monospaced contact stack, bold name treatment, accent colour as a hero element.',
    preview_aspect: '85 / 55',
  },
  {
    id: 'card-bold-block',
    kind: 'business_card',
    name: 'Bold Block',
    description: 'Split-colour front with a magazine-style drop-cap initial. Confident and maximalist.',
    preview_aspect: '85 / 55',
  },
  {
    id: 'card-minimal-type',
    kind: 'business_card',
    name: 'Minimal Type',
    description: 'Pure typography, generous negative space. For brands where your name IS the brand.',
    preview_aspect: '85 / 55',
  },
  {
    id: 'card-serif-premium',
    kind: 'business_card',
    name: 'Serif Premium',
    description: 'Classical luxury — framed wordmark, italic role line, small-caps contact. Law / wealth / hospitality.',
    preview_aspect: '85 / 55',
  },
  {
    id: 'card-diagonal',
    kind: 'business_card',
    name: 'Diagonal',
    description: 'Dynamic accent stripe running corner to corner. Tech / creative / modern services.',
    preview_aspect: '85 / 55',
  },
  {
    id: 'card-portrait',
    kind: 'business_card',
    name: 'Portrait',
    description: 'Person photo fills the front-left, type stack on the right. Sales / realtors / advisors.',
    preview_aspect: '85 / 55',
  },
  // Note: 'card-classic' (legacy single-sided) is still rendered by the
  // template index for any pre-existing designs, but is intentionally absent
  // here so new designs can't pick it.

  // ── Email signatures ──────────────────────────────────────────
  {
    id: 'sig-classic',
    kind: 'email_signature',
    name: 'Classic',
    description: 'Logo (or avatar) on the left, contact details on the right. Outlook-safe.',
    preview_aspect: '600 / 180',
  },
  {
    id: 'sig-photo-led',
    kind: 'email_signature',
    name: 'Photo-led',
    description: 'Large headshot dominates the left side, contact stack on the right. Best for client-facing roles.',
    preview_aspect: '560 / 180',
  },
  {
    id: 'sig-compact',
    kind: 'email_signature',
    name: 'Compact',
    description: 'Tight two-line signature with optional small avatar. For minimalists.',
    preview_aspect: '500 / 60',
  },
  {
    id: 'sig-banner',
    kind: 'email_signature',
    name: 'Banner',
    description: 'Coloured header band with name and logo over a white body. Reads as corporate letterhead.',
    preview_aspect: '600 / 200',
  },
  {
    id: 'sig-card',
    kind: 'email_signature',
    name: 'Card',
    description: 'Bordered mini-card with rounded corners and an accent rule. Contained and recognisable.',
    preview_aspect: '540 / 170',
  },
  {
    id: 'sig-minimal-bar',
    kind: 'email_signature',
    name: 'Minimal Bar',
    description: 'Single vertical accent rule with quiet stacked type. The most restrained option.',
    preview_aspect: '480 / 130',
  },
  {
    id: 'sig-stacked',
    kind: 'email_signature',
    name: 'Stacked',
    description: 'Vertical layout for mobile-first readers. E / P / W column-labelled contact stack.',
    preview_aspect: '360 / 280',
  },
  {
    id: 'sig-eco',
    kind: 'email_signature',
    name: 'Eco',
    description: 'Adds a prominent footer line for sustainability statements, quotes or manifestos.',
    preview_aspect: '580 / 200',
  },
];

export function getTemplate(id: string): BrandTemplate | null {
  return BRAND_TEMPLATES.find((t) => t.id === id) ?? null;
}

export function getTemplatesByKind(kind: BrandDesignKind): BrandTemplate[] {
  return BRAND_TEMPLATES.filter((t) => t.kind === kind);
}

/** Standard business card dimensions in millimeters (UK/EU standard). */
export const CARD_DIMENSIONS = {
  width_mm: 85,
  height_mm: 55,
  bleed_mm: 3,
  bleed_width_mm: 91,
  bleed_height_mm: 61,
};

/** Templates that have a back side (double-sided print). */
export const DOUBLE_SIDED_CARD_TEMPLATES = new Set([
  'card-classic-plus',
  'card-mono',
  'card-bold-block',
  'card-minimal-type',
  'card-serif-premium',
  'card-diagonal',
  'card-portrait',
]);
