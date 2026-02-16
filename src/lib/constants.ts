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
  MAX_LOGO_RATIO: 0.30,
  MIN_LOGO_RATIO: 0.15,
  DEFAULT_LOGO_RATIO: 0.20,
  WARN_LOGO_RATIO: 0.25,
  LOGO_MODE: 'none' as const,
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
  BIO_CREATE: 10,
  BIO_TRACK: 1000,
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

// Bio-link page defaults
export const BIO_DEFAULTS = {
  MAX_LINKS_PER_PAGE: 10,
  MAX_BLOCKS_PER_PAGE: 50,
  MAX_BIO_LENGTH: 300,
  MAX_TITLE_LENGTH: 100,
  SLUG_MIN_LENGTH: 3,
  SLUG_MAX_LENGTH: 40,
  GRID_COLUMNS: 4,
  GRID_ROW_HEIGHT: 80,
  GRID_GAP: 8,
};

// Social platform definitions for social_icons blocks
export const SOCIAL_PLATFORMS = [
  { id: 'twitter', label: 'X / Twitter', icon: 'twitter' },
  { id: 'instagram', label: 'Instagram', icon: 'instagram' },
  { id: 'facebook', label: 'Facebook', icon: 'facebook' },
  { id: 'tiktok', label: 'TikTok', icon: 'tiktok' },
  { id: 'youtube', label: 'YouTube', icon: 'youtube' },
  { id: 'linkedin', label: 'LinkedIn', icon: 'linkedin' },
  { id: 'github', label: 'GitHub', icon: 'github' },
  { id: 'threads', label: 'Threads', icon: 'threads' },
  { id: 'discord', label: 'Discord', icon: 'discord' },
  { id: 'spotify', label: 'Spotify', icon: 'spotify' },
  { id: 'twitch', label: 'Twitch', icon: 'twitch' },
  { id: 'email', label: 'Email', icon: 'mail' },
  { id: 'website', label: 'Website', icon: 'globe' },
] as const;

// Bio-link themes
export const BIO_THEMES = [
  'minimal',
  'midnight',
  'gradient-sunset',
  'gradient-ocean',
  'neon',
  'pastel-dream',
  'bold',
  'glass',
  'retro',
  'nature',
  'cosmic',
  'brutalist',
] as const;

// Bio-link button styles
export const BIO_BUTTON_STYLES = ['filled', 'outline', 'shadow'] as const;

// Contact card layout options
export const CONTACT_CARD_LAYOUTS = [
  { id: 'centered', label: 'Centered', description: 'Avatar centered, name below' },
  { id: 'left-aligned', label: 'Left Aligned', description: 'Avatar left, info right' },
  { id: 'split', label: 'Split', description: 'Cover banner with overlapping avatar' },
  { id: 'minimal', label: 'Minimal', description: 'Typography focused, no avatar' },
  { id: 'cover', label: 'Cover', description: 'Full-width hero with overlay' },
] as const;
