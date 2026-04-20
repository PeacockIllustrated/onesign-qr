import { describe, it, expect } from 'vitest';
import {
  createShopProductSchema,
  updateShopProductSchema,
} from '@/validations/shop';

describe('createShopProductSchema', () => {
  it('accepts a minimal valid payload', () => {
    const r = createShopProductSchema.safeParse({
      slug: 'standard-nfc-card',
      name: 'Standard NFC Card',
      category: 'nfc_card',
      base_price_pence: 1000,
    });
    expect(r.success).toBe(true);
  });

  it('accepts a payload with all optional fields', () => {
    const r = createShopProductSchema.safeParse({
      slug: 'review-board-a5',
      sku: 'RB-A5-BLK',
      name: 'Review Board A5',
      description: 'Matte black aluminium, QR etched.',
      category: 'review_board',
      base_price_pence: 2500,
      primary_image_url: 'https://example.com/rb.jpg',
      gallery_image_urls: [
        'https://example.com/rb-1.jpg',
        'https://example.com/rb-2.jpg',
      ],
      is_active: true,
    });
    expect(r.success).toBe(true);
  });

  it('rejects empty slug', () => {
    expect(
      createShopProductSchema.safeParse({
        slug: '',
        name: 'x',
        category: 'nfc_card',
        base_price_pence: 1,
      }).success
    ).toBe(false);
  });

  it('rejects a slug with uppercase or spaces', () => {
    expect(
      createShopProductSchema.safeParse({
        slug: 'Standard Card',
        name: 'x',
        category: 'nfc_card',
        base_price_pence: 1,
      }).success
    ).toBe(false);
  });

  it('rejects negative price', () => {
    expect(
      createShopProductSchema.safeParse({
        slug: 'x',
        name: 'x',
        category: 'nfc_card',
        base_price_pence: -1,
      }).success
    ).toBe(false);
  });

  it('rejects unknown category', () => {
    expect(
      createShopProductSchema.safeParse({
        slug: 'x',
        name: 'x',
        category: 'rocket_fuel',
        base_price_pence: 1,
      }).success
    ).toBe(false);
  });
});

describe('updateShopProductSchema', () => {
  it('accepts a partial update', () => {
    expect(
      updateShopProductSchema.safeParse({ name: 'Renamed' }).success
    ).toBe(true);
    expect(updateShopProductSchema.safeParse({}).success).toBe(true);
  });

  it('rejects a slug change (slug is create-time only)', () => {
    const r = updateShopProductSchema.safeParse({ slug: 'new-slug' });
    if (r.success) {
      expect('slug' in r.data).toBe(false);
    }
  });
});
