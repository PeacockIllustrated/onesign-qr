import { describe, it, expect } from 'vitest';
import {
  createOrganizationSchema,
  updateOrganizationSchema,
  inviteMemberSchema,
  acceptInviteSchema,
  memberRoleSchema,
  organizationPlanSchema,
} from '@/validations/organization';

describe('memberRoleSchema', () => {
  it('accepts owner, admin, member', () => {
    for (const role of ['owner', 'admin', 'member']) {
      expect(memberRoleSchema.safeParse(role).success).toBe(true);
    }
  });

  it('rejects unknown roles', () => {
    expect(memberRoleSchema.safeParse('super_admin').success).toBe(false);
    expect(memberRoleSchema.safeParse('').success).toBe(false);
  });
});

describe('organizationPlanSchema', () => {
  it('accepts free and pro', () => {
    expect(organizationPlanSchema.safeParse('free').success).toBe(true);
    expect(organizationPlanSchema.safeParse('pro').success).toBe(true);
  });

  it('rejects unknown plans', () => {
    expect(organizationPlanSchema.safeParse('enterprise').success).toBe(false);
  });
});

describe('createOrganizationSchema', () => {
  it('accepts a minimal valid payload', () => {
    const result = createOrganizationSchema.safeParse({
      name: 'Johns Cafe',
      slug: 'johns-cafe',
    });
    expect(result.success).toBe(true);
  });

  it('rejects an empty name', () => {
    const result = createOrganizationSchema.safeParse({
      name: '',
      slug: 'johns-cafe',
    });
    expect(result.success).toBe(false);
  });

  it('rejects a name over 100 characters', () => {
    const result = createOrganizationSchema.safeParse({
      name: 'a'.repeat(101),
      slug: 'x',
    });
    expect(result.success).toBe(false);
  });

  it('rejects a slug with uppercase or spaces', () => {
    expect(
      createOrganizationSchema.safeParse({ name: 'x', slug: 'Johns Cafe' })
        .success
    ).toBe(false);
    expect(
      createOrganizationSchema.safeParse({ name: 'x', slug: 'Johns-Cafe' })
        .success
    ).toBe(false);
  });

  it('accepts an optional website and phone', () => {
    const result = createOrganizationSchema.safeParse({
      name: 'x',
      slug: 'x',
      website: 'https://example.com',
      phone: '+44 20 1234 5678',
    });
    expect(result.success).toBe(true);
  });

  it('rejects an invalid website URL', () => {
    const result = createOrganizationSchema.safeParse({
      name: 'x',
      slug: 'x',
      website: 'not a url',
    });
    expect(result.success).toBe(false);
  });
});

describe('updateOrganizationSchema', () => {
  it('accepts partial updates', () => {
    expect(updateOrganizationSchema.safeParse({ name: 'New Name' }).success).toBe(
      true
    );
    expect(updateOrganizationSchema.safeParse({}).success).toBe(true);
  });

  it('rejects updates to slug (slug is create-time only)', () => {
    const result = updateOrganizationSchema.safeParse({ slug: 'new-slug' });
    // slug is not in the update schema; extra keys are stripped or rejected
    // depending on the schema. We assert that if present it must be ignored.
    // Here we assert the schema does not carry slug through.
    if (result.success) {
      expect('slug' in result.data).toBe(false);
    }
  });
});

describe('inviteMemberSchema', () => {
  it('accepts a valid invite', () => {
    const result = inviteMemberSchema.safeParse({
      email: 'sarah@example.com',
      role: 'admin',
    });
    expect(result.success).toBe(true);
  });

  it('rejects an invalid email', () => {
    expect(
      inviteMemberSchema.safeParse({ email: 'not-an-email', role: 'admin' })
        .success
    ).toBe(false);
  });

  it('rejects role "owner" — owner is created by org creation, not invite', () => {
    expect(
      inviteMemberSchema.safeParse({ email: 'x@x.com', role: 'owner' }).success
    ).toBe(false);
  });
});

describe('acceptInviteSchema', () => {
  it('accepts a valid token string', () => {
    expect(acceptInviteSchema.safeParse({ token: 'abc123' }).success).toBe(true);
  });

  it('rejects an empty token', () => {
    expect(acceptInviteSchema.safeParse({ token: '' }).success).toBe(false);
  });
});
