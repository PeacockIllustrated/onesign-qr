import { describe, it, expect } from 'vitest';
import { blockContentSchemas } from '@/validations/bio';

// ─── Helpers ─────────────────────────────────────────────────────────

function parse(blockType: string, data: unknown) {
  const schema = blockContentSchemas[blockType];
  if (!schema) throw new Error(`No schema found for block type: ${blockType}`);
  return schema.safeParse(data);
}

// ─── Style Overrides ─────────────────────────────────────────────────

describe('styleOverridesSchema', () => {
  it('accepts valid style_overrides on a heading block', () => {
    const result = parse('heading', {
      text: 'Hello',
      level: 1,
      style_overrides: {
        bg_color: '#FF0000',
        border_radius: 'pill',
        padding: 'md',
        shadow: 'lg',
      },
    });
    expect(result.success).toBe(true);
  });

  it('accepts style_overrides with only some fields', () => {
    const result = parse('text', {
      text: 'Some text',
      style_overrides: {
        padding: 'sm',
      },
    });
    expect(result.success).toBe(true);
  });

  it('accepts block content without style_overrides', () => {
    const result = parse('heading', {
      text: 'Hello',
      level: 2,
    });
    expect(result.success).toBe(true);
  });

  it('rejects invalid bg_color in style_overrides', () => {
    const result = parse('heading', {
      text: 'Hello',
      level: 1,
      style_overrides: {
        bg_color: 'not-a-color',
      },
    });
    expect(result.success).toBe(false);
  });

  it('rejects invalid border_radius in style_overrides', () => {
    const result = parse('heading', {
      text: 'Hello',
      level: 1,
      style_overrides: {
        border_radius: 'banana',
      },
    });
    expect(result.success).toBe(false);
  });

  it('rejects invalid padding in style_overrides', () => {
    const result = parse('heading', {
      text: 'Hello',
      level: 1,
      style_overrides: {
        padding: 'xl',
      },
    });
    expect(result.success).toBe(false);
  });

  it('rejects invalid shadow in style_overrides', () => {
    const result = parse('heading', {
      text: 'Hello',
      level: 1,
      style_overrides: {
        shadow: 'xl',
      },
    });
    expect(result.success).toBe(false);
  });

  it('accepts style_overrides on link block', () => {
    const result = parse('link', {
      title: 'My Link',
      url: 'https://example.com',
      style_overrides: { shadow: 'sm' },
    });
    expect(result.success).toBe(true);
  });

  it('accepts style_overrides on image block', () => {
    const result = parse('image', {
      src: 'https://example.com/img.png',
      style_overrides: { border: '1px solid red', border_radius: 'rounded' },
    });
    expect(result.success).toBe(true);
  });

  it('accepts style_overrides on divider block', () => {
    const result = parse('divider', {
      style: 'dashed',
      style_overrides: { bg_color: '#000000' },
    });
    expect(result.success).toBe(true);
  });

  it('accepts style_overrides on spacer block', () => {
    const result = parse('spacer', {
      style_overrides: { padding: 'lg' },
    });
    expect(result.success).toBe(true);
  });

  it('accepts style_overrides on spotify_embed block', () => {
    const result = parse('spotify_embed', {
      spotify_url: 'https://open.spotify.com/track/123',
      embed_type: 'track',
      style_overrides: { shadow: 'md' },
    });
    expect(result.success).toBe(true);
  });

  it('accepts style_overrides on youtube_embed block', () => {
    const result = parse('youtube_embed', {
      video_url: 'https://youtube.com/watch?v=123',
      style_overrides: { border_radius: 'soft' },
    });
    expect(result.success).toBe(true);
  });

  it('accepts style_overrides on map block', () => {
    const result = parse('map', {
      query: 'New York',
      style_overrides: { padding: 'sm', shadow: 'none' },
    });
    expect(result.success).toBe(true);
  });

  it('accepts style_overrides on social_icons block', () => {
    const result = parse('social_icons', {
      icons: [{ platform: 'twitter', url: 'https://twitter.com/test' }],
      style_overrides: { bg_color: '#FFFFFF' },
    });
    expect(result.success).toBe(true);
  });
});

// ─── Countdown Content Schema ────────────────────────────────────────

