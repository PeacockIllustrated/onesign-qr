import type { BrandTemplate, BrandDesignKind } from '@/types/brand';

/**
 * Template registry. Each entry corresponds to a renderer in
 * `src/components/brand/templates/`. Adding a template = one entry here +
 * one React component + one render branch in the export endpoint.
 */
export const BRAND_TEMPLATES: BrandTemplate[] = [
  {
    id: 'card-classic',
    kind: 'business_card',
    name: 'Classic',
    description: 'Centered logo, name and contact lines. Pairs with any brand.',
    preview_aspect: '88.9 / 53.98',
  },
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
  // Outer dimensions including bleed
  bleed_width_mm: 91,
  bleed_height_mm: 61,
};
