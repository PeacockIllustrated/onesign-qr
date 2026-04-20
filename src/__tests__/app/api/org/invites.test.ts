import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockCookieStore = {
  get: vi.fn(),
  set: vi.fn(),
  delete: vi.fn(),
};
vi.mock('next/headers', () => ({
  cookies: vi.fn(async () => mockCookieStore),
}));

const mockSupabase = {
  auth: { getUser: vi.fn() },
  from: vi.fn(),
};
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(async () => mockSupabase),
}));

const mockAdmin = {
  auth: { admin: { listUsers: vi.fn() } },
  from: vi.fn(),
};
vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: vi.fn(() => mockAdmin),
}));

const mockSendInvite = vi.fn().mockResolvedValue({ sent: true });
vi.mock('@/lib/email/send-invite', () => ({
  sendInviteEmail: (...args: unknown[]) => mockSendInvite(...args),
  buildAcceptUrl: (base: string, token: string) => `${base}/invite/${token}`,
}));

import { POST } from '@/app/api/org/invites/route';

function jsonRequest(body: unknown) {
  return new Request('http://localhost:3000/api/org/invites', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('POST /api/org/invites', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXT_PUBLIC_APP_URL = 'https://app.example.com';
    // Default: admin listUsers returns empty (invitee doesn't exist yet).
    mockAdmin.auth.admin.listUsers.mockResolvedValue({
      data: { users: [] },
      error: null,
    });
  });

  it('returns 401 when unauthenticated', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: null },
      error: null,
    });
    const res = await POST(jsonRequest({ email: 'x@x.com', role: 'member' }));
    expect(res.status).toBe(401);
  });

  it('returns 400 when no active org cookie', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: 'u1', email: 'admin@x.com' } },
      error: null,
    });
    mockCookieStore.get.mockReturnValue(undefined);
    const res = await POST(jsonRequest({ email: 'x@x.com', role: 'member' }));
    expect(res.status).toBe(400);
  });

  it('returns 400 on invalid body', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: 'u1', email: 'admin@x.com' } },
      error: null,
    });
    mockCookieStore.get.mockReturnValue({
      value: '11111111-1111-1111-1111-111111111111',
    });
    const res = await POST(jsonRequest({ email: 'not-email', role: 'admin' }));
    expect(res.status).toBe(400);
  });

  it('returns 403 when caller is a member (not owner/admin)', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: 'u1', email: 'member@x.com' } },
      error: null,
    });
    mockCookieStore.get.mockReturnValue({
      value: '11111111-1111-1111-1111-111111111111',
    });

    // Role lookup returns 'member'.
    const roleSingle = vi
      .fn()
      .mockResolvedValue({ data: { role: 'member' }, error: null });
    mockSupabase.from.mockReturnValue({
      select: () => ({ eq: () => ({ eq: () => ({ single: roleSingle }) }) }),
    });

    const res = await POST(jsonRequest({ email: 'x@x.com', role: 'member' }));
    expect(res.status).toBe(403);
  });

  it('returns 201 and inserts when owner invites a new email', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: 'u1', email: 'owner@x.com' } },
      error: null,
    });
    mockCookieStore.get.mockReturnValue({
      value: '11111111-1111-1111-1111-111111111111',
    });

    const calls: Array<{ table: string; kind: string }> = [];
    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'organization_members') {
        calls.push({ table, kind: 'role_or_member_check' });
        // Return a chain that can serve both role lookup and (if applicable)
        // existing-member check. First call: role lookup => 'owner'.
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({
                single: vi
                  .fn()
                  .mockResolvedValue({ data: { role: 'owner' }, error: null }),
              }),
            }),
          }),
        };
      }
      if (table === 'organization_invites') {
        calls.push({ table, kind: 'insert' });
        return {
          insert: () => ({
            select: () => ({
              single: vi.fn().mockResolvedValue({
                data: {
                  id: 'inv-1',
                  org_id: '11111111-1111-1111-1111-111111111111',
                  email: 'sarah@example.com',
                  role: 'member',
                  token: 'tok-xyz',
                  expires_at: '2030-01-01T00:00:00Z',
                  created_at: '2026-04-20T00:00:00Z',
                },
                error: null,
              }),
            }),
          }),
        };
      }
      if (table === 'organizations') {
        calls.push({ table, kind: 'org_name' });
        return {
          select: () => ({
            eq: () => ({
              single: vi
                .fn()
                .mockResolvedValue({ data: { name: 'Johns Cafe' }, error: null }),
            }),
          }),
        };
      }
      return {};
    });

    const res = await POST(
      jsonRequest({ email: 'sarah@example.com', role: 'member' })
    );
    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json.invite.email).toBe('sarah@example.com');
    expect(json.invite.role).toBe('member');
  });

  it('returns 409 when the invite insert hits a unique_violation (duplicate pending)', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: 'u1', email: 'owner@x.com' } },
      error: null,
    });
    mockCookieStore.get.mockReturnValue({
      value: '11111111-1111-1111-1111-111111111111',
    });

    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'organization_members') {
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({
                single: vi
                  .fn()
                  .mockResolvedValue({ data: { role: 'owner' }, error: null }),
              }),
            }),
          }),
        };
      }
      if (table === 'organization_invites') {
        return {
          insert: () => ({
            select: () => ({
              single: vi.fn().mockResolvedValue({
                data: null,
                error: { code: '23505', message: 'duplicate key' },
              }),
            }),
          }),
        };
      }
      return {};
    });

    const res = await POST(
      jsonRequest({ email: 'sarah@example.com', role: 'member' })
    );
    expect(res.status).toBe(409);
  });
});

describe('GET /api/org/invites', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns 401 when unauthenticated', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: null },
      error: null,
    });
    const { GET } = await import('@/app/api/org/invites/route');
    const res = await GET();
    expect(res.status).toBe(401);
  });

  it('returns 400 when no active org cookie', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: 'u1' } },
      error: null,
    });
    mockCookieStore.get.mockReturnValue(undefined);
    const { GET } = await import('@/app/api/org/invites/route');
    const res = await GET();
    expect(res.status).toBe(400);
  });

  it('returns the pending invites for the active org', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: 'u1' } },
      error: null,
    });
    mockCookieStore.get.mockReturnValue({ value: 'org-1' });

    const isNull = vi.fn().mockResolvedValue({
      data: [
        {
          id: 'inv-1',
          email: 'sarah@example.com',
          role: 'admin',
          expires_at: '2026-05-01T00:00:00Z',
          created_at: '2026-04-20T00:00:00Z',
        },
      ],
      error: null,
    });
    const eq = vi.fn().mockReturnValue({ is: isNull });
    const select = vi.fn().mockReturnValue({ eq });
    mockSupabase.from.mockReturnValue({ select });

    const { GET } = await import('@/app/api/org/invites/route');
    const res = await GET();
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.invites).toHaveLength(1);
    expect(json.invites[0].email).toBe('sarah@example.com');
  });
});
