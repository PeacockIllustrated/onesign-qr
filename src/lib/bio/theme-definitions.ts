/**
 * Bio-link theme definitions — 10 complete theme personalities.
 *
 * Each theme bundles: colors, background, fonts, button style, border radius,
 * spacing, and animation personality. Users can override individual aspects;
 * resolveFullThemeConfig() merges defaults with overrides at render time.
 */

import type {
  BioLinkTheme,
  BioThemeConfig,
  BioBackgroundVariant,
  BioSpacing,
  BioBorderRadius,
} from '@/types/bio';

// ─── 10 Theme Configs ────────────────────────────────────────────────

export const THEME_CONFIGS: Record<BioLinkTheme, BioThemeConfig> = {
  // 1. Minimal — Clean, airy
  minimal: {
    id: 'minimal',
    name: 'Minimal',
    label: 'Clean and simple',
    category: 'light',
    colors: {
      bg: '#FFFFFF',
      text: '#1A1A1A',
      textSecondary: '#6B7280',
      accent: '#1A1A1A',
      buttonBg: '#1A1A1A',
      buttonText: '#FFFFFF',
      buttonBorder: 'transparent',
      buttonHover: '#333333',
      avatarRing: '#E5E7EB',
    },
    background: {
      type: 'solid',
      css: '#FFFFFF',
    },
    fonts: {
      title: { family: 'Inter', weight: 700, googleFont: true },
      body: { family: 'Inter', weight: 400, googleFont: true },
    },
    buttonStyle: {
      variant: 'filled',
      borderRadius: '0px',
      borderWidth: '2px',
    },
    spacing: 'normal',
    borderRadius: '0px',
    animations: {
      pageEnter: 'bio-fade-in',
      linkStagger: true,
      staggerDelay: 60,
      buttonHover: 'bio-hover-lift',
      buttonClick: 'bio-click-press',
      avatarEnter: 'bio-avatar-fade',
    },
    previewColors: ['#FFFFFF', '#1A1A1A', '#6B7280'],
  },

  // 2. Midnight — Elegant, dark
  midnight: {
    id: 'midnight',
    name: 'Midnight',
    label: 'Dark and elegant',
    category: 'dark',
    colors: {
      bg: '#0F172A',
      bgGradient: 'linear-gradient(180deg, #0F172A 0%, #1E293B 100%)',
      text: '#F8FAFC',
      textSecondary: '#94A3B8',
      accent: '#818CF8',
      buttonBg: '#1E293B',
      buttonText: '#F8FAFC',
      buttonBorder: '#475569',
      buttonHover: '#334155',
      avatarRing: '#818CF8',
    },
    background: {
      type: 'gradient',
      css: 'linear-gradient(180deg, #0F172A 0%, #1E293B 100%)',
    },
    fonts: {
      title: { family: 'Playfair Display', weight: 700, googleFont: true },
      body: { family: 'DM Sans', weight: 400, googleFont: true },
    },
    buttonStyle: {
      variant: 'filled',
      borderRadius: '8px',
      borderWidth: '1px',
    },
    spacing: 'normal',
    borderRadius: '8px',
    animations: {
      pageEnter: 'bio-slide-up',
      linkStagger: true,
      staggerDelay: 80,
      buttonHover: 'bio-hover-glow',
      buttonClick: 'bio-click-press',
      avatarEnter: 'bio-avatar-fade',
    },
    previewColors: ['#0F172A', '#818CF8', '#334155'],
  },

  // 3. Gradient Sunset — Warm gradient (legacy, enhanced)
  'gradient-sunset': {
    id: 'gradient-sunset',
    name: 'Sunset',
    label: 'Warm gradient',
    category: 'light',
    colors: {
      bg: '#FDF2F8',
      bgGradient: 'linear-gradient(135deg, #FDF2F8 0%, #FEFCE8 50%, #FFF7ED 100%)',
      text: '#1F2937',
      textSecondary: '#6B7280',
      accent: '#F43F5E',
      buttonBg: '#F43F5E',
      buttonText: '#FFFFFF',
      buttonBorder: 'transparent',
      buttonHover: '#E11D48',
      avatarRing: '#F43F5E',
    },
    background: {
      type: 'gradient',
      css: 'linear-gradient(135deg, #FDF2F8 0%, #FEFCE8 50%, #FFF7ED 100%)',
    },
    fonts: {
      title: { family: 'Nunito', weight: 700, googleFont: true },
      body: { family: 'Quicksand', weight: 400, googleFont: true },
    },
    buttonStyle: {
      variant: 'filled',
      borderRadius: '9999px',
      borderWidth: '2px',
    },
    spacing: 'normal',
    borderRadius: '9999px',
    animations: {
      pageEnter: 'bio-fade-in',
      linkStagger: true,
      staggerDelay: 70,
      buttonHover: 'bio-hover-scale',
      buttonClick: 'bio-click-squish',
      avatarEnter: 'bio-avatar-pop',
    },
    previewColors: ['#FDF2F8', '#F43F5E', '#FEFCE8'],
  },

  // 4. Gradient Ocean — Cool blues (legacy, enhanced)
  'gradient-ocean': {
    id: 'gradient-ocean',
    name: 'Ocean',
    label: 'Cool blues',
    category: 'light',
    colors: {
      bg: '#EFF6FF',
      bgGradient: 'linear-gradient(135deg, #EFF6FF 0%, #F0FDFA 50%, #ECFDF5 100%)',
      text: '#1E3A5F',
      textSecondary: '#64748B',
      accent: '#0EA5E9',
      buttonBg: '#0EA5E9',
      buttonText: '#FFFFFF',
      buttonBorder: 'transparent',
      buttonHover: '#0284C7',
      avatarRing: '#0EA5E9',
    },
    background: {
      type: 'gradient',
      css: 'linear-gradient(135deg, #EFF6FF 0%, #F0FDFA 50%, #ECFDF5 100%)',
    },
    fonts: {
      title: { family: 'Outfit', weight: 600, googleFont: true },
      body: { family: 'Outfit', weight: 400, googleFont: true },
    },
    buttonStyle: {
      variant: 'filled',
      borderRadius: '12px',
      borderWidth: '2px',
    },
    spacing: 'normal',
    borderRadius: '12px',
    animations: {
      pageEnter: 'bio-slide-up',
      linkStagger: true,
      staggerDelay: 70,
      buttonHover: 'bio-hover-lift',
      buttonClick: 'bio-click-press',
      avatarEnter: 'bio-avatar-fade',
    },
    previewColors: ['#EFF6FF', '#0EA5E9', '#F0FDFA'],
  },

  // 5. Neon — Cyberpunk
  neon: {
    id: 'neon',
    name: 'Neon',
    label: 'Cyberpunk glow',
    category: 'dark',
    colors: {
      bg: '#09090B',
      text: '#FAFAFA',
      textSecondary: '#A1A1AA',
      accent: '#A3E635',
      buttonBg: '#A3E635',
      buttonText: '#09090B',
      buttonBorder: '#A3E635',
      buttonHover: '#BEF264',
      avatarRing: '#A3E635',
    },
    background: {
      type: 'pattern',
      css: '#09090B',
      overlayCSS: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(163,230,53,0.03) 2px, rgba(163,230,53,0.03) 4px)',
    },
    fonts: {
      title: { family: 'Space Grotesk', weight: 700, googleFont: true },
      body: { family: 'Space Mono', weight: 400, googleFont: true },
    },
    buttonStyle: {
      variant: 'outline',
      borderRadius: '4px',
      borderWidth: '2px',
    },
    spacing: 'normal',
    borderRadius: '4px',
    animations: {
      pageEnter: 'bio-glitch-in',
      linkStagger: true,
      staggerDelay: 50,
      buttonHover: 'bio-hover-glow',
      buttonClick: 'bio-click-pulse',
      avatarEnter: 'bio-avatar-glitch',
    },
    previewColors: ['#09090B', '#A3E635', '#A1A1AA'],
  },

  // 6. Pastel Dream — Soft, playful
  'pastel-dream': {
    id: 'pastel-dream',
    name: 'Pastel Dream',
    label: 'Soft and playful',
    category: 'light',
    colors: {
      bg: '#FDF4FF',
      bgGradient: 'linear-gradient(135deg, #FDF4FF 0%, #FFF1F2 50%, #FEF3C7 100%)',
      text: '#581C87',
      textSecondary: '#9333EA',
      accent: '#D946EF',
      buttonBg: '#D946EF',
      buttonText: '#FFFFFF',
      buttonBorder: 'transparent',
      buttonHover: '#C026D3',
      avatarRing: '#D946EF',
    },
    background: {
      type: 'gradient',
      css: 'linear-gradient(135deg, #FDF4FF 0%, #FFF1F2 50%, #FEF3C7 100%)',
    },
    fonts: {
      title: { family: 'Nunito', weight: 800, googleFont: true },
      body: { family: 'Quicksand', weight: 500, googleFont: true },
    },
    buttonStyle: {
      variant: 'filled',
      borderRadius: '9999px',
      borderWidth: '2px',
    },
    spacing: 'spacious',
    borderRadius: '9999px',
    animations: {
      pageEnter: 'bio-bounce-in',
      linkStagger: true,
      staggerDelay: 80,
      buttonHover: 'bio-hover-wobble',
      buttonClick: 'bio-click-squish',
      avatarEnter: 'bio-avatar-pop',
    },
    previewColors: ['#FDF4FF', '#D946EF', '#FFF1F2'],
  },

  // 7. Bold — Loud, punchy
  bold: {
    id: 'bold',
    name: 'Bold',
    label: 'Loud and punchy',
    category: 'light',
    colors: {
      bg: '#FEF08A',
      text: '#1C1917',
      textSecondary: '#44403C',
      accent: '#DC2626',
      buttonBg: '#DC2626',
      buttonText: '#FFFFFF',
      buttonBorder: '#1C1917',
      buttonHover: '#B91C1C',
      avatarRing: '#DC2626',
    },
    background: {
      type: 'solid',
      css: '#FEF08A',
    },
    fonts: {
      title: { family: 'Bebas Neue', weight: 400, googleFont: true },
      body: { family: 'Barlow', weight: 500, googleFont: true },
    },
    buttonStyle: {
      variant: 'filled',
      borderRadius: '12px',
      borderWidth: '3px',
    },
    spacing: 'normal',
    borderRadius: '12px',
    animations: {
      pageEnter: 'bio-scale-in',
      linkStagger: true,
      staggerDelay: 60,
      buttonHover: 'bio-hover-scale',
      buttonClick: 'bio-click-stamp',
      avatarEnter: 'bio-avatar-pop',
    },
    previewColors: ['#FEF08A', '#DC2626', '#1C1917'],
  },

  // 8. Glass — Modern, translucent
  glass: {
    id: 'glass',
    name: 'Glass',
    label: 'Modern translucent',
    category: 'dark',
    colors: {
      bg: '#1E1B4B',
      bgGradient: 'linear-gradient(135deg, #1E1B4B 0%, #312E81 50%, #3730A3 100%)',
      text: '#F8FAFC',
      textSecondary: '#C7D2FE',
      accent: '#A5B4FC',
      buttonBg: 'rgba(165,180,252,0.15)',
      buttonText: '#F8FAFC',
      buttonBorder: 'rgba(165,180,252,0.3)',
      buttonHover: 'rgba(165,180,252,0.25)',
      avatarRing: '#A5B4FC',
    },
    background: {
      type: 'gradient',
      css: 'linear-gradient(135deg, #1E1B4B 0%, #312E81 50%, #3730A3 100%)',
    },
    fonts: {
      title: { family: 'Outfit', weight: 600, googleFont: true },
      body: { family: 'Outfit', weight: 400, googleFont: true },
    },
    buttonStyle: {
      variant: 'glass',
      borderRadius: '16px',
      borderWidth: '1px',
      extraCSS: { backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)' },
    },
    spacing: 'spacious',
    borderRadius: '16px',
    animations: {
      pageEnter: 'bio-slide-up',
      linkStagger: true,
      staggerDelay: 90,
      buttonHover: 'bio-hover-shimmer',
      buttonClick: 'bio-click-press',
      avatarEnter: 'bio-avatar-fade',
    },
    previewColors: ['#1E1B4B', '#A5B4FC', '#312E81'],
  },

  // 9. Retro — Vintage, warm
  retro: {
    id: 'retro',
    name: 'Retro',
    label: 'Vintage warmth',
    category: 'light',
    colors: {
      bg: '#FFF8E7',
      text: '#1C1917',
      textSecondary: '#78716C',
      accent: '#B45309',
      buttonBg: '#1C1917',
      buttonText: '#FFF8E7',
      buttonBorder: '#1C1917',
      buttonHover: '#44403C',
      avatarRing: '#B45309',
    },
    background: {
      type: 'pattern',
      css: '#FFF8E7',
      overlayCSS: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 256 256\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'noise\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.65\' numOctaves=\'3\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23noise)\' opacity=\'0.04\'/%3E%3C/svg%3E")',
    },
    fonts: {
      title: { family: 'Silkscreen', weight: 400, googleFont: true },
      body: { family: 'VT323', weight: 400, googleFont: true },
    },
    buttonStyle: {
      variant: 'filled',
      borderRadius: '0px',
      borderWidth: '3px',
    },
    spacing: 'compact',
    borderRadius: '0px',
    animations: {
      pageEnter: 'bio-typewriter',
      linkStagger: true,
      staggerDelay: 120,
      buttonHover: 'bio-hover-none',
      buttonClick: 'bio-click-press',
      avatarEnter: 'bio-avatar-fade',
    },
    previewColors: ['#FFF8E7', '#B45309', '#1C1917'],
  },

  // 10. Nature — Earthy, organic
  nature: {
    id: 'nature',
    name: 'Nature',
    label: 'Earthy and organic',
    category: 'light',
    colors: {
      bg: '#F0FDF4',
      bgGradient: 'linear-gradient(180deg, #F0FDF4 0%, #DCFCE7 50%, #D1FAE5 100%)',
      text: '#14532D',
      textSecondary: '#166534',
      accent: '#16A34A',
      buttonBg: '#16A34A',
      buttonText: '#FFFFFF',
      buttonBorder: 'transparent',
      buttonHover: '#15803D',
      avatarRing: '#16A34A',
    },
    background: {
      type: 'gradient',
      css: 'linear-gradient(180deg, #F0FDF4 0%, #DCFCE7 50%, #D1FAE5 100%)',
    },
    fonts: {
      title: { family: 'Libre Baskerville', weight: 700, googleFont: true },
      body: { family: 'Lato', weight: 400, googleFont: true },
    },
    buttonStyle: {
      variant: 'filled',
      borderRadius: '20px',
      borderWidth: '2px',
    },
    spacing: 'spacious',
    borderRadius: '20px',
    animations: {
      pageEnter: 'bio-grow-in',
      linkStagger: true,
      staggerDelay: 100,
      buttonHover: 'bio-hover-sway',
      buttonClick: 'bio-click-press',
      avatarEnter: 'bio-avatar-pop',
    },
    previewColors: ['#F0FDF4', '#16A34A', '#DCFCE7'],
  },

  // 11. Cosmic — Dreamy, vast
  cosmic: {
    id: 'cosmic',
    name: 'Cosmic',
    label: 'Dreamy and vast',
    category: 'dark',
    colors: {
      bg: '#0C0A1D',
      bgGradient: 'linear-gradient(135deg, #0C0A1D 0%, #1E1065 50%, #2E1065 100%)',
      text: '#F5F3FF',
      textSecondary: '#C4B5FD',
      accent: '#8B5CF6',
      buttonBg: 'transparent',
      buttonText: '#F5F3FF',
      buttonBorder: '#8B5CF6',
      buttonHover: 'rgba(139,92,246,0.15)',
      avatarRing: '#8B5CF6',
    },
    background: {
      type: 'animated',
      css: 'linear-gradient(135deg, #0C0A1D 0%, #1E1065 50%, #2E1065 100%)',
      overlayCSS: 'radial-gradient(2px 2px at 20% 30%, rgba(255,255,255,0.3), transparent), radial-gradient(2px 2px at 40% 70%, rgba(255,255,255,0.2), transparent), radial-gradient(1px 1px at 60% 20%, rgba(255,255,255,0.4), transparent), radial-gradient(1px 1px at 80% 50%, rgba(255,255,255,0.15), transparent)',
    },
    fonts: {
      title: { family: 'Orbitron', weight: 700, googleFont: true },
      body: { family: 'Exo 2', weight: 400, googleFont: true },
    },
    buttonStyle: {
      variant: 'outline',
      borderRadius: '8px',
      borderWidth: '2px',
    },
    spacing: 'normal',
    borderRadius: '8px',
    animations: {
      pageEnter: 'bio-float-up',
      linkStagger: true,
      staggerDelay: 100,
      buttonHover: 'bio-hover-glow',
      buttonClick: 'bio-click-ripple',
      avatarEnter: 'bio-avatar-fade',
    },
    previewColors: ['#0C0A1D', '#8B5CF6', '#1E1065'],
  },

  // 12. Brutalist — Raw, anti-design
  brutalist: {
    id: 'brutalist',
    name: 'Brutalist',
    label: 'Raw and minimal',
    category: 'light',
    colors: {
      bg: '#FFFFFF',
      text: '#000000',
      textSecondary: '#000000',
      accent: '#000000',
      buttonBg: '#000000',
      buttonText: '#FFFFFF',
      buttonBorder: '#000000',
      buttonHover: '#333333',
      avatarRing: '#000000',
    },
    background: {
      type: 'solid',
      css: '#FFFFFF',
    },
    fonts: {
      title: { family: 'Roboto Mono', weight: 700, googleFont: true },
      body: { family: 'Roboto Mono', weight: 400, googleFont: true },
    },
    buttonStyle: {
      variant: 'filled',
      borderRadius: '0px',
      borderWidth: '3px',
    },
    spacing: 'compact',
    borderRadius: '0px',
    animations: {
      pageEnter: 'bio-fade-in',
      linkStagger: false,
      staggerDelay: 0,
      buttonHover: 'bio-hover-none',
      buttonClick: 'bio-click-press',
      avatarEnter: 'bio-avatar-fade',
    },
    previewColors: ['#FFFFFF', '#000000', '#000000'],
  },
};

