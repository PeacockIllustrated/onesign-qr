-- Migration: Organizations and org_id columns
--
-- Phase 0.A of the B2B organisation model rollout. Purely additive: creates
-- four new tables (organizations, organization_members, organization_invites,
-- platform_admins), two enums (member_role, organization_plan), and adds a
-- nullable org_id column to the two tables that currently carry owner_id
-- (bio_link_pages, qr_codes).
--
-- This migration does NOT:
--   - backfill org_id on existing rows (Phase 0.B)
--   - change any RLS policy (Phase 0.C)
--   - drop the UNIQUE(owner_id) constraint on bio_link_pages (Phase 0.C)
--
-- The redirect handler at /r/[slug] is unaffected because it uses the admin
-- Supabase client and relies only on the columns slug, destination_url,
-- is_active, analytics_enabled, mode on qr_codes — none of which are touched.

-- =============================================================================
-- ENUMS
-- =============================================================================

DO $$ BEGIN
  CREATE TYPE member_role AS ENUM ('owner', 'admin', 'member');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE organization_plan AS ENUM ('free', 'pro');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- =============================================================================
-- TABLE: organizations
-- =============================================================================

CREATE TABLE IF NOT EXISTS organizations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Identity
  name TEXT NOT NULL,
  slug TEXT NOT NULL,

  -- Commercial tier (free/pro). Detailed limit enforcement happens in app
  -- code, not at the DB level.
  plan organization_plan NOT NULL DEFAULT 'free',

  -- Business profile fields. Populated during onboarding. Used by the H1
  -- business-profile feature and the H2 email signature generator.
  phone TEXT,
  address TEXT,
  hours JSONB,
  website TEXT,
  logo_url TEXT,
  default_timezone TEXT,

  -- Billing. Populated lazily when the org first hits Stripe (either
  -- shopfront purchase or plan upgrade).
  stripe_customer_id TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_organizations_slug_unique
  ON organizations(slug) WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_organizations_stripe_customer
  ON organizations(stripe_customer_id) WHERE stripe_customer_id IS NOT NULL;

-- =============================================================================
-- TABLE: organization_members
-- =============================================================================

CREATE TABLE IF NOT EXISTS organization_members (
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role member_role NOT NULL,
  invited_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (org_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_organization_members_user
  ON organization_members(user_id);

-- =============================================================================
-- TABLE: organization_invites
-- =============================================================================

CREATE TABLE IF NOT EXISTS organization_invites (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role member_role NOT NULL,
  token TEXT NOT NULL,
  invited_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  expires_at TIMESTAMPTZ NOT NULL,
  accepted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_organization_invites_token_unique
  ON organization_invites(token);

CREATE INDEX IF NOT EXISTS idx_organization_invites_email
  ON organization_invites(lower(email));

CREATE INDEX IF NOT EXISTS idx_organization_invites_org
  ON organization_invites(org_id);

-- =============================================================================
-- TABLE: platform_admins
--
-- Platform-level super-admin flag, deliberately stored in its own table so
-- that platform access can never be granted or escalated through any
-- organization_members action. Rows in this table bypass org-scoped RLS in
-- specific admin endpoints (enforced in application code, not RLS).
-- =============================================================================

CREATE TABLE IF NOT EXISTS platform_admins (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  granted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  granted_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  notes TEXT
);

-- =============================================================================
-- NULLABLE org_id ON EXISTING TABLES
--
-- Added as NULLABLE so this migration applies cleanly without backfill.
-- Backfill happens in Phase 0.B; NOT NULL + defaults happen in Phase 0.C.
-- =============================================================================

ALTER TABLE bio_link_pages
  ADD COLUMN IF NOT EXISTS org_id UUID REFERENCES organizations(id) ON DELETE CASCADE;

ALTER TABLE qr_codes
  ADD COLUMN IF NOT EXISTS org_id UUID REFERENCES organizations(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_bio_link_pages_org
  ON bio_link_pages(org_id);

CREATE INDEX IF NOT EXISTS idx_qr_codes_org
  ON qr_codes(org_id);

-- =============================================================================
-- updated_at TRIGGER for organizations
-- =============================================================================

CREATE OR REPLACE FUNCTION touch_organizations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_organizations_updated_at ON organizations;
CREATE TRIGGER trg_organizations_updated_at
  BEFORE UPDATE ON organizations
  FOR EACH ROW
  EXECUTE FUNCTION touch_organizations_updated_at();

-- =============================================================================
-- NO RLS POLICIES (deliberate)
--
-- New tables have RLS disabled by default (Supabase's default is ENABLE). We
-- explicitly leave organizations, organization_members, organization_invites,
-- and platform_admins without RLS enabled in this phase — they are only
-- accessed by the admin client in Phase 0.B backfill, and RLS is added in
-- Phase 0.C alongside the active-org session work.
--
-- ENABLE ROW LEVEL SECURITY is applied to these tables in Phase 0.C.
-- =============================================================================
