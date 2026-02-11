/**
 * Bio-link page theme definitions — backwards-compatible bridge.
 *
 * This module delegates to theme-definitions.ts for the full theme configs
 * and exposes the legacy BIO_THEME_DEFINITIONS, resolveThemeVars(), and
 * getButtonStyleCSS() APIs so existing components continue to work.
 */

import type { BioLinkTheme, BioThemeDefinition, BioThemeVars } from '@/types/bio';
import { THEME_CONFIGS, themeConfigToVars } from '@/lib/bio/theme-definitions';

// ─── Legacy Theme Definitions (auto-generated from THEME_CONFIGS) ────

function configToDefinition(id: BioLinkTheme): BioThemeDefinition {
  const cfg = THEME_CONFIGS[id];
  const vars: BioThemeVars = {
    '--bio-bg': cfg.colors.bg,
    '--bio-text': cfg.colors.text,
    '--bio-text-secondary': cfg.colors.textSecondary,
    '--bio-accent': cfg.colors.accent,
    '--bio-button-bg': cfg.colors.buttonBg,
    '--bio-button-text': cfg.colors.buttonText,
    '--bio-button-border': cfg.colors.buttonBorder,
    '--bio-button-hover': cfg.colors.buttonHover,
    '--bio-avatar-ring': cfg.colors.avatarRing,
  };

  if (cfg.colors.bgGradient) {
    vars['--bio-bg-gradient'] = cfg.colors.bgGradient;
  }

  return {
    id,
    name: cfg.name,
    label: cfg.label,
    vars,
    previewColors: cfg.previewColors,
  };
}

const ALL_THEMES: BioLinkTheme[] = [
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
];

export const BIO_THEME_DEFINITIONS: Record<BioLinkTheme, BioThemeDefinition> =
  Object.fromEntries(ALL_THEMES.map((id) => [id, configToDefinition(id)])) as Record<
    BioLinkTheme,
    BioThemeDefinition
  >;

// ─── Resolve theme vars (legacy API) ─────────────────────────────────

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
    vars['--bio-accent'] = overrides.custom_accent_color;
    vars['--bio-button-bg'] = overrides.custom_accent_color;
    vars['--bio-avatar-ring'] = overrides.custom_accent_color;
    vars['--bio-button-hover'] = overrides.custom_accent_color;
  }

  return vars;
}

// ─── Button style CSS (legacy API) ───────────────────────────────────

/**
 * Get CSS for button style variant.
 *
 * Uses `--bio-accent` for outline mode (guaranteed to be a visible color),
 * and `--bio-button-bg` / `--bio-button-text` for filled and shadow modes.
 */
export function getButtonStyleCSS(style: 'filled' | 'outline' | 'shadow'): React.CSSProperties {
  switch (style) {
    case 'outline':
      return {
        backgroundColor: 'transparent',
        color: 'var(--bio-accent)',
        border: '2px solid var(--bio-accent)',
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
