-- Migration: Enable RLS on organisation tables + helper functions
--
-- Phase 0.C.1 of the B2B organisation model rollout. This migration:
--   1. Adds two SECURITY DEFINER helpers (is_platform_admin, is_member_of_org)
--      so RLS policies can check membership/admin status without recursing
--      through RLS on those same tables.
--   2. Enables RLS and adds SELECT/INSERT/UPDATE/DELETE policies on
--      organizations, organization_members, organization_invites,
--      platform_admins.
--
-- Does NOT:
--   - Touch RLS on any data table (bio_link_pages, qr_codes, children) —
--     that's Phase 0.C.2.
--   - Tighten org_id to NOT NULL — also Phase 0.C.2.
--   - Touch the redirect-critical columns on qr_codes.
--
-- Rollback: see docs/superpowers/runbooks/phase-0-migration.md

BEGIN;

-- =============================================================================
-- HELPER: is_platform_admin
--
-- SECURITY DEFINER so the function body bypasses RLS on platform_admins.
-- Without this, a policy on platform_admins that checks "is the caller a
-- platform admin" would recurse through RLS on the same table.
-- =============================================================================

CREATE OR REPLACE FUNCTION is_platform_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM platform_admins WHERE user_id = auth.uid()
  );
$$;

-- =============================================================================
-- HELPER: is_member_of_org(org_id)
--
-- SECURITY DEFINER for the same recursion-avoidance reason as above.
-- Returns true if the current auth.uid() is a member of the given org.
-- =============================================================================

CREATE OR REPLACE FUNCTION is_member_of_org(target_org_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM organization_members
    WHERE org_id = target_org_id AND user_id = auth.uid()
  );
$$;

-- =============================================================================
-- HELPER: role_in_org(org_id)
--
-- Returns the caller's role in the given org, or NULL if not a member.
-- Used by UPDATE/DELETE policies that need owner/admin checks.
-- =============================================================================

CREATE OR REPLACE FUNCTION role_in_org(target_org_id UUID)
RETURNS member_role
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT role FROM organization_members
  WHERE org_id = target_org_id AND user_id = auth.uid()
  LIMIT 1;
$$;

-- =============================================================================
-- TABLE: organizations
-- =============================================================================

ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;

-- SELECT: members see their own orgs; platform admins see all.
CREATE POLICY "organizations_select_member_or_admin"
  ON organizations FOR SELECT
  TO authenticated
  USING (
    is_member_of_org(id) OR is_platform_admin()
  );

-- INSERT: only platform admins can insert directly. Normal orgs are created
-- by the signup trigger (which is SECURITY DEFINER and bypasses RLS) or by
-- the future invite-accept flow (which will use service_role).
CREATE POLICY "organizations_insert_platform_admin"
  ON organizations FOR INSERT
  TO authenticated
  WITH CHECK (is_platform_admin());

-- UPDATE: org owners and admins can update their org. Platform admins can
-- update any org (for super-admin support use cases in H2).
CREATE POLICY "organizations_update_owner_admin"
  ON organizations FOR UPDATE
  TO authenticated
  USING (
    is_platform_admin() OR role_in_org(id) IN ('owner', 'admin')
  )
  WITH CHECK (
    is_platform_admin() OR role_in_org(id) IN ('owner', 'admin')
  );

-- DELETE: owners only (soft delete via updated deleted_at), plus platform
-- admins. We still use a proper DELETE policy — rare but needed for GDPR.
CREATE POLICY "organizations_delete_owner"
  ON organizations FOR DELETE
  TO authenticated
  USING (
    is_platform_admin() OR role_in_org(id) = 'owner'
  );

-- =============================================================================
-- TABLE: organization_members
-- =============================================================================

ALTER TABLE organization_members ENABLE ROW LEVEL SECURITY;

-- SELECT: members of an org can see the full member list of that org; plus
-- platform admins see all.
CREATE POLICY "organization_members_select_org_members"
  ON organization_members FOR SELECT
  TO authenticated
  USING (
    is_platform_admin() OR is_member_of_org(org_id)
  );

