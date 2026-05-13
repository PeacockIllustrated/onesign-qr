-- Migration: Brand Kit — brand_profiles, brand_people, brand_designs
--
-- Centralised brand identity (logo, colours, fonts, contact defaults) that
-- powers downstream outputs (business cards, email signatures, and future
-- printed/digital collateral). Three tables shipped together:
--   - brand_profiles: the brand identity, org-owned
--   - brand_people: cardholders/signers attached to a profile (1+)
--   - brand_designs: instances of a template bound to (profile, optional person)
--
-- RLS uses is_member_of_org(org_id) from migration 00018. Storage bucket
-- 'brand-assets' (private) added in the same migration.

BEGIN;

-- =============================================================================
-- ENUMS
-- =============================================================================

DO $$ BEGIN
  CREATE TYPE brand_design_kind AS ENUM ('business_card', 'email_signature');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- =============================================================================
-- TABLE: brand_profiles
-- =============================================================================

CREATE TABLE IF NOT EXISTS brand_profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  name TEXT NOT NULL,                          -- e.g. "OneSign Brand"
  tagline TEXT,                                -- short tagline / strapline

  -- Visual identity
  logo_storage_path TEXT,                      -- brand-assets/{org_id}/profiles/{id}/logo.{ext}
  logo_dark_storage_path TEXT,                 -- optional dark-bg variant
  primary_color TEXT NOT NULL DEFAULT '#000000',
  secondary_color TEXT NOT NULL DEFAULT '#FFFFFF',
  accent_color TEXT,
  font_heading TEXT NOT NULL DEFAULT 'Inter',
  font_body TEXT NOT NULL DEFAULT 'Inter',

  -- Defaults applied to designs (overridable per person)
  website TEXT,
  socials JSONB NOT NULL DEFAULT '{}'::jsonb,  -- { linkedin, twitter, instagram, ... }

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ,

  CONSTRAINT brand_profile_name_length CHECK (char_length(name) BETWEEN 1 AND 100),
  CONSTRAINT brand_profile_tagline_length CHECK (tagline IS NULL OR char_length(tagline) <= 200),
  CONSTRAINT brand_profile_primary_color_format CHECK (primary_color ~ '^#[0-9A-Fa-f]{6}$'),
  CONSTRAINT brand_profile_secondary_color_format CHECK (secondary_color ~ '^#[0-9A-Fa-f]{6}$'),
  CONSTRAINT brand_profile_accent_color_format CHECK (accent_color IS NULL OR accent_color ~ '^#[0-9A-Fa-f]{6}$'),
  CONSTRAINT brand_profile_website_length CHECK (website IS NULL OR char_length(website) <= 2048)
);

CREATE INDEX IF NOT EXISTS idx_brand_profiles_org ON brand_profiles(org_id) WHERE deleted_at IS NULL;

ALTER TABLE brand_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "brand_profiles_select_member"
  ON brand_profiles FOR SELECT
  TO authenticated
  USING (is_member_of_org(org_id) AND deleted_at IS NULL);

CREATE POLICY "brand_profiles_insert_member"
  ON brand_profiles FOR INSERT
  TO authenticated
  WITH CHECK (is_member_of_org(org_id));

CREATE POLICY "brand_profiles_update_member"
  ON brand_profiles FOR UPDATE
  TO authenticated
  USING (is_member_of_org(org_id))
  WITH CHECK (is_member_of_org(org_id));

CREATE POLICY "brand_profiles_delete_member"
  ON brand_profiles FOR DELETE
  TO authenticated
  USING (is_member_of_org(org_id));

-- =============================================================================
-- TABLE: brand_people
-- =============================================================================

CREATE TABLE IF NOT EXISTS brand_people (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  brand_profile_id UUID NOT NULL REFERENCES brand_profiles(id) ON DELETE CASCADE,

  full_name TEXT NOT NULL,
  role TEXT,                                   -- job title
  pronouns TEXT,
  email TEXT,
  phone TEXT,
  mobile TEXT,
  address TEXT,
  photo_storage_path TEXT,                     -- brand-assets/{org_id}/people/{id}/photo.{ext}

  sort_order INT NOT NULL DEFAULT 0,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT brand_person_full_name_length CHECK (char_length(full_name) BETWEEN 1 AND 100),
  CONSTRAINT brand_person_role_length CHECK (role IS NULL OR char_length(role) <= 100),
  CONSTRAINT brand_person_email_length CHECK (email IS NULL OR char_length(email) <= 200),
  CONSTRAINT brand_person_phone_length CHECK (phone IS NULL OR char_length(phone) <= 50),
  CONSTRAINT brand_person_mobile_length CHECK (mobile IS NULL OR char_length(mobile) <= 50),
  CONSTRAINT brand_person_address_length CHECK (address IS NULL OR char_length(address) <= 300),
  CONSTRAINT brand_person_pronouns_length CHECK (pronouns IS NULL OR char_length(pronouns) <= 30)
);

CREATE INDEX IF NOT EXISTS idx_brand_people_profile ON brand_people(brand_profile_id, sort_order);

ALTER TABLE brand_people ENABLE ROW LEVEL SECURITY;

CREATE POLICY "brand_people_select_member"
  ON brand_people FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM brand_profiles
      WHERE brand_profiles.id = brand_people.brand_profile_id
        AND is_member_of_org(brand_profiles.org_id)
        AND brand_profiles.deleted_at IS NULL
    )
  );

CREATE POLICY "brand_people_insert_member"
  ON brand_people FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM brand_profiles
      WHERE brand_profiles.id = brand_people.brand_profile_id
        AND is_member_of_org(brand_profiles.org_id)
        AND brand_profiles.deleted_at IS NULL
    )
  );

