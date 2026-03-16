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
const bioThemes = [
  'minimal', 'midnight', 'gradient-sunset', 'gradient-ocean', 'neon',
  'pastel-dream', 'bold', 'glass', 'retro', 'nature', 'cosmic', 'brutalist',
] as const;

// Spacing options
const spacingOptions = ['compact', 'normal', 'spacious'] as const;

// Border radius presets
const borderRadiusOptions = ['sharp', 'rounded', 'pill', 'soft', 'chunky', 'organic'] as const;

// Button styles
const buttonStyles = ['filled', 'outline', 'shadow'] as const;

// Contact card layouts
const cardLayoutOptions = ['centered', 'left-aligned', 'split', 'minimal', 'cover'] as const;

// Cover image aspect ratios
const coverAspectRatioOptions = ['3:1', '16:9', '2:1', '4:3'] as const;

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
  font_title: z.string().max(100, 'Font name too long').optional(),
  font_body: z.string().max(100, 'Font name too long').optional(),
  border_radius: z.enum(borderRadiusOptions).optional(),
  spacing: z.enum(spacingOptions).optional(),
  background_variant: z.string().max(50, 'Background variant too long').optional(),
  analytics_enabled: z.boolean().default(true),
  create_qr: z.boolean().default(false),
  card_layout: z.enum(cardLayoutOptions).optional(),
  subtitle: z.string().max(150, 'Subtitle must be at most 150 characters').transform((s) => s.trim()).optional(),
  company: z.string().max(100, 'Company must be at most 100 characters').transform((s) => s.trim()).optional(),
  job_title: z.string().max(100, 'Job title must be at most 100 characters').transform((s) => s.trim()).optional(),
  location: z.string().max(100, 'Location must be at most 100 characters').transform((s) => s.trim()).optional(),
  contact_email: z.string().email('Invalid email').max(200).optional(),
  contact_phone: z.string().max(50, 'Phone must be at most 50 characters').transform((s) => s.trim()).optional(),
  contact_website: z.string().max(2048, 'Website URL is too long').optional(),
  cover_aspect_ratio: z.enum(coverAspectRatioOptions).optional(),
  cover_position_y: z.number().int().min(0).max(100).optional(),
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
  font_title: z.string().max(100, 'Font name too long').nullable().optional(),
  font_body: z.string().max(100, 'Font name too long').nullable().optional(),
  border_radius: z.enum(borderRadiusOptions).nullable().optional(),
  spacing: z.enum(spacingOptions).nullable().optional(),
  background_variant: z.string().max(50, 'Background variant too long').nullable().optional(),
  is_active: z.boolean().optional(),
  analytics_enabled: z.boolean().optional(),
  card_layout: z.enum(cardLayoutOptions).nullable().optional(),
  subtitle: z.string().max(150, 'Subtitle must be at most 150 characters').transform((s) => s.trim()).nullable().optional(),
  company: z.string().max(100, 'Company must be at most 100 characters').transform((s) => s.trim()).nullable().optional(),
  job_title: z.string().max(100, 'Job title must be at most 100 characters').transform((s) => s.trim()).nullable().optional(),
  location: z.string().max(100, 'Location must be at most 100 characters').transform((s) => s.trim()).nullable().optional(),
  contact_email: z.string().email('Invalid email').max(200).nullable().optional(),
  contact_phone: z.string().max(50, 'Phone must be at most 50 characters').transform((s) => s.trim()).nullable().optional(),
  contact_website: z.string().max(2048, 'Website URL is too long').nullable().optional(),
  cover_aspect_ratio: z.enum(coverAspectRatioOptions).nullable().optional(),
  cover_position_y: z.number().int().min(0).max(100).nullable().optional(),
});

// Icon types
const iconTypes = ['emoji', 'image', 'favicon'] as const;

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
  icon_type: z.enum(iconTypes).nullable().optional(),
  icon_url: z.string().max(2048, 'Icon URL is too long').nullable().optional(),
  icon_bg_color: hexColor.nullable().optional(),
  show_icon: z.boolean().default(true),
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
  icon_type: z.enum(iconTypes).nullable().optional(),
  icon_url: z.string().max(2048, 'Icon URL is too long').nullable().optional(),
  icon_bg_color: hexColor.nullable().optional(),
  show_icon: z.boolean().optional(),
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

// ─── Block Schemas ──────────────────────────────────────────────────

// Block types
const blockTypes = [
  'link', 'heading', 'text', 'image', 'social_icons',
  'divider', 'spacer', 'spotify_embed', 'youtube_embed', 'map',
  'contact_form', 'gallery', 'countdown', 'payment_link',
] as const;

// ─── Style Overrides (shared across all block types) ─────────────

const styleOverridesSchema = z.object({
  bg_color: hexColor.optional(),
  border_radius: z.enum(borderRadiusOptions).optional(),
  border: z.string().max(100).optional(),
  padding: z.enum(['sm', 'md', 'lg']).optional(),
  shadow: z.enum(['none', 'sm', 'md', 'lg']).optional(),
}).optional();

