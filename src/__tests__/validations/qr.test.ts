import { describe, it, expect } from 'vitest';
import {
  isValidUUID,
  createQRSchema,
  updateStyleSchema,
} from '@/validations/qr';

describe('isValidUUID', () => {
  it('accepts a valid UUID v4', () => {
    expect(isValidUUID('550e8400-e29b-41d4-a716-446655440000')).toBe(true);
  });

  it('accepts another valid UUID v4', () => {
    expect(isValidUUID('f47ac10b-58cc-4372-a567-0e02b2c3d479')).toBe(true);
  });

  it('accepts uppercase UUID v4', () => {
    expect(isValidUUID('F47AC10B-58CC-4372-A567-0E02B2C3D479')).toBe(true);
  });

  it('rejects an empty string', () => {
    expect(isValidUUID('')).toBe(false);
  });

  it('rejects a random string', () => {
    expect(isValidUUID('not-a-uuid')).toBe(false);
  });

  it('rejects a UUID with wrong version digit', () => {
    // Version digit (position 13) must be 4 for UUID v4
    expect(isValidUUID('550e8400-e29b-31d4-a716-446655440000')).toBe(false);
  });

  it('rejects a UUID with wrong variant digit', () => {
    // Variant digit (position 19) must be 8, 9, a, or b
    expect(isValidUUID('550e8400-e29b-41d4-c716-446655440000')).toBe(false);
  });

  it('rejects a UUID with extra characters', () => {
    expect(isValidUUID('550e8400-e29b-41d4-a716-446655440000x')).toBe(false);
  });
});

describe('createQRSchema', () => {
  const validInput = {
    name: 'My QR Code',
    destination_url: 'https://example.com',
  };

  it('accepts valid minimal input', () => {
    const result = createQRSchema.safeParse(validInput);
    expect(result.success).toBe(true);
  });

  it('accepts valid input with all optional fields', () => {
    const result = createQRSchema.safeParse({
      ...validInput,
      mode: 'direct',
      slug: 'my-slug',
      analytics_enabled: false,
      style: {
        foreground_color: '#FF0000',
        background_color: '#00FF00',
        error_correction: 'H',
        quiet_zone: 6,
        module_shape: 'rounded',
        eye_shape: 'circle',
      },
    });
    expect(result.success).toBe(true);
  });

  it('rejects name that is too long (>100 characters)', () => {
    const result = createQRSchema.safeParse({
      ...validInput,
      name: 'a'.repeat(101),
    });
    expect(result.success).toBe(false);
  });

  it('rejects empty name', () => {
    const result = createQRSchema.safeParse({
      ...validInput,
      name: '',
    });
    expect(result.success).toBe(false);
  });

  it('rejects empty destination_url', () => {
    const result = createQRSchema.safeParse({
      ...validInput,
      destination_url: '',
    });
    expect(result.success).toBe(false);
  });

  it('rejects destination_url that is too long (>2048 characters)', () => {
    const result = createQRSchema.safeParse({
      ...validInput,
      destination_url: 'https://example.com/' + 'a'.repeat(2048),
    });
    expect(result.success).toBe(false);
  });

  it('rejects invalid hex color in style', () => {
    const result = createQRSchema.safeParse({
      ...validInput,
      style: {
        foreground_color: 'red',
      },
    });
    expect(result.success).toBe(false);
  });

  it('rejects hex color without # prefix', () => {
    const result = createQRSchema.safeParse({
      ...validInput,
      style: {
        foreground_color: '000000',
      },
    });
    expect(result.success).toBe(false);
  });

  it('rejects hex color with only 3 digits', () => {
    const result = createQRSchema.safeParse({
      ...validInput,
      style: {
        foreground_color: '#000',
      },
    });
    expect(result.success).toBe(false);
  });

  it('rejects invalid mode', () => {
    const result = createQRSchema.safeParse({
      ...validInput,
      mode: 'invalid',
    });
    expect(result.success).toBe(false);
  });

  it('trims whitespace from name', () => {
    const result = createQRSchema.safeParse({
      ...validInput,
      name: '  My QR Code  ',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.name).toBe('My QR Code');
    }
  });

  it('applies default values for mode and analytics_enabled', () => {
    const result = createQRSchema.safeParse(validInput);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.mode).toBe('managed');
      expect(result.data.analytics_enabled).toBe(true);
    }
  });
});

describe('updateStyleSchema', () => {
  it('accepts valid partial style update', () => {
    const result = updateStyleSchema.safeParse({
      foreground_color: '#FF0000',
    });
    expect(result.success).toBe(true);
  });

  it('accepts empty object (all fields are optional)', () => {
    const result = updateStyleSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it('accepts valid full style update', () => {
    const result = updateStyleSchema.safeParse({
      foreground_color: '#000000',
      background_color: '#FFFFFF',
      error_correction: 'H',
      quiet_zone: 4,
      module_shape: 'dots',
      eye_shape: 'rounded',
    });
    expect(result.success).toBe(true);
  });

  it('rejects invalid hex color', () => {
    const result = updateStyleSchema.safeParse({
      foreground_color: 'invalid-color',
    });
    expect(result.success).toBe(false);
  });

  it('rejects invalid error correction level', () => {
    const result = updateStyleSchema.safeParse({
      error_correction: 'X',
    });
    expect(result.success).toBe(false);
  });

  it('rejects invalid module shape', () => {
    const result = updateStyleSchema.safeParse({
      module_shape: 'star',
    });
    expect(result.success).toBe(false);
  });

  it('rejects quiet_zone below minimum', () => {
    const result = updateStyleSchema.safeParse({
      quiet_zone: 1,
    });
    expect(result.success).toBe(false);
  });

  it('rejects quiet_zone above maximum', () => {
    const result = updateStyleSchema.safeParse({
      quiet_zone: 11,
    });
    expect(result.success).toBe(false);
  });
});