// ─── Background Variants ─────────────────────────────────────────────

/** Background variants per theme. Key = theme id, value = list of alternatives. */
export const BACKGROUND_VARIANTS: Partial<Record<BioLinkTheme, BioBackgroundVariant[]>> = {
  neon: [
    {
      id: 'neon-grid',
      name: 'Grid',
      background: {
        type: 'pattern',
        css: '#09090B',
        overlayCSS:
          'linear-gradient(rgba(163,230,53,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(163,230,53,0.05) 1px, transparent 1px)',
      },
    },
    {
      id: 'neon-deep',
      name: 'Deep Black',
      background: { type: 'solid', css: '#000000' },
    },
  ],
  cosmic: [
    {
      id: 'cosmic-nebula',
      name: 'Nebula',
      background: {
        type: 'animated',
        css: 'linear-gradient(135deg, #0C0A1D 0%, #3B0764 50%, #1E1065 100%)',
        overlayCSS:
          'radial-gradient(2px 2px at 10% 20%, rgba(255,255,255,0.4), transparent), radial-gradient(1px 1px at 50% 60%, rgba(255,255,255,0.3), transparent)',
      },
    },
  ],
  glass: [
    {
      id: 'glass-rose',
      name: 'Rose Glass',
      background: {
        type: 'gradient',
        css: 'linear-gradient(135deg, #4C1D95 0%, #831843 50%, #9F1239 100%)',
      },
    },
    {
      id: 'glass-emerald',
      name: 'Emerald Glass',
      background: {
        type: 'gradient',
        css: 'linear-gradient(135deg, #064E3B 0%, #065F46 50%, #047857 100%)',
      },
    },
  ],
  bold: [
    {
      id: 'bold-blue',
      name: 'Electric Blue',
      background: { type: 'solid', css: '#3B82F6' },
    },
    {
      id: 'bold-orange',
      name: 'Blaze Orange',
      background: { type: 'solid', css: '#F97316' },
    },
  ],
};

