import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockCookieStore, mockSupabase, mockIsValidOrgForUser, mockSetActiveOrgCookie } = vi.hoisted(() => {
  const mockCookieStore = {
    get: vi.fn(),
    set: vi.fn(),
    delete: vi.fn(),
  };
  const mockSupabase = {
    auth: { getUser: vi.fn() },
    from: vi.fn(),
  };
  const mockIsValidOrgForUser = vi.fn();
  const mockSetActiveOrgCookie = vi.fn(async (orgId: string) => {
    // Simulate the real setActiveOrgCookie function calling the mocked cookie store
    mockCookieStore.set('lynx_active_org', orgId, {
      httpOnly: true,
      sameSite: 'lax',
      secure: false, // NODE_ENV is not 'production' in tests
      maxAge: 60 * 60 * 24 * 30,
      path: '/',
    });
  });
  return { mockCookieStore, mockSupabase, mockIsValidOrgForUser, mockSetActiveOrgCookie };
});

vi.mock('next/headers', () => ({
  cookies: vi.fn(async () => mockCookieStore),
}));

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(async () => mockSupabase),
}));

vi.mock('@/lib/org/active-org', () => ({
  isValidOrgForUser: mockIsValidOrgForUser,
  setActiveOrgCookie: mockSetActiveOrgCookie,
}));

import { POST } from '@/app/api/org/switch/route';

function makeRequest(body: unknown) {
  return new Request('http://localhost:3000/api/org/switch', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

function mockMemberships(rows: { org_id: string }[]) {
  const orgIds = rows.map(r => r.org_id);
  mockIsValidOrgForUser.mockImplementation((client, userId, targetOrgId) => {
    return Promise.resolve(orgIds.includes(targetOrgId));
  });
}

describe('POST /api/org/switch', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 when unauthenticated', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: null },
      error: null,
    });
    const res = await POST(makeRequest({ orgId: '550e8400-e29b-41d4-a716-446655440000' }));
    expect(res.status).toBe(401);
  });

  it('returns 400 on invalid body shape', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: 'u1' } },
      error: null,
    });
    const res = await POST(makeRequest({ orgId: 'not-a-uuid' }));
    expect(res.status).toBe(400);
  });

  it('returns 403 when the user is not a member of the target org', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: 'u1' } },
      error: null,
    });
    mockMemberships([{ org_id: '11111111-1111-4111-8111-111111111111' }]);
    const res = await POST(
      makeRequest({ orgId: '22222222-2222-4222-8222-222222222222' })
    );
    expect(res.status).toBe(403);
  });

  it('sets the cookie and returns 200 when the user is a member', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: 'u1' } },
      error: null,
    });
    const orgId = '33333333-3333-4333-8333-333333333333';
    mockMemberships([{ org_id: orgId }]);

    const res = await POST(makeRequest({ orgId }));
    expect(res.status).toBe(200);
    expect(mockCookieStore.set).toHaveBeenCalledWith(
      'lynx_active_org',
      orgId,
      expect.objectContaining({ httpOnly: true })
    );
  });
});
