import { z } from 'zod';

const slugSchema = z
  .string()
  .min(1)
  .max(80)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
    message: 'Slug must be lowercase letters, digits, and hyphens only',
  });

const categorySchema = z.enum([
  'nfc_card',
  'review_board',
  'table_talker',
  'window_decal',
  'badge',
  'other',
]);

const priceSchema = z.number().int().min(0).max(10_000_000);
const optionalUrl = z.string().url().max(2000).optional();
const optionalUrls = z.array(z.string().url().max(2000)).max(20).optional();

export const createShopProductSchema = z.object({
  slug: slugSchema,
  sku: z.string().max(80).optional(),
  name: z.string().min(1).max(160),
  description: z.string().max(10_000).optional(),
  category: categorySchema,
  base_price_pence: priceSchema,
  primary_image_url: optionalUrl,
  gallery_image_urls: optionalUrls,
  is_active: z.boolean().optional(),
});
export type CreateShopProductInput = z.infer<typeof createShopProductSchema>;

export const updateShopProductSchema = z
  .object({
    sku: z.string().max(80).optional(),
    name: z.string().min(1).max(160).optional(),
    description: z.string().max(10_000).optional(),
    category: categorySchema.optional(),
    base_price_pence: priceSchema.optional(),
    primary_image_url: optionalUrl,
    gallery_image_urls: optionalUrls,
    is_active: z.boolean().optional(),
  })
  .strict();
export type UpdateShopProductInput = z.infer<typeof updateShopProductSchema>;
