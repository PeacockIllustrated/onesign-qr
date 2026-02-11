import type { BioLinkTheme, BioThemeDefinition, BioThemeVars } from '@/types/bio';

/**
 * Bio-link page theme definitions.
 *
 * Each theme provides CSS custom properties that are injected as inline styles
 * on the public bio page. Custom color overrides take precedence.
 */

export const BIO_THEME_DEFINITIONS: Record<BioLinkTheme, BioThemeDefinition> = {
  minimal: {
    id: 'minimal',
    name: 'Minimal',
    label: 'Clean and simple',
    vars: {
      '--bio-bg': '#FFFFFF',
      '--bio-text': '#1A1A1A',
      '--bio-text-secondary': '#6B7280',
      '--bio-button-bg': '#1A1A1A',
      '--bio-button-text': '#FFFFFF',
      '--bio-button-border': 'transparent',
      '--bio-button-hover': '#333333',
      '--bio-avatar-ring': '#E5E7EB',
    },
    previewColors: ['#FFFFFF', '#1A1A1A', '#6B7280'],
  },
  midnight: {
    id: 'midnight',
    name: 'Midnight',
    label: 'Dark and elegant',
    vars: {
      '--bio-bg': '#0F172A',
      '--bio-text': '#F8FAFC',
      '--bio-text-secondary': '#94A3B8',
      '--bio-button-bg': '#1E293B',
      '--bio-button-text': '#F8FAFC',
      '--bio-button-border': '#334155',
      '--bio-button-hover': '#334155',
      '--bio-avatar-ring': '#334155',
    },
    previewColors: ['#0F172A', '#F8FAFC', '#334155'],
  },
  'gradient-sunset': {
    id: 'gradient-sunset',
    name: 'Sunset',
    label: 'Warm gradient',
    vars: {
      '--bio-bg': '#FDF2F8',
      '--bio-bg-gradient': 'linear-gradient(135deg, #FDF2F8 0%, #FEFCE8 50%, #FFF7ED 100%)',
      '--bio-text': '#1F2937',
      '--bio-text-secondary': '#6B7280',
      '--bio-button-bg': '#F43F5E',
      '--bio-button-text': '#FFFFFF',
      '--bio-button-border': 'transparent',
      '--bio-button-hover': '#E11D48',
      '--bio-avatar-ring': '#F43F5E',
    },
    previewColors: ['#FDF2F8', '#F43F5E', '#FEFCE8'],
  },
  'gradient-ocean': {
    id: 'gradient-ocean',
    name: 'Ocean',
    label: 'Cool blues',
    vars: {
      '--bio-bg': '#EFF6FF',
      '--bio-bg-gradient': 'linear-gradient(135deg, #EFF6FF 0%, #F0FDFA 50%, #ECFDF5 100%)',
      '--bio-text': '#1E3A5F',
      '--bio-text-secondary': '#64748B',
      '--bio-button-bg': '#0EA5E9',
      '--bio-button-text': '#FFFFFF',
      '--bio-button-border': 'transparent',
      '--bio-button-hover': '#0284C7',
      '--bio-avatar-ring': '#0EA5E9',
    },
    previewColors: ['#EFF6FF', '#0EA5E9', '#F0FDFA'],
  },
  neon: {
    id: 'neon',
    name: 'Neon',
    label: 'Dark with neon accents',
    vars: {
      '--bio-bg': '#09090B',
      '--bio-text': '#FAFAFA',
      '--bio-text-secondary': '#A1A1AA',
      '--bio-button-bg': 'transparent',
      '--bio-button-text': '#A3E635',
      '--bio-button-border': '#A3E635',
      '--bio-button-hover': '#A3E635',
      '--bio-avatar-ring': '#A3E635',
    },
    previewColors: ['#09090B', '#A3E635', '#A1A1AA'],
  },
};

/**
 * Resolve theme CSS variables with optional custom color overrides.
 */
export function resolveThemeVars(
  theme: BioLinkTheme,
  overrides?: {
    custom_bg_color?: string | null;
    custom_text_color?: string | null;
    custom_accent_color?: string | null;
  }
): BioThemeVars {
  const base = BIO_THEME_DEFINITIONS[theme]?.vars ?? BIO_THEME_DEFINITIONS.minimal.vars;
  const vars = { ...base };

  if (overrides?.custom_bg_color) {
    vars['--bio-bg'] = overrides.custom_bg_color;
    delete vars['--bio-bg-gradient'];
  }
  if (overrides?.custom_text_color) {
    vars['--bio-text'] = overrides.custom_text_color;
  }
  if (overrides?.custom_accent_color) {
    vars['--bio-button-bg'] = overrides.custom_accent_color;
    vars['--bio-avatar-ring'] = overrides.custom_accent_color;
    vars['--bio-button-hover'] = overrides.custom_accent_color;
  }

  return vars;
}

/**
 * Get CSS for button style variant.
 */
export function getButtonStyleCSS(style: 'filled' | 'outline' | 'shadow'): React.CSSProperties {
  switch (style) {
    case 'outline':
      return {
        backgroundColor: 'transparent',
        color: 'var(--bio-button-bg)',
        border: '2px solid var(--bio-button-bg)',
      };
    case 'shadow':
      return {
        backgroundColor: 'var(--bio-button-bg)',
        color: 'var(--bio-button-text)',
        border: '2px solid transparent',
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1)',
      };
    case 'filled':
    default:
      return {
        backgroundColor: 'var(--bio-button-bg)',
        color: 'var(--bio-button-text)',
        border: '2px solid var(--bio-button-border)',
      };
  }
}
