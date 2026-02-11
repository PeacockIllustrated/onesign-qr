/**
 * Bio-link page related type definitions
 */

import type { DeviceType } from './qr';

// Bio-link theme options
export type BioLinkTheme =
  | 'minimal'
  | 'midnight'
  | 'gradient-sunset'
  | 'gradient-ocean'
  | 'neon';

// Bio-link button style options
export type BioLinkButtonStyle = 'filled' | 'outline' | 'shadow';

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
 * Theme CSS custom properties
 */
export interface BioThemeVars {
  '--bio-bg': string;
  '--bio-bg-gradient'?: string;
  '--bio-text': string;
  '--bio-text-secondary': string;
  '--bio-button-bg': string;
  '--bio-button-text': string;
  '--bio-button-border': string;
  '--bio-button-hover': string;
  '--bio-avatar-ring': string;
}

/**
 * Theme definition
 */
export interface BioThemeDefinition {
  id: BioLinkTheme;
  name: string;
  label: string;
  vars: BioThemeVars;
  previewColors: [string, string, string];
}