CREATE POLICY "brand_people_update_member"
  ON brand_people FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM brand_profiles
      WHERE brand_profiles.id = brand_people.brand_profile_id
        AND is_member_of_org(brand_profiles.org_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM brand_profiles
      WHERE brand_profiles.id = brand_people.brand_profile_id
        AND is_member_of_org(brand_profiles.org_id)
    )
  );

CREATE POLICY "brand_people_delete_member"
  ON brand_people FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM brand_profiles
      WHERE brand_profiles.id = brand_people.brand_profile_id
        AND is_member_of_org(brand_profiles.org_id)
    )
  );

-- =============================================================================
-- TABLE: brand_designs
-- =============================================================================

CREATE TABLE IF NOT EXISTS brand_designs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  brand_profile_id UUID NOT NULL REFERENCES brand_profiles(id) ON DELETE CASCADE,
  person_id UUID REFERENCES brand_people(id) ON DELETE SET NULL,

  kind brand_design_kind NOT NULL,
  template_id TEXT NOT NULL,                   -- e.g. 'card-classic', 'sig-classic'
  name TEXT NOT NULL,                          -- user-facing label, e.g. "Jane's card"

  -- Per-design overrides: any of brand profile defaults can be overridden here
  -- (color swaps, custom strapline, alternate logo, etc). Free-form so we can
  -- evolve templates without schema changes.
  config JSONB NOT NULL DEFAULT '{}'::jsonb,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ,

  CONSTRAINT brand_design_name_length CHECK (char_length(name) BETWEEN 1 AND 100),
  CONSTRAINT brand_design_template_id_length CHECK (char_length(template_id) BETWEEN 1 AND 60)
);

CREATE INDEX IF NOT EXISTS idx_brand_designs_profile ON brand_designs(brand_profile_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_brand_designs_person ON brand_designs(person_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_brand_designs_kind ON brand_designs(brand_profile_id, kind) WHERE deleted_at IS NULL;

ALTER TABLE brand_designs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "brand_designs_select_member"
  ON brand_designs FOR SELECT
  TO authenticated
  USING (
    deleted_at IS NULL AND EXISTS (
      SELECT 1 FROM brand_profiles
      WHERE brand_profiles.id = brand_designs.brand_profile_id
        AND is_member_of_org(brand_profiles.org_id)
        AND brand_profiles.deleted_at IS NULL
    )
  );

CREATE POLICY "brand_designs_insert_member"
  ON brand_designs FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM brand_profiles
      WHERE brand_profiles.id = brand_designs.brand_profile_id
        AND is_member_of_org(brand_profiles.org_id)
        AND brand_profiles.deleted_at IS NULL
    )
  );

CREATE POLICY "brand_designs_update_member"
  ON brand_designs FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM brand_profiles
      WHERE brand_profiles.id = brand_designs.brand_profile_id
        AND is_member_of_org(brand_profiles.org_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM brand_profiles
      WHERE brand_profiles.id = brand_designs.brand_profile_id
        AND is_member_of_org(brand_profiles.org_id)
    )
  );

CREATE POLICY "brand_designs_delete_member"
  ON brand_designs FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM brand_profiles
      WHERE brand_profiles.id = brand_designs.brand_profile_id
        AND is_member_of_org(brand_profiles.org_id)
    )
  );

-- =============================================================================
-- TRIGGERS: touch updated_at
-- =============================================================================

CREATE OR REPLACE FUNCTION touch_brand_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_brand_profiles_updated_at ON brand_profiles;
CREATE TRIGGER trigger_brand_profiles_updated_at
  BEFORE UPDATE ON brand_profiles
  FOR EACH ROW EXECUTE FUNCTION touch_brand_updated_at();

DROP TRIGGER IF EXISTS trigger_brand_people_updated_at ON brand_people;
CREATE TRIGGER trigger_brand_people_updated_at
  BEFORE UPDATE ON brand_people
  FOR EACH ROW EXECUTE FUNCTION touch_brand_updated_at();

DROP TRIGGER IF EXISTS trigger_brand_designs_updated_at ON brand_designs;
CREATE TRIGGER trigger_brand_designs_updated_at
  BEFORE UPDATE ON brand_designs
  FOR EACH ROW EXECUTE FUNCTION touch_brand_updated_at();

-- =============================================================================
-- STORAGE: brand-assets bucket
-- =============================================================================

-- Public-read bucket: logos appear inside emails that recipients receive
-- (signed URLs would expire and break the signature on delivery). The path
-- includes the org_id UUID, which is opaque enough to discourage guessing;
-- WRITE policies remain org-scoped below.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'brand-assets',
  'brand-assets',
  true,
  10485760,  -- 10MB
  ARRAY['image/png', 'image/jpeg', 'image/svg+xml', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Path format: {org_id}/{kind}/{entity_id}/{filename}
-- kind ∈ {profiles, people}
--
-- SELECT policy not needed (bucket is public). WRITE policies below restrict
-- inserts/updates/deletes to members of the org named in the path.

DROP POLICY IF EXISTS "brand_assets_insert_member" ON storage.objects;
CREATE POLICY "brand_assets_insert_member"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'brand-assets'
    AND is_member_of_org(((storage.foldername(name))[1])::uuid)
  );

DROP POLICY IF EXISTS "brand_assets_update_member" ON storage.objects;
CREATE POLICY "brand_assets_update_member"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'brand-assets'
    AND is_member_of_org(((storage.foldername(name))[1])::uuid)
  );

DROP POLICY IF EXISTS "brand_assets_delete_member" ON storage.objects;
CREATE POLICY "brand_assets_delete_member"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'brand-assets'
    AND is_member_of_org(((storage.foldername(name))[1])::uuid)
  );

COMMIT;
