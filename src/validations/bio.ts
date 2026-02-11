/**
 * Zod validation schemas for bio-link page operations
 */

import { z } from 'zod';
import { SLUG_CONFIG } from '@/lib/constants';

// Hex color validation (reuse pattern from qr validations)
const hexColor = z
  .string()
  .regex(/^#[0-9A-Fa-f]{6}$/, 'Invalid hex color format (use #RRGGBB)');

// Bio-link themes
const bioThemes = ['minimal', 'midnight', 'gradient-sunset', 'gradient-ocean', 'neon'] as const;

// Button styles
const buttonStyles = ['filled', 'outline', 'shadow'] as const;

// Slug validation for bio pages
const bioSlug = z
  .string()
  .min(3, 'Slug must be at least 3 characters')
  .max(40, 'Slug must be at most 40 characters')
  .regex(SLUG_CONFIG.PATTERN, 'Slug must be lowercase alphanumeric with hyphens')
  .optional();

// Create bio page request schema
export const createBioPageSchema = z.object({
  title: z
    .string()
    .min(1, 'Title is required')
    .max(100, 'Title must be at most 100 characters')
    .transform((s) => s.trim()),
  bio: z
    .string()
    .max(300, 'Bio must be at most 300 characters')
    .transform((s) => s.trim())
    .optional(),
  slug: bioSlug,
  theme: z.enum(bioThemes).default('minimal'),
  button_style: z.enum(buttonStyles).default('filled'),
  custom_bg_color: hexColor.optional(),
  custom_text_color: hexColor.optional(),
  custom_accent_color: hexColor.optional(),
  analytics_enabled: z.boolean().default(true),
  create_qr: z.boolean().default(false),
});

// Update bio page request schema
export const updateBioPageSchema = z.object({
  title: z
    .string()
    .min(1, 'Title is required')
    .max(100, 'Title must be at most 100 characters')
    .transform((s) => s.trim())
    .optional(),
  bio: z
    .string()
    .max(300, 'Bio must be at most 300 characters')
    .transform((s) => s.trim())
    .nullable()
    .optional(),
  theme: z.enum(bioThemes).optional(),
  button_style: z.enum(buttonStyles).optional(),
  custom_bg_color: hexColor.nullable().optional(),
  custom_text_color: hexColor.nullable().optional(),
  custom_accent_color: hexColor.nullable().optional(),
  is_active: z.boolean().optional(),
  analytics_enabled: z.boolean().optional(),
});

// Create bio link item schema
export const createBioLinkSchema = z.object({
  title: z
    .string()
    .min(1, 'Link title is required')
    .max(100, 'Link title must be at most 100 characters')
    .transform((s) => s.trim()),
  url: z
    .string()
    .min(1, 'URL is required')
    .max(2048, 'URL is too long'),
  icon: z
    .string()
    .max(50, 'Icon name is too long')
    .optional(),
  is_enabled: z.boolean().default(true),
});

// Update bio link item schema
export const updateBioLinkSchema = z.object({
  title: z
    .string()
    .min(1, 'Link title is required')
    .max(100, 'Link title must be at most 100 characters')
    .transform((s) => s.trim())
    .optional(),
  url: z
    .string()
    .min(1, 'URL is required')
    .max(2048, 'URL is too long')
    .optional(),
  icon: z
    .string()
    .max(50, 'Icon name is too long')
    .nullable()
    .optional(),
  is_enabled: z.boolean().optional(),
});

// Reorder links schema
export const reorderLinksSchema = z.object({
  items: z
    .array(
      z.object({
        id: z.string().uuid('Invalid link ID'),
        sort_order: z.number().int().min(0),
      })
    )
    .min(1, 'At least one item is required')
    .max(10, 'Maximum 10 items allowed'),
});

// Track click schema (for the public tracking endpoint)
export const trackClickSchema = z.object({
  item_id: z.string().uuid('Invalid item ID'),
  page_id: z.string().uuid('Invalid page ID'),
});

// Types inferred from schemas
export type CreateBioPageInput = z.infer<typeof createBioPageSchema>;
export type UpdateBioPageInput = z.infer<typeof updateBioPageSchema>;
export type CreateBioLinkInput = z.infer<typeof createBioLinkSchema>;
export type UpdateBioLinkInput = z.infer<typeof updateBioLinkSchema>;
export type ReorderLinksInput = z.infer<typeof reorderLinksSchema>;
export type TrackClickInput = z.infer<typeof trackClickSchema>;
