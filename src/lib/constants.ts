/**
 * Application constants
 */

// QR Code defaults
export const QR_DEFAULTS = {
  ERROR_CORRECTION: 'M' as const,
  ERROR_CORRECTION_WITH_LOGO: 'H' as const,
  QUIET_ZONE: 4,
  MIN_QUIET_ZONE: 2,
  MAX_QUIET_ZONE: 10,
  DEFAULT_SIZE: 512,
  SIZES: [256, 512, 1024, 2048] as const,
  MAX_LOGO_RATIO: 0.25,
  WARN_LOGO_RATIO: 0.20,
};

// URL validation
export const URL_VALIDATION = {
  MAX_LENGTH: 2048,
  ALLOWED_PROTOCOLS: ['http:', 'https:'] as const,
  BLOCKED_HOSTNAMES: [
    'localhost',
    '127.0.0.1',
    '0.0.0.0',
    '::1',
    'metadata.google.internal',
    '169.254.169.254',
  ] as const,
};

// Rate limiting (requests per minute)
export const RATE_LIMITS = {
  QR_CREATE: 10,
  QR_EXPORT: 30,
  API_GENERAL: 60,
  REDIRECT: 1000,
  URL_VALIDATE: 30,
};

// Slug configuration
export const SLUG_CONFIG = {
  MIN_LENGTH: 4,
  MAX_LENGTH: 32,
  DEFAULT_LENGTH: 8,
  PATTERN: /^[a-z0-9]+(-[a-z0-9]+)*$/,
};

// Shape presets
export const MODULE_SHAPES = ['square', 'rounded', 'dots', 'diamond'] as const;
export const EYE_SHAPES = ['square', 'rounded', 'circle'] as const;

// Error correction levels
export const ERROR_CORRECTION_LEVELS = ['L', 'M', 'Q', 'H'] as const;

// Export formats
export const EXPORT_FORMATS = ['svg', 'png', 'pdf'] as const;

// PDF size presets (in mm)
export const PDF_PRESETS = {
  'sticker-50mm': { width: 50, height: 50, name: '50mm Sticker' },
  'sticker-75mm': { width: 75, height: 75, name: '75mm Sticker' },
  'sticker-100mm': { width: 100, height: 100, name: '100mm Sticker' },
  'a4': { width: 210, height: 297, name: 'A4 Page' },
} as const;
