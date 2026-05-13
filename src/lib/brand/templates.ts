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
  // Note: 'card-classic' (legacy single-sided) is still rendered by the
  // template index for any pre-existing designs, but is intentionally absent
  // here so new designs can't pick it.
  {
    id: 'sig-classic',
    kind: 'email_signature',
    name: 'Classic',
    description: 'Logo on the left, contact details on the right. Outlook-safe.',
    preview_aspect: '600 / 180',
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
export const DOUBLE_SIDED_CARD_TEMPLATES = new Set(['card-classic-plus', 'card-mono']);