// ─── Border Radius Map ───────────────────────────────────────────────

export const BORDER_RADIUS_MAP: Record<BioBorderRadius, string> = {
  sharp: '0px',
  rounded: '8px',
  pill: '9999px',
  soft: '16px',
  chunky: '12px',
  organic: '20px',
};

// ─── Spacing Map ─────────────────────────────────────────────────────

export const SPACING_MAP: Record<BioSpacing, { gap: string; padding: string }> = {
  compact: { gap: '0.5rem', padding: '0.75rem 1.25rem' },
  normal: { gap: '0.75rem', padding: '1rem 1.5rem' },
  spacious: { gap: '1rem', padding: '1.25rem 1.75rem' },
};

// ─── Resolution ──────────────────────────────────────────────────────

interface ThemeOverrides {
  custom_bg_color?: string | null;
  custom_text_color?: string | null;
  custom_accent_color?: string | null;
  font_title?: string | null;
  font_body?: string | null;
  border_radius?: BioBorderRadius | null;
  spacing?: BioSpacing | null;
  background_variant?: string | null;
}

/**
 * Resolve a full theme config with user overrides layered on top.
 * Returns a complete BioThemeConfig ready for rendering.
 */
export function resolveFullThemeConfig(
  themeId: BioLinkTheme,
  overrides?: ThemeOverrides
): BioThemeConfig {
  const base = THEME_CONFIGS[themeId] ?? THEME_CONFIGS.minimal;
  const resolved = structuredClone(base);

  if (!overrides) return resolved;

  // Color overrides
  if (overrides.custom_bg_color) {
    resolved.colors.bg = overrides.custom_bg_color;
    delete resolved.colors.bgGradient;
    resolved.background = { type: 'solid', css: overrides.custom_bg_color };
  }
  if (overrides.custom_text_color) {
    resolved.colors.text = overrides.custom_text_color;
  }
  if (overrides.custom_accent_color) {
    resolved.colors.accent = overrides.custom_accent_color;
    resolved.colors.buttonBg = overrides.custom_accent_color;
    resolved.colors.avatarRing = overrides.custom_accent_color;
    resolved.colors.buttonHover = overrides.custom_accent_color;
  }

  // Font overrides
  if (overrides.font_title) {
    resolved.fonts.title = { family: overrides.font_title, weight: resolved.fonts.title.weight, googleFont: true };
  }
  if (overrides.font_body) {
    resolved.fonts.body = { family: overrides.font_body, weight: resolved.fonts.body.weight, googleFont: true };
  }

  // Border radius override
  if (overrides.border_radius) {
    const r = BORDER_RADIUS_MAP[overrides.border_radius];
    resolved.borderRadius = r;
    resolved.buttonStyle.borderRadius = r;
  }

  // Spacing override
  if (overrides.spacing) {
    resolved.spacing = overrides.spacing;
  }

  // Background variant override
  if (overrides.background_variant) {
    const variants = BACKGROUND_VARIANTS[themeId];
    const variant = variants?.find((v) => v.id === overrides.background_variant);
    if (variant) {
      resolved.background = variant.background;
    }
  }

  return resolved;
}

