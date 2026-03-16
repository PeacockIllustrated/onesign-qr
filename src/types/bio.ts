/**
 * Bio-link page related type definitions
 */

import type { DeviceType } from './qr';

// ─── Block & Grid Types ─────────────────────────────────────────────

/** Block types available in the grid canvas */
export type BioBlockType =
  | 'link'
  | 'heading'
  | 'text'
  | 'image'
  | 'social_icons'
  | 'divider'
  | 'spacer'
  | 'spotify_embed'
  | 'youtube_embed'
  | 'map'
  | 'contact_form'
  | 'gallery'
  | 'countdown'
  | 'payment_link';

/** Layout mode for bio pages */
export type BioLayoutMode = 'list' | 'grid';

/** Contact card layout variants */
export type BioCardLayout = 'centered' | 'left-aligned' | 'split' | 'minimal' | 'cover';

/** Cover image aspect ratio options */
export type BioCoverAspectRatio = '3:1' | '16:9' | '2:1' | '4:3';

/** Grid position for a block */
export interface BioGridPosition {
  col: number;      // 0-3
  row: number;      // 0+
  colSpan: number;  // 1-4
  rowSpan: number;  // 1-4
}

// ─── Block Content Types (per block_type) ───────────────────────────

export interface BioBlockContentLink {
  title: string;
  url: string;
  icon?: string | null;
  icon_type?: BioLinkIconType | null;
  icon_url?: string | null;
  icon_bg_color?: string | null;
  show_icon?: boolean;
  style_overrides?: BioStyleOverrides;
}

export interface BioBlockContentHeading {
  text: string;
  level: 1 | 2 | 3;
  style_overrides?: BioStyleOverrides;
}

export interface BioBlockContentText {
  text: string;
  bold?: boolean;
  italic?: boolean;
  align?: 'left' | 'center' | 'right';
  style_overrides?: BioStyleOverrides;
}

export interface BioBlockContentImage {
  src: string;
  alt?: string;
  object_fit?: 'cover' | 'contain';
  invert?: boolean;
  link_url?: string;
  style_overrides?: BioStyleOverrides;
}

export interface BioBlockContentSocialIcons {
  icons: Array<{ platform: string; url: string }>;
  style_overrides?: BioStyleOverrides;
}

export interface BioBlockContentDivider {
  style: 'solid' | 'dashed' | 'dotted' | 'gradient';
  style_overrides?: BioStyleOverrides;
}

export interface BioBlockContentSpacer {
  style_overrides?: BioStyleOverrides;
}

export interface BioBlockContentSpotifyEmbed {
  spotify_url: string;
  embed_type: 'track' | 'album' | 'playlist' | 'artist';
  style_overrides?: BioStyleOverrides;
}

export interface BioBlockContentYouTubeEmbed {
  video_url: string;
  style_overrides?: BioStyleOverrides;
}

export interface BioBlockContentMap {
  query: string;
  zoom?: number;
  style_overrides?: BioStyleOverrides;
}

export interface BioBlockContentCountdown {
  target_datetime: string;
  label?: string;
  expired_message?: string;
  style?: 'compact' | 'large';
  style_overrides?: BioStyleOverrides;
}

export interface BioBlockContentPaymentLink {
  platform: 'paypal' | 'venmo' | 'cashapp' | 'stripe' | 'buymeacoffee' | 'ko-fi' | 'custom';
  url: string;
  display_text?: string;
  suggested_amounts?: string[];
  style_overrides?: BioStyleOverrides;
}

export interface BioBlockContentGallery {
  display_mode: 'grid' | 'carousel';
  columns?: 2 | 3;
  images: Array<{
    storage_path: string;
    caption?: string | null;
    link_url?: string | null;
  }>;
  style_overrides?: BioStyleOverrides;
}

export interface BioBlockContentContactForm {
  form_title?: string;
  fields: Array<'name' | 'email' | 'message' | 'phone' | 'subject'>;
  success_message?: string;
  notify_email?: boolean;
  style_overrides?: BioStyleOverrides;
}

/** Per-block style overrides — stored in content JSONB */
export interface BioStyleOverrides {
  bg_color?: string;
  border_radius?: 'sharp' | 'rounded' | 'pill' | 'soft' | 'chunky' | 'organic';
  border?: string;
  padding?: 'sm' | 'md' | 'lg';
  shadow?: 'none' | 'sm' | 'md' | 'lg';
}

/** Discriminated union of all block content shapes */
export type BioBlockContent =
  | BioBlockContentLink
  | BioBlockContentHeading
  | BioBlockContentText
  | BioBlockContentImage
  | BioBlockContentSocialIcons
  | BioBlockContentDivider
  | BioBlockContentSpacer
  | BioBlockContentSpotifyEmbed
  | BioBlockContentYouTubeEmbed
  | BioBlockContentMap
  | BioBlockContentCountdown
  | BioBlockContentPaymentLink
  | BioBlockContentGallery
  | BioBlockContentContactForm;

/** Bio block database record */
export interface BioBlock {
  id: string;
  page_id: string;
  block_type: BioBlockType;
  grid_col: number;
  grid_row: number;
  grid_col_span: number;
  grid_row_span: number;
  content: BioBlockContent;
  sort_order: number;
  is_enabled: boolean;
  total_clicks: number;
  created_at: string;
  updated_at: string;
}

/** Bio block click event database record */
export interface BioBlockClickEvent {
  id: string;
  block_id: string;
  page_id: string;
  clicked_at: string;
  country_code: string | null;
  device_type: DeviceType;
  ip_hash: string | null;
}

/** Bio contact form submission database record */
export interface BioFormSubmission {
  id: string;
  page_id: string;
  block_id: string;
  name: string;
  email: string;
  message: string;
  phone: string | null;
  subject: string | null;
  ip_hash: string;
  is_read: boolean;
  submitted_at: string;
}

// ─── Original Types ─────────────────────────────────────────────────

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
  card_layout: BioCardLayout | null;
  subtitle: string | null;
  company: string | null;
  job_title: string | null;
  location: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  contact_website: string | null;
  cover_storage_path: string | null;
  cover_aspect_ratio: BioCoverAspectRatio | null;
  cover_position_y: number | null;
  layout_mode: BioLayoutMode;
  grid_config: { columns?: number; gap?: string } | null;
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
 * Bio-link page with blocks (grid mode)
 */
export interface BioLinkPageWithBlocks extends BioLinkPage {
  blocks: BioBlock[];
  items: BioLinkItem[]; // Kept for backward compat
}

/**
 * Bio-link analytics summary (full dashboard data)
 */
export interface BioLinkAnalyticsSummary {
  total_views: number;
  views_today: number;
  views_this_week: number;
  views_this_month: number;
  total_clicks: number;
  unique_visitors: number;
  period: '7d' | '30d' | '90d';
  views_by_day: Array<{ date: string; count: number }>;
  clicks_by_day: Array<{ date: string; count: number }>;
  links: Array<{
    id: string;
    title: string;
    total_clicks: number;
    clicks_this_week: number;
  }>;
  blocks: Array<{
    id: string;
    block_type: BioBlockType;
    label: string;
    total_clicks: number;
  }>;
  top_countries: Array<{ country: string; count: number }>;
  top_devices: Array<{ device: string; count: number }>;
  top_referrers: Array<{ domain: string; count: number }>;
  top_browsers: Array<{ browser: string; count: number }>;
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