-- INSERT: org owners and admins can add members. The signup trigger uses
-- SECURITY DEFINER and bypasses this policy (its INSERTs still work).
-- Platform admins can insert anywhere for support.
CREATE POLICY "organization_members_insert_owner_admin"
  ON organization_members FOR INSERT
  TO authenticated
  WITH CHECK (
    is_platform_admin() OR role_in_org(org_id) IN ('owner', 'admin')
  );

-- UPDATE: owners/admins can change roles. A member cannot promote themselves.
-- (Role-promotion business rules are enforced in application code; the RLS
-- policy is the floor, not the ceiling.)
CREATE POLICY "organization_members_update_owner_admin"
  ON organization_members FOR UPDATE
  TO authenticated
  USING (
    is_platform_admin() OR role_in_org(org_id) IN ('owner', 'admin')
  )
  WITH CHECK (
    is_platform_admin() OR role_in_org(org_id) IN ('owner', 'admin')
  );

-- DELETE: owners/admins can remove members; a member can always remove
-- themselves (leave the org).
CREATE POLICY "organization_members_delete_owner_admin_or_self"
  ON organization_members FOR DELETE
  TO authenticated
  USING (
    is_platform_admin()
    OR role_in_org(org_id) IN ('owner', 'admin')
    OR user_id = auth.uid()
  );

-- =============================================================================
-- TABLE: organization_invites
-- =============================================================================

ALTER TABLE organization_invites ENABLE ROW LEVEL SECURITY;

-- SELECT: owners/admins of the org, the invited email's user if they've
-- signed up, platform admins. The email check matches against the
-- authenticated user's email in auth.users.
CREATE POLICY "organization_invites_select_parties"
  ON organization_invites FOR SELECT
  TO authenticated
  USING (
    is_platform_admin()
    OR role_in_org(org_id) IN ('owner', 'admin')
    OR lower(email) = lower((SELECT email FROM auth.users WHERE id = auth.uid()))
  );

-- INSERT: owners/admins of the org.
CREATE POLICY "organization_invites_insert_owner_admin"
  ON organization_invites FOR INSERT
  TO authenticated
  WITH CHECK (
    is_platform_admin() OR role_in_org(org_id) IN ('owner', 'admin')
  );

-- UPDATE: invitee marking accepted (matched by email). The application
-- layer validates the token; RLS just gates who can write.
CREATE POLICY "organization_invites_update_invitee_or_admin"
  ON organization_invites FOR UPDATE
  TO authenticated
  USING (
    is_platform_admin()
    OR role_in_org(org_id) IN ('owner', 'admin')
    OR lower(email) = lower((SELECT email FROM auth.users WHERE id = auth.uid()))
  )
  WITH CHECK (
    is_platform_admin()
    OR role_in_org(org_id) IN ('owner', 'admin')
    OR lower(email) = lower((SELECT email FROM auth.users WHERE id = auth.uid()))
  );

-- DELETE: the invite creator, org owners/admins, platform admins.
CREATE POLICY "organization_invites_delete_creator_or_admin"
  ON organization_invites FOR DELETE
  TO authenticated
  USING (
    is_platform_admin()
    OR invited_by = auth.uid()
    OR role_in_org(org_id) IN ('owner', 'admin')
  );

-- =============================================================================
-- TABLE: platform_admins
--
-- Tightest access. Only platform admins can see, insert, update, delete.
-- Bootstrapping: the first platform admin must be inserted via service_role
-- (Supabase dashboard SQL editor or backend script) because the policy
-- requires the caller to already be a platform admin. This is the intended
-- security property.
-- =============================================================================

ALTER TABLE platform_admins ENABLE ROW LEVEL SECURITY;

CREATE POLICY "platform_admins_select_self"
  ON platform_admins FOR SELECT
  TO authenticated
  USING (is_platform_admin());

CREATE POLICY "platform_admins_insert_self"
  ON platform_admins FOR INSERT
  TO authenticated
  WITH CHECK (is_platform_admin());

CREATE POLICY "platform_admins_update_self"
  ON platform_admins FOR UPDATE
  TO authenticated
  USING (is_platform_admin())
  WITH CHECK (is_platform_admin());

CREATE POLICY "platform_admins_delete_self"
  ON platform_admins FOR DELETE
  TO authenticated
  USING (is_platform_admin());

COMMIT;
