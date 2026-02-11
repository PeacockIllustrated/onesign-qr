/**
 * Bio-link page related type definitions
 */

import type { DeviceType } from './qr';

// Bio-link theme options (10 total)
export type BioLinkTheme =
  | 'minimal'
  | 'midnight'
  | 'gradient-sunset'
  | 'gradient-ocean'
  | 'neon'
  | 'pastel-dream'
  | 'bold'
  | 'glass'
  | 'retro'
  | 'nature'
  | 'cosmic'
  | 'brutalist';

// Bio-link button style options
export type BioLinkButtonStyle = 'filled' | 'outline' | 'shadow';

// Bio-link icon type
export type BioLinkIconType = 'emoji' | 'image' | 'favicon';

// Bio-link spacing options
export type BioSpacing = 'compact' | 'normal' | 'spacious';

// Bio-link border radius presets
export type BioBorderRadius = 'sharp' | 'rounded' | 'pill' | 'soft' | 'chunky' | 'organic';

// Bio-link audit actions
export type BioLinkAuditAction =
  | 'created'
  | 'updated'
  | 'link_added'
  | 'link_updated'
  | 'link_removed'
  | 'link_reordered'
  | 'theme_changed'
  | 'deactivated'
  | 'reactivated'
  | 'deleted';

// ─── Theme Configuration Types ───────────────────────────────────────

/** Font configuration for a theme */
export interface BioFontConfig {
  family: string;
  weight: number;
  googleFont: boolean;
}

/** Background configuration for a theme */
export interface BioBackgroundConfig {
  type: 'solid' | 'gradient' | 'pattern' | 'animated';
  css: string;
  overlayCSS?: string;
}

/** Button style configuration for a theme */
export interface BioButtonStyleConfig {
  variant: 'filled' | 'outline' | 'glass';
  borderRadius: string;
  borderWidth: string;
  extraCSS?: React.CSSProperties;
}

/** Animation configuration for a theme */
export interface BioAnimationConfig {
  pageEnter: string;
  linkStagger: boolean;
  staggerDelay: number;
  buttonHover: string;
  buttonClick: string;
  avatarEnter: string;
}

/** Background variant definition */
export interface BioBackgroundVariant {
  id: string;
  name: string;
  background: BioBackgroundConfig;
}

/**
 * Complete theme configuration.
 * Each theme is a full design system: colors + background + fonts + buttons + spacing + animations.
 */
export interface BioThemeConfig {
  id: BioLinkTheme;
  name: string;
  label: string;
  category: 'light' | 'dark';

  colors: {
    bg: string;
    bgGradient?: string;
    text: string;
    textSecondary: string;
    accent: string;
    buttonBg: string;
    buttonText: string;
    buttonBorder: string;
    buttonHover: string;
    avatarRing: string;
  };

  background: BioBackgroundConfig;

  fonts: {
    title: BioFontConfig;
    body: BioFontConfig;
  };

  buttonStyle: BioButtonStyleConfig;

  spacing: BioSpacing;
  borderRadius: string;

  animations: BioAnimationConfig;

  previewColors: [string, string, string];
}

/**
 * Bio-link page database record
 */
export interface BioLinkPage {
  id: string;
  owner_id: string;
  title: string;
  bio: string | null;
  slug: string;
  avatar_storage_path: string | null;
  theme: BioLinkTheme;
  custom_bg_color: string | null;
  custom_text_color: string | null;
  custom_accent_color: string | null;
  button_style: BioLinkButtonStyle;
  font_title: string | null;
  font_body: string | null;
  border_radius: BioBorderRadius | null;
  spacing: BioSpacing | null;
  background_variant: string | null;
  favicon_storage_path: string | null;
  is_active: boolean;
  analytics_enabled: boolean;
  total_views: number;
  last_viewed_at: string | null;
  qr_code_id: string | null;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Bio-link item (a single link) database record
 */
export interface BioLinkItem {
  id: string;
  page_id: string;
  title: string;
  url: string;
  icon: string | null;
  icon_type: BioLinkIconType | null;
  icon_url: string | null;
  icon_bg_color: string | null;
  show_icon: boolean;
  sort_order: number;
  is_enabled: boolean;
  total_clicks: number;
  created_at: string;
  updated_at: string;
}

/**
 * Bio-link view event database record
 */
export interface BioLinkViewEvent {
  id: string;
  page_id: string;
  viewed_at: string;
  country_code: string | null;
  region: string | null;
  device_type: DeviceType;
  os_family: string | null;
  browser_family: string | null;
  referrer_domain: string | null;
  ip_hash: string | null;
}

/**
 * Bio-link click event database record
 */
export interface BioLinkClickEvent {
  id: string;
  item_id: string;
  page_id: string;
  clicked_at: string;
  country_code: string | null;
  device_type: DeviceType;
  ip_hash: string | null;
}

/**
 * Bio-link audit log database record
 */
export interface BioLinkAuditLog {
  id: string;
  page_id: string;
  actor_id: string | null;
  action: BioLinkAuditAction;
  previous_value: Record<string, unknown> | null;
  new_value: Record<string, unknown> | null;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
}

/**
 * Bio-link page with items (joined)
 */
export interface BioLinkPageWithItems extends BioLinkPage {
  items: BioLinkItem[];
}

/**
 * Bio-link analytics summary
 */
export interface BioLinkAnalyticsSummary {
  total_views: number;
  views_today: number;
  views_this_week: number;
  views_this_month: number;
  links: Array<{
    id: string;
    title: string;
    total_clicks: number;
    clicks_this_week: number;
  }>;
  views_by_day: Array<{ date: string; count: number }>;
  top_countries: Array<{ country: string; count: number }>;
  top_devices: Array<{ device: DeviceType; count: number }>;
}

/**
 * Theme CSS custom properties (legacy, used by resolveThemeVars)
 */
export interface BioThemeVars {
  '--bio-bg': string;
  '--bio-bg-gradient'?: string;
  '--bio-text': string;
  '--bio-text-secondary': string;
  '--bio-accent': string;
  '--bio-button-bg': string;
  '--bio-button-text': string;
  '--bio-button-border': string;
  '--bio-button-hover': string;
  '--bio-avatar-ring': string;
}

/**
 * Theme definition (legacy, kept for backwards compat)
 */
export interface BioThemeDefinition {
  id: BioLinkTheme;
  name: string;
  label: string;
  vars: BioThemeVars;
  previewColors: [string, string, string];
}