describe('countdownContentSchema', () => {
  it('accepts valid minimal countdown', () => {
    const result = parse('countdown', {
      target_datetime: '2025-12-31T23:59:59Z',
    });
    expect(result.success).toBe(true);
  });

  it('accepts countdown with all optional fields', () => {
    const result = parse('countdown', {
      target_datetime: '2025-12-31T23:59:59Z',
      label: 'New Year',
      expired_message: 'Happy New Year!',
      style: 'large',
      style_overrides: { bg_color: '#112233', padding: 'lg' },
    });
    expect(result.success).toBe(true);
  });

  it('rejects countdown without target_datetime', () => {
    const result = parse('countdown', {});
    expect(result.success).toBe(false);
  });

  it('rejects countdown with empty target_datetime', () => {
    const result = parse('countdown', { target_datetime: '' });
    expect(result.success).toBe(false);
  });

  it('rejects countdown with invalid style enum', () => {
    const result = parse('countdown', {
      target_datetime: '2025-12-31T23:59:59Z',
      style: 'tiny',
    });
    expect(result.success).toBe(false);
  });

  it('rejects countdown with label exceeding max length', () => {
    const result = parse('countdown', {
      target_datetime: '2025-12-31T23:59:59Z',
      label: 'a'.repeat(101),
    });
    expect(result.success).toBe(false);
  });

  it('rejects countdown with expired_message exceeding max length', () => {
    const result = parse('countdown', {
      target_datetime: '2025-12-31T23:59:59Z',
      expired_message: 'a'.repeat(201),
    });
    expect(result.success).toBe(false);
  });
});

// ─── Payment Link Content Schema ─────────────────────────────────────

describe('paymentLinkContentSchema', () => {
  it('accepts valid minimal payment link', () => {
    const result = parse('payment_link', {
      platform: 'paypal',
      url: 'https://paypal.me/test',
    });
    expect(result.success).toBe(true);
  });

  it('accepts payment link with all optional fields', () => {
    const result = parse('payment_link', {
      platform: 'stripe',
      url: 'https://buy.stripe.com/test',
      display_text: 'Support me',
      suggested_amounts: ['5', '10', '25'],
      style_overrides: { shadow: 'md' },
    });
    expect(result.success).toBe(true);
  });

  it('accepts all valid platform values', () => {
    const platforms = ['paypal', 'venmo', 'cashapp', 'stripe', 'buymeacoffee', 'ko-fi', 'custom'];
    for (const platform of platforms) {
      const result = parse('payment_link', {
        platform,
        url: 'https://example.com/pay',
      });
      expect(result.success, `platform "${platform}" should be valid`).toBe(true);
    }
  });

  it('rejects payment link without platform', () => {
    const result = parse('payment_link', {
      url: 'https://example.com/pay',
    });
    expect(result.success).toBe(false);
  });

  it('rejects payment link without url', () => {
    const result = parse('payment_link', {
      platform: 'paypal',
    });
    expect(result.success).toBe(false);
  });

  it('rejects payment link with empty url', () => {
    const result = parse('payment_link', {
      platform: 'paypal',
      url: '',
    });
    expect(result.success).toBe(false);
  });

  it('rejects payment link with invalid platform', () => {
    const result = parse('payment_link', {
      platform: 'bitcoin',
      url: 'https://example.com',
    });
    expect(result.success).toBe(false);
  });

  it('rejects payment link with too many suggested_amounts', () => {
    const result = parse('payment_link', {
      platform: 'paypal',
      url: 'https://paypal.me/test',
      suggested_amounts: ['1', '2', '3', '4', '5', '6'],
    });
    expect(result.success).toBe(false);
  });

  it('rejects payment link with too long display_text', () => {
    const result = parse('payment_link', {
      platform: 'paypal',
      url: 'https://paypal.me/test',
      display_text: 'a'.repeat(101),
    });
    expect(result.success).toBe(false);
  });

  it('rejects payment link with too long url', () => {
    const result = parse('payment_link', {
      platform: 'paypal',
      url: 'https://paypal.me/' + 'a'.repeat(2048),
    });
    expect(result.success).toBe(false);
  });
});

// ─── Gallery Content Schema ──────────────────────────────────────────

