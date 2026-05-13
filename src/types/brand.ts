/**
 * Brand Kit type definitions — brand_profiles, brand_people, brand_designs
 */

export type BrandDesignKind = 'business_card' | 'email_signature';

export interface BrandSocials {
  linkedin?: string;
  twitter?: string;
  instagram?: string;
  facebook?: string;
  youtube?: string;
  tiktok?: string;
  github?: string;
  threads?: string;
  mastodon?: string;
  behance?: string;
  dribbble?: string;
  website?: string;
  // Action links — surfaced as buttons / "Book a meeting" / "Schedule a call"
  // on signatures and (eventually) cards.
  calendar?: string;
  booking?: string;
  portfolio?: string;
}

export interface BrandProfile {
  id: string;
  org_id: string;
  name: string;
  tagline: string | null;
  logo_storage_path: string | null;
  logo_dark_storage_path: string | null;
  primary_color: string;
  secondary_color: string;
  accent_color: string | null;
  font_heading: string;
  font_body: string;
  website: string | null;
  socials: BrandSocials;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface BrandPerson {
  id: string;
  brand_profile_id: string;
  full_name: string;
  role: string | null;
  pronouns: string | null;
  email: string | null;
  phone: string | null;
  mobile: string | null;
  address: string | null;
  photo_storage_path: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export type AvatarShape = 'none' | 'circle' | 'square';
export type CardBackStyle = 'logo-centered' | 'solid-accent' | 'monogram';
export type Density = 'compact' | 'normal' | 'spacious';
export type AccentStyle = 'bar' | 'block' | 'outline' | 'minimal';
export type CornerStyle = 'sharp' | 'rounded';
export type DividerStyle = 'none' | 'line' | 'dot' | 'pipe';

export interface BrandDesignConfig {
  // Per-design overrides; any field omitted falls back to brand profile / person.
  primary_color?: string;
  secondary_color?: string;
  accent_color?: string;
  tagline?: string;
  show_logo?: boolean;

  // Avatar / photo controls (cards + signatures with avatar slots).
  avatar_shape?: AvatarShape;       // default 'none'
  avatar_border?: boolean;          // default false
  avatar_border_color?: string;     // default = accent_color

  // Back-of-card controls.
  back_style?: CardBackStyle;       // default 'logo-centered'

  // Layout / aesthetic switches the user can use to tune any template.
  density?: Density;                // default 'normal' — padding + type scale
  accent_style?: AccentStyle;       // default varies by template
  corner_style?: CornerStyle;       // default 'rounded' — affects avatars, signature card edges
  divider_style?: DividerStyle;     // default 'pipe' — between inline contact bits

  // Visibility toggles — let users hide fields they don't want surfaced.
  show_pronouns?: boolean;          // default true
  show_mobile?: boolean;            // default true
  show_socials?: boolean;           // default true
  show_calendar_cta?: boolean;      // default true

  // Custom small text — footer line for signatures, "Member of…" line for cards.
  footer_text?: string;

  // Misc / free-form.
  show_qr?: boolean;                // back-of-card QR (future)
  qr_destination_url?: string;
  custom_lines?: string[];          // free-form extra lines
  notes?: string;
}

export interface BrandDesign {
  id: string;
  brand_profile_id: string;
  person_id: string | null;
  kind: BrandDesignKind;
  template_id: string;
  name: string;
  config: BrandDesignConfig;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

/** A fully hydrated design, with the brand profile and person joined for rendering. */
export interface BrandDesignHydrated extends BrandDesign {
  profile: BrandProfile;
  person: BrandPerson | null;
  /** Public URL for the light-background brand logo, if present. */
  logo_url: string | null;
  /** Public URL for the dark-background brand logo variant, if present. */
  logo_dark_url: string | null;
  /** Public URL for the person's photo, if present. */
  person_photo_url: string | null;
}

/** Catalog entry shown in the template picker. */
export interface BrandTemplate {
  id: string;
  kind: BrandDesignKind;
  name: string;
  description: string;
  preview_aspect: string; // e.g. '88.9 / 53.98' for biz card
}
