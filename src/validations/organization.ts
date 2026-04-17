import { z } from 'zod';

export const memberRoleSchema = z.enum(['owner', 'admin', 'member']);
export type MemberRoleInput = z.infer<typeof memberRoleSchema>;

export const organizationPlanSchema = z.enum(['free', 'pro']);

/**
 * Slug rules: lowercase letters, digits, hyphens; 1–50 chars; may not start
 * or end with a hyphen. Used in URLs (super-admin org lookup), so strict.
 */
const slugSchema = z
  .string()
  .min(1)
  .max(50)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
    message: 'Slug must be lowercase letters, digits, and hyphens only',
  });

const optionalUrl = z
  .string()
  .url({ message: 'Website must be a valid URL' })
  .max(500)
  .optional();

const optionalPhone = z.string().min(3).max(50).optional();
const optionalAddress = z.string().min(1).max(500).optional();
const optionalLogoUrl = z.string().url().max(500).optional();
const optionalTimezone = z.string().min(1).max(64).optional();

/**
 * Input shape for creating a new organization. Used by:
 *   - Phase 0.B: backfill script (personal-org auto-creation).
 *   - Phase 0.C / onward: signup flow, "create new org" UI.
 */
export const createOrganizationSchema = z.object({
  name: z.string().min(1).max(100),
  slug: slugSchema,
  phone: optionalPhone,
  address: optionalAddress,
  website: optionalUrl,
  logo_url: optionalLogoUrl,
  default_timezone: optionalTimezone,
});
export type CreateOrganizationInput = z.infer<typeof createOrganizationSchema>;

/**
 * Updatable fields on an existing organization. Slug is intentionally
 * excluded — slug changes are a separate, gated admin operation handled
 * outside this schema.
 */
export const updateOrganizationSchema = z
  .object({
    name: z.string().min(1).max(100).optional(),
    phone: optionalPhone,
    address: optionalAddress,
    hours: z.record(z.string(), z.unknown()).optional(),
    website: optionalUrl,
    logo_url: optionalLogoUrl,
    default_timezone: optionalTimezone,
  })
  .strict();
export type UpdateOrganizationInput = z.infer<typeof updateOrganizationSchema>;

/**
 * Invite an existing or new email address to an existing org. Role is
 * restricted to admin | member — owner is assigned only at org creation.
 */
export const inviteMemberSchema = z.object({
  email: z.string().email().max(320),
  role: z.enum(['admin', 'member']),
});
export type InviteMemberInput = z.infer<typeof inviteMemberSchema>;

export const acceptInviteSchema = z.object({
  token: z.string().min(1).max(128),
});
export type AcceptInviteInput = z.infer<typeof acceptInviteSchema>;
