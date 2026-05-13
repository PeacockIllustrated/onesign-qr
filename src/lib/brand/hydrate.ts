import type { SupabaseClient } from '@supabase/supabase-js';
import type { BrandDesign, BrandDesignHydrated, BrandProfile, BrandPerson } from '@/types/brand';

/**
 * Hydrate a brand design with its profile, person, and storage public URLs.
 * Used both server-side (export endpoints) and client-side (preview).
 */
export async function hydrateBrandDesign(
  supabase: SupabaseClient,
  design: BrandDesign,
): Promise<BrandDesignHydrated> {
  const { data: profile, error: profileError } = await supabase
    .from('brand_profiles')
    .select('*')
    .eq('id', design.brand_profile_id)
    .single();

  if (profileError || !profile) {
    throw new Error(`Brand profile ${design.brand_profile_id} not found`);
  }

  let person: BrandPerson | null = null;
  if (design.person_id) {
    const { data } = await supabase
      .from('brand_people')
      .select('*')
      .eq('id', design.person_id)
      .single();
    person = (data as BrandPerson | null) ?? null;
  }

  const logo_url = publicUrl(supabase, 'brand-assets', profile.logo_storage_path);
  const person_photo_url = publicUrl(supabase, 'brand-assets', person?.photo_storage_path ?? null);

  return {
    ...design,
    profile: profile as BrandProfile,
    person,
    logo_url,
    person_photo_url,
  };
}

function publicUrl(
  supabase: SupabaseClient,
  bucket: string,
  path: string | null | undefined,
): string | null {
  if (!path) return null;
  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return data.publicUrl ?? null;
}

/**
 * Resolve effective colours (design config overrides profile defaults).
 */
export function resolveColors(design: BrandDesignHydrated): {
  primary: string;
  secondary: string;
  accent: string | null;
} {
  return {
    primary: design.config.primary_color ?? design.profile.primary_color,
    secondary: design.config.secondary_color ?? design.profile.secondary_color,
    accent: design.config.accent_color ?? design.profile.accent_color,
  };
}
