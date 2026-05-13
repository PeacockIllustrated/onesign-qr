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
  website?: string;
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

export interface BrandDesignConfig {
  // Per-design overrides; any field omitted falls back to brand profile / person.
  primary_color?: string;
  secondary_color?: string;
  accent_color?: string;
  tagline?: string;
  show_logo?: boolean;
  show_qr?: boolean;        // back-of-card QR
  qr_destination_url?: string;
  custom_lines?: string[];  // free-form extra lines (e.g. department, certifications)
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
  /** Public URL for the brand logo, if present. */
  logo_url: string | null;
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