// Content schemas per block type
// Note: fields use min(0) to allow empty defaults on creation — users fill content via the edit panel
const linkContentSchema = z.object({
  title: z.string().max(100),
  url: z.string().max(2048),
  icon: z.string().max(50).nullable().optional(),
  icon_type: z.enum(iconTypes).nullable().optional(),
  icon_url: z.string().max(2048).nullable().optional(),
  icon_bg_color: hexColor.nullable().optional(),
  show_icon: z.boolean().optional(),
  style_overrides: styleOverridesSchema,
});

const headingContentSchema = z.object({
  text: z.string().max(200),
  level: z.union([z.literal(1), z.literal(2), z.literal(3)]),
  style_overrides: styleOverridesSchema,
});

const textContentSchema = z.object({
  text: z.string().max(500),
  bold: z.boolean().optional(),
  italic: z.boolean().optional(),
  align: z.enum(['left', 'center', 'right']).optional(),
  style_overrides: styleOverridesSchema,
});

const imageContentSchema = z.object({
  src: z.string().max(2048),
  alt: z.string().max(200).optional(),
  object_fit: z.enum(['cover', 'contain']).optional(),
  invert: z.boolean().optional(),
  link_url: z.string().max(2048).optional(),
  style_overrides: styleOverridesSchema,
});

const socialIconsContentSchema = z.object({
  icons: z.array(z.object({
    platform: z.string().max(50),
    url: z.string().max(2048),
  })).max(20),
  style_overrides: styleOverridesSchema,
});

const dividerContentSchema = z.object({
  style: z.enum(['solid', 'dashed', 'dotted', 'gradient']),
  style_overrides: styleOverridesSchema,
});

const spacerContentSchema = z.object({
  style_overrides: styleOverridesSchema,
});

const spotifyEmbedContentSchema = z.object({
  spotify_url: z.string().max(2048),
  embed_type: z.enum(['track', 'album', 'playlist', 'artist']),
  style_overrides: styleOverridesSchema,
});

const youtubeEmbedContentSchema = z.object({
  video_url: z.string().max(2048),
  style_overrides: styleOverridesSchema,
});

const mapContentSchema = z.object({
  query: z.string().max(500),
  zoom: z.number().int().min(1).max(20).optional(),
  style_overrides: styleOverridesSchema,
});

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

/** Map of block_type to its content validation schema */
export const blockContentSchemas: Record<string, z.ZodType> = {
  link: linkContentSchema,
  heading: headingContentSchema,
  text: textContentSchema,
  image: imageContentSchema,
  social_icons: socialIconsContentSchema,
  divider: dividerContentSchema,
  spacer: spacerContentSchema,
  spotify_embed: spotifyEmbedContentSchema,
  youtube_embed: youtubeEmbedContentSchema,
  map: mapContentSchema,
  contact_form: contactFormContentSchema,
  gallery: galleryContentSchema,
  countdown: countdownContentSchema,
  payment_link: paymentLinkContentSchema,
};

// Create block schema
export const createBioBlockSchema = z.object({
  block_type: z.enum(blockTypes),
  grid_col: z.number().int().min(0).max(3),
  grid_row: z.number().int().min(0),
  grid_col_span: z.number().int().min(1).max(4),
  grid_row_span: z.number().int().min(1).max(4),
  content: z.record(z.string(), z.unknown()),
  is_enabled: z.boolean().default(true),
}).refine(
  (data) => data.grid_col + data.grid_col_span <= 4,
  { message: 'Block exceeds grid width (col + colSpan must be <= 4)' }
);

// Update block schema
export const updateBioBlockSchema_block = z.object({
  grid_col: z.number().int().min(0).max(3).optional(),
  grid_row: z.number().int().min(0).optional(),
  grid_col_span: z.number().int().min(1).max(4).optional(),
  grid_row_span: z.number().int().min(1).max(4).optional(),
  content: z.record(z.string(), z.unknown()).optional(),
  is_enabled: z.boolean().optional(),
});

// Batch update blocks schema (for grid drag/resize)
export const batchUpdateBlocksSchema = z.object({
  blocks: z.array(z.object({
    id: z.string().uuid('Invalid block ID'),
    grid_col: z.number().int().min(0).max(3).optional(),
    grid_row: z.number().int().min(0).optional(),
    grid_col_span: z.number().int().min(1).max(4).optional(),
    grid_row_span: z.number().int().min(1).max(4).optional(),
    sort_order: z.number().int().min(0).optional(),
  })).min(1).max(50),
});

// Track block click schema
export const trackBlockClickSchema = z.object({
  block_id: z.string().uuid('Invalid block ID'),
  page_id: z.string().uuid('Invalid page ID'),
});

// Types inferred from schemas
export type CreateBioPageInput = z.infer<typeof createBioPageSchema>;
export type UpdateBioPageInput = z.infer<typeof updateBioPageSchema>;
export type CreateBioLinkInput = z.infer<typeof createBioLinkSchema>;
export type UpdateBioLinkInput = z.infer<typeof updateBioLinkSchema>;
export type ReorderLinksInput = z.infer<typeof reorderLinksSchema>;
export type TrackClickInput = z.infer<typeof trackClickSchema>;
export type CreateBioBlockInput = z.infer<typeof createBioBlockSchema>;
export type BatchUpdateBlocksInput = z.infer<typeof batchUpdateBlocksSchema>;
export type TrackBlockClickInput = z.infer<typeof trackBlockClickSchema>;