/**
 * Build a Google Fonts CSS URL for the given font families.
 * Returns null if no Google Fonts are needed.
 */
export function buildGoogleFontsUrl(config: BioThemeConfig): string | null {
  const families = new Set<string>();

  if (config.fonts.title.googleFont) {
    families.add(`${config.fonts.title.family}:wght@${config.fonts.title.weight}`);
  }
  if (config.fonts.body.googleFont) {
    families.add(`${config.fonts.body.family}:wght@${config.fonts.body.weight}`);
  }

  if (families.size === 0) return null;

  const params = Array.from(families)
    .map((f) => `family=${encodeURIComponent(f)}`)
    .join('&');

  return `https://fonts.googleapis.com/css2?${params}&display=swap`;
}

/**
 * Convert a BioThemeConfig's colors to the legacy BioThemeVars format.
 * Used for backwards compatibility with existing components.
 */
export function themeConfigToVars(config: BioThemeConfig): Record<string, string> {
  const vars: Record<string, string> = {
    '--bio-bg': config.colors.bg,
    '--bio-text': config.colors.text,
    '--bio-text-secondary': config.colors.textSecondary,
    '--bio-accent': config.colors.accent,
    '--bio-button-bg': config.colors.buttonBg,
    '--bio-button-text': config.colors.buttonText,
    '--bio-button-border': config.colors.buttonBorder,
    '--bio-button-hover': config.colors.buttonHover,
    '--bio-avatar-ring': config.colors.avatarRing,
  };

  if (config.colors.bgGradient) {
    vars['--bio-bg-gradient'] = config.colors.bgGradient;
  }

  return vars;
}
