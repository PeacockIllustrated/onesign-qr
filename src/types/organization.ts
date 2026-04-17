export type MemberRole = 'owner' | 'admin' | 'member';
export type OrganizationPlan = 'free' | 'pro';

export interface OrganizationRecord {
  id: string;
  name: string;
  slug: string;
  plan: OrganizationPlan;
  phone: string | null;
  address: string | null;
  hours: Record<string, unknown> | null;
  website: string | null;
  logo_url: string | null;
  default_timezone: string | null;
  stripe_customer_id: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface OrganizationMemberRecord {
  org_id: string;
  user_id: string;
  role: MemberRole;
  invited_by: string | null;
  joined_at: string;
}

export interface OrganizationInviteRecord {
  id: string;
  org_id: string;
  email: string;
  role: MemberRole;
  token: string;
  invited_by: string;
  expires_at: string;
  accepted_at: string | null;
  created_at: string;
}

export interface PlatformAdminRecord {
  user_id: string;
  granted_at: string;
  granted_by: string | null;
  notes: string | null;
}

/**
 * The minimal shape needed when listing an org in a "switcher" UI: just what
 * the user needs to pick between orgs. Returned by /api/org endpoints in
 * Phase 0.C.
 */
export interface OrganizationSummary {
  id: string;
  name: string;
  slug: string;
  role: MemberRole;
  plan: OrganizationPlan;
}
