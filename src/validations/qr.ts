/**
 * Zod validation schemas for QR operations
 */

import { z } from 'zod';
import {
  MODULE_SHAPES,
  EYE_SHAPES,
  ERROR_CORRECTION_LEVELS,
  SLUG_CONFIG,
  QR_DEFAULTS,
} from '@/lib/constants';

// Hex color validation
const hexColor = z
  .string()
  .regex(/^#[0-9A-Fa-f]{6}$/, 'Invalid hex color format (use #RRGGBB)');

// Slug validation
const slug = z
  .string()
  .min(SLUG_CONFIG.MIN_LENGTH, `Slug must be at least ${SLUG_CONFIG.MIN_LENGTH} characters`)
  .max(SLUG_CONFIG.MAX_LENGTH, `Slug must be at most ${SLUG_CONFIG.MAX_LENGTH} characters`)
  .regex(SLUG_CONFIG.PATTERN, 'Slug must be lowercase alphanumeric with hyphens')
  .optional();

// QR style schema
export const qrStyleSchema = z.object({
  foreground_color: hexColor.default('#000000'),
  background_color: hexColor.default('#FFFFFF'),
  error_correction: z.enum(ERROR_CORRECTION_LEVELS).default('M'),
  quiet_zone: z
    .number()
    .int()
    .min(QR_DEFAULTS.MIN_QUIET_ZONE)
    .max(QR_DEFAULTS.MAX_QUIET_ZONE)
    .default(QR_DEFAULTS.QUIET_ZONE),
  module_shape: z.enum(MODULE_SHAPES).default('square'),
  eye_shape: z.enum(EYE_SHAPES).default('square'),
  logo_size_ratio: z
    .number()
    .min(0.1)
    .max(QR_DEFAULTS.MAX_LOGO_RATIO)
    .optional(),
});

// Create QR request schema
export const createQRSchema = z.object({
  name: z
    .string()
    .min(1, 'Name is required')
    .max(100, 'Name must be at most 100 characters')
    .transform((s) => s.trim()),
  mode: z.enum(['managed', 'direct']).default('managed'),
  destination_url: z
    .string()
    .min(1, 'URL is required')
    .max(2048, 'URL is too long'),
  slug: slug,
  analytics_enabled: z.boolean().default(true),
  style: qrStyleSchema.partial().optional(),
});

// Update QR request schema
export const updateQRSchema = z.object({
  name: z
    .string()
    .min(1, 'Name is required')
    .max(100, 'Name must be at most 100 characters')
    .transform((s) => s.trim())
    .optional(),
  destination_url: z
    .string()
    .min(1, 'URL is required')
    .max(2048, 'URL is too long')
    .optional(),
  is_active: z.boolean().optional(),
  analytics_enabled: z.boolean().optional(),
});

// Update style request schema
export const updateStyleSchema = qrStyleSchema.partial();

// Export request schema
export const exportQRSchema = z.object({
  format: z.enum(['svg', 'png', 'pdf']),
  size: z.coerce
    .number()
    .int()
    .min(64)
    .max(4096)
    .default(QR_DEFAULTS.DEFAULT_SIZE)
    .optional(),
  preset: z
    .enum(['sticker-50mm', 'sticker-75mm', 'sticker-100mm', 'a4'])
    .optional(),
});

// Validate URL schema (for the validation endpoint)
export const validateUrlSchema = z.object({
  url: z.string().min(1, 'URL is required'),
});

// Types inferred from schemas
export type CreateQRInput = z.infer<typeof createQRSchema>;
export type UpdateQRInput = z.infer<typeof updateQRSchema>;
export type UpdateStyleInput = z.infer<typeof updateStyleSchema>;
export type ExportQRInput = z.infer<typeof exportQRSchema>;
export type ValidateUrlInput = z.infer<typeof validateUrlSchema>;