describe('galleryContentSchema', () => {
  it('accepts valid minimal gallery (grid mode)', () => {
    const result = parse('gallery', {
      display_mode: 'grid',
      images: [{ storage_path: '/images/photo1.jpg' }],
    });
    expect(result.success).toBe(true);
  });

  it('accepts valid gallery in carousel mode with all fields', () => {
    const result = parse('gallery', {
      display_mode: 'carousel',
      columns: 3,
      images: [
        { storage_path: '/images/photo1.jpg', caption: 'Photo 1', link_url: 'https://example.com' },
        { storage_path: '/images/photo2.jpg', caption: null, link_url: null },
      ],
      style_overrides: { border_radius: 'rounded' },
    });
    expect(result.success).toBe(true);
  });

  it('accepts gallery with empty images array', () => {
    const result = parse('gallery', {
      display_mode: 'grid',
      images: [],
    });
    expect(result.success).toBe(true);
  });

  it('rejects gallery without display_mode', () => {
    const result = parse('gallery', {
      images: [{ storage_path: '/images/photo1.jpg' }],
    });
    expect(result.success).toBe(false);
  });

  it('rejects gallery without images', () => {
    const result = parse('gallery', {
      display_mode: 'grid',
    });
    expect(result.success).toBe(false);
  });

  it('rejects gallery with invalid display_mode', () => {
    const result = parse('gallery', {
      display_mode: 'masonry',
      images: [],
    });
    expect(result.success).toBe(false);
  });

  it('rejects gallery with invalid columns value', () => {
    const result = parse('gallery', {
      display_mode: 'grid',
      columns: 4,
      images: [],
    });
    expect(result.success).toBe(false);
  });

  it('rejects gallery with more than 12 images', () => {
    const images = Array.from({ length: 13 }, (_, i) => ({
      storage_path: `/images/photo${i}.jpg`,
    }));
    const result = parse('gallery', {
      display_mode: 'grid',
      images,
    });
    expect(result.success).toBe(false);
  });

  it('accepts gallery with exactly 12 images', () => {
    const images = Array.from({ length: 12 }, (_, i) => ({
      storage_path: `/images/photo${i}.jpg`,
    }));
    const result = parse('gallery', {
      display_mode: 'grid',
      images,
    });
    expect(result.success).toBe(true);
  });

  it('rejects gallery image with empty storage_path', () => {
    const result = parse('gallery', {
      display_mode: 'grid',
      images: [{ storage_path: '' }],
    });
    expect(result.success).toBe(false);
  });

  it('rejects gallery image with too-long caption', () => {
    const result = parse('gallery', {
      display_mode: 'grid',
      images: [{ storage_path: '/img.jpg', caption: 'a'.repeat(201) }],
    });
    expect(result.success).toBe(false);
  });
});

// ─── Contact Form Content Schema ─────────────────────────────────────

describe('contactFormContentSchema', () => {
  it('accepts valid minimal contact form', () => {
    const result = parse('contact_form', {
      fields: ['name', 'email'],
    });
    expect(result.success).toBe(true);
  });

  it('accepts contact form with all optional fields', () => {
    const result = parse('contact_form', {
      form_title: 'Get in Touch',
      fields: ['name', 'email', 'message', 'phone', 'subject'],
      success_message: 'Thanks for reaching out!',
      notify_email: true,
      style_overrides: { padding: 'lg', bg_color: '#FAFAFA' },
    });
    expect(result.success).toBe(true);
  });

  it('rejects contact form without fields', () => {
    const result = parse('contact_form', {
      form_title: 'Contact',
    });
    expect(result.success).toBe(false);
  });

  it('rejects contact form with empty fields array', () => {
    const result = parse('contact_form', {
      fields: [],
    });
    expect(result.success).toBe(false);
  });

  it('rejects contact form with invalid field name', () => {
    const result = parse('contact_form', {
      fields: ['name', 'address'],
    });
    expect(result.success).toBe(false);
  });

  it('rejects contact form with too long form_title', () => {
    const result = parse('contact_form', {
      form_title: 'a'.repeat(101),
      fields: ['email'],
    });
    expect(result.success).toBe(false);
  });

  it('rejects contact form with too long success_message', () => {
    const result = parse('contact_form', {
      fields: ['email'],
      success_message: 'a'.repeat(301),
    });
    expect(result.success).toBe(false);
  });

  it('accepts all valid field values individually', () => {
    const validFields = ['name', 'email', 'message', 'phone', 'subject'] as const;
    for (const field of validFields) {
      const result = parse('contact_form', {
        fields: [field],
      });
      expect(result.success, `field "${field}" should be valid`).toBe(true);
    }
  });
});

// ─── Schema Registry ─────────────────────────────────────────────────

describe('blockContentSchemas registry', () => {
  it('has entries for all 14 block types', () => {
    const expectedTypes = [
      'link', 'heading', 'text', 'image', 'social_icons',
      'divider', 'spacer', 'spotify_embed', 'youtube_embed', 'map',
      'contact_form', 'gallery', 'countdown', 'payment_link',
    ];
    for (const type of expectedTypes) {
      expect(blockContentSchemas[type], `schema for "${type}" should exist`).toBeDefined();
    }
  });
});
