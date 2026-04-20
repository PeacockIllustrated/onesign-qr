import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockSupabase = {
  auth: { getUser: vi.fn() },
  from: vi.fn(),
};
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(async () => mockSupabase),
}));

import { POST } from '@/app/api/invite/accept/route';

function jsonRequest(body: unknown) {
  return new Request('http://localhost:3000/api/invite/accept', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

function mockInviteLookup(
  invite: {
    id: string;
    org_id: string;
    email: string;
    role: string;
    expires_at: string;
    accepted_at: string | null;
  } | null
) {
  const single = vi
    .fn()
    .mockResolvedValue(
      invite
        ? { data: invite, error: null }
        : { data: null, error: { code: 'PGRST116' } }
    );
  const eq = vi.fn().mockReturnValue({ single });
  const select = vi.fn().mockReturnValue({ eq });
  return { select };
}

describe('POST /api/invite/accept', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns 401 when unauthenticated', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: null },
      error: null,
    });
    const res = await POST(jsonRequest({ token: 'a'.repeat(40) }));
    expect(res.status).toBe(401);
  });

  it('returns 400 on invalid token shape', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: 'u1', email: 'x@x.com' } },
      error: null,
    });
    const res = await POST(jsonRequest({ token: 'short' }));
    expect(res.status).toBe(400);
  });

  it('returns 404 when token not found', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: 'u1', email: 'x@x.com' } },
      error: null,
    });
    mockSupabase.from.mockReturnValueOnce(mockInviteLookup(null));
    const res = await POST(jsonRequest({ token: 'a'.repeat(40) }));
    expect(res.status).toBe(404);
  });

  it('returns 410 when invite already accepted', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: 'u1', email: 'x@x.com' } },
      error: null,
    });
    mockSupabase.from.mockReturnValueOnce(
      mockInviteLookup({
        id: 'inv-1',
        org_id: 'org-1',
        email: 'x@x.com',
        role: 'member',
        expires_at: '2030-01-01T00:00:00Z',
        accepted_at: '2026-04-18T00:00:00Z',
      })
    );
    const res = await POST(jsonRequest({ token: 'a'.repeat(40) }));
    expect(res.status).toBe(410);
  });

  it('returns 410 when invite is expired', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: 'u1', email: 'x@x.com' } },
      error: null,
    });
    mockSupabase.from.mockReturnValueOnce(
      mockInviteLookup({
        id: 'inv-1',
        org_id: 'org-1',
        email: 'x@x.com',
        role: 'member',
        expires_at: '2020-01-01T00:00:00Z',
        accepted_at: null,
      })
    );
    const res = await POST(jsonRequest({ token: 'a'.repeat(40) }));
    expect(res.status).toBe(410);
  });

  it('returns 403 when invite email does not match authed user email', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: 'u1', email: 'mallory@x.com' } },
      error: null,
    });
    mockSupabase.from.mockReturnValueOnce(
      mockInviteLookup({
        id: 'inv-1',
        org_id: 'org-1',
        email: 'sarah@example.com',
        role: 'member',
        expires_at: '2030-01-01T00:00:00Z',
        accepted_at: null,
      })
    );
    const res = await POST(jsonRequest({ token: 'a'.repeat(40) }));
    expect(res.status).toBe(403);
  });

  it('returns 200 and accepts when everything matches', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: 'u1', email: 'SARAH@example.com' } },
      error: null,
    });

    // Call 1: invite lookup.
    const inviteLookup = mockInviteLookup({
      id: 'inv-1',
      org_id: 'org-1',
      email: 'sarah@example.com',
      role: 'admin',
      expires_at: '2030-01-01T00:00:00Z',
      accepted_at: null,
    });

    // Call 2: organization_members INSERT
    const insertResult = {
      insert: vi.fn().mockResolvedValue({ error: null }),
    };

    // Call 3: organization_invites UPDATE
    const updateResult = {
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null }),
      }),
    };

    mockSupabase.from
      .mockReturnValueOnce(inviteLookup)
      .mockReturnValueOnce(insertResult)
      .mockReturnValueOnce(updateResult);

    const res = await POST(jsonRequest({ token: 'a'.repeat(40) }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.orgId).toBe('org-1');
  });
});
