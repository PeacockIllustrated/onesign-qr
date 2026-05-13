/**
 * Zod validation schemas for Brand Kit operations
 */

import { z } from 'zod';

const hexColor = z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Invalid hex color (use #RRGGBB)');
const optionalUrl = z.string().max(2048).url().optional().or(z.literal(''));

// ─── Brand profile ───────────────────────────────────────────────────

export const createBrandProfileSchema = z.object({
  name: z.string().min(1).max(100),
  tagline: z.string().max(200).optional(),
  primary_color: hexColor.optional(),
  secondary_color: hexColor.optional(),
  accent_color: hexColor.optional(),
  font_heading: z.string().max(60).optional(),
  font_body: z.string().max(60).optional(),
  website: optionalUrl,
});

export const updateBrandProfileSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  tagline: z.string().max(200).nullable().optional(),
  primary_color: hexColor.optional(),
  secondary_color: hexColor.optional(),
  accent_color: hexColor.nullable().optional(),
  font_heading: z.string().max(60).optional(),
  font_body: z.string().max(60).optional(),
  website: z.string().max(2048).nullable().optional(),
  logo_storage_path: z.string().max(500).nullable().optional(),
  logo_dark_storage_path: z.string().max(500).nullable().optional(),
  socials: z
    .object({
      linkedin: z.string().max(2048).optional(),
      twitter: z.string().max(2048).optional(),
      instagram: z.string().max(2048).optional(),
      facebook: z.string().max(2048).optional(),
      youtube: z.string().max(2048).optional(),
      tiktok: z.string().max(2048).optional(),
      github: z.string().max(2048).optional(),
      website: z.string().max(2048).optional(),
    })
    .optional(),
});

// ─── Brand person ────────────────────────────────────────────────────

export const createBrandPersonSchema = z.object({
  full_name: z.string().min(1).max(100),
  role: z.string().max(100).optional(),
  pronouns: z.string().max(30).optional(),
  email: z.string().max(200).email().optional().or(z.literal('')),
  phone: z.string().max(50).optional(),
  mobile: z.string().max(50).optional(),
  address: z.string().max(300).optional(),
});

export const updateBrandPersonSchema = createBrandPersonSchema.partial().extend({
  photo_storage_path: z.string().max(500).nullable().optional(),
  sort_order: z.number().int().min(0).optional(),
});

// ─── Brand design ────────────────────────────────────────────────────

export const brandDesignKind = z.enum(['business_card', 'email_signature']);

const designConfig = z
  .object({
    primary_color: hexColor.optional(),
    secondary_color: hexColor.optional(),
    accent_color: hexColor.optional(),
    tagline: z.string().max(200).optional(),
    show_logo: z.boolean().optional(),

    avatar_shape: z.enum(['none', 'circle', 'square']).optional(),
    avatar_border: z.boolean().optional(),
    avatar_border_color: hexColor.optional(),

    back_style: z.enum(['logo-centered', 'solid-accent', 'monogram']).optional(),

    show_qr: z.boolean().optional(),
    qr_destination_url: z.string().max(2048).optional(),
    custom_lines: z.array(z.string().max(120)).max(6).optional(),
    notes: z.string().max(500).optional(),
  })
  .strict();

export const createBrandDesignSchema = z.object({
  brand_profile_id: z.string().uuid(),
  person_id: z.string().uuid().nullable().optional(),
  kind: brandDesignKind,
  template_id: z.string().min(1).max(60),
  name: z.string().min(1).max(100),
  config: designConfig.optional(),
});

export const updateBrandDesignSchema = z.object({
  person_id: z.string().uuid().nullable().optional(),
  template_id: z.string().min(1).max(60).optional(),
  name: z.string().min(1).max(100).optional(),
  config: designConfig.optional(),
});

// ─── Type exports ────────────────────────────────────────────────────

export type CreateBrandProfileInput = z.infer<typeof createBrandProfileSchema>;
export type UpdateBrandProfileInput = z.infer<typeof updateBrandProfileSchema>;
export type CreateBrandPersonInput = z.infer<typeof createBrandPersonSchema>;
export type UpdateBrandPersonInput = z.infer<typeof updateBrandPersonSchema>;
export type CreateBrandDesignInput = z.infer<typeof createBrandDesignSchema>;
export type UpdateBrandDesignInput = z.infer<typeof updateBrandDesignSchema>;
