import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock next/headers before importing the module under test.
const mockCookieStore = {
  get: vi.fn(),
  set: vi.fn(),
  delete: vi.fn(),
};
vi.mock('next/headers', () => ({
  cookies: vi.fn(async () => mockCookieStore),
}));

import {
  ACTIVE_ORG_COOKIE,
  resolveActiveOrgId,
  isValidOrgForUser,
} from '@/lib/org/active-org';

type MemberRow = { org_id: string };

function mockSupabaseMembershipList(rows: MemberRow[]) {
  const eq = vi.fn().mockResolvedValue({ data: rows, error: null });
  const select = vi.fn().mockReturnValue({ eq });
  const from = vi.fn().mockReturnValue({ select });
  return { from } as unknown as {
    from: ReturnType<typeof vi.fn>;
  };
}

describe('isValidOrgForUser', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns true when the org is one of the user memberships', async () => {
    const client = mockSupabaseMembershipList([
      { org_id: 'org-a' },
      { org_id: 'org-b' },
    ]);
    const valid = await isValidOrgForUser(client as never, 'user-1', 'org-b');
    expect(valid).toBe(true);
  });

  it('returns false when the org is not in the user memberships', async () => {
    const client = mockSupabaseMembershipList([{ org_id: 'org-a' }]);
    const valid = await isValidOrgForUser(client as never, 'user-1', 'org-b');
    expect(valid).toBe(false);
  });

  it('returns false when the user has no memberships', async () => {
    const client = mockSupabaseMembershipList([]);
    const valid = await isValidOrgForUser(client as never, 'user-1', 'org-x');
    expect(valid).toBe(false);
  });
});

describe('resolveActiveOrgId', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns the cookie value when the user is a member of that org', async () => {
    mockCookieStore.get.mockReturnValue({ value: 'org-b' });
    const client = mockSupabaseMembershipList([
      { org_id: 'org-a' },
      { org_id: 'org-b' },
    ]);
    const result = await resolveActiveOrgId(client as never, 'user-1');
    expect(result.orgId).toBe('org-b');
    expect(result.wasReset).toBe(false);
  });

  it('falls back to the first (personal) org if no cookie is set and writes it', async () => {
    mockCookieStore.get.mockReturnValue(undefined);
    const client = mockSupabaseMembershipList([{ org_id: 'org-personal' }]);
    const result = await resolveActiveOrgId(client as never, 'user-1');
    expect(result.orgId).toBe('org-personal');
    expect(result.wasReset).toBe(true);
    expect(mockCookieStore.set).toHaveBeenCalledWith(
      ACTIVE_ORG_COOKIE,
      'org-personal',
      expect.objectContaining({ httpOnly: true, sameSite: 'lax' })
    );
  });

  it('falls back to the first org if the cookie points at an org the user no longer belongs to', async () => {
    mockCookieStore.get.mockReturnValue({ value: 'org-removed' });
    const client = mockSupabaseMembershipList([
      { org_id: 'org-still-member' },
    ]);
    const result = await resolveActiveOrgId(client as never, 'user-1');
    expect(result.orgId).toBe('org-still-member');
    expect(result.wasReset).toBe(true);
  });

  it('throws when the user has no memberships at all', async () => {
    mockCookieStore.get.mockReturnValue(undefined);
    const client = mockSupabaseMembershipList([]);
    await expect(
      resolveActiveOrgId(client as never, 'user-1')
    ).rejects.toThrow(/no organisation/i);
  });
});
