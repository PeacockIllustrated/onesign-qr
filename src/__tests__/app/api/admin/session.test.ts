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
  auth: {
    getUser: vi.fn(),
    signInWithPassword: vi.fn(),
  },
};
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(async () => mockSupabase),
}));

const mockIsPlatformAdmin = vi.fn();
vi.mock('@/lib/admin/is-platform-admin', () => ({
  isPlatformAdmin: (...args: unknown[]) => mockIsPlatformAdmin(...args),
}));

const mockLogAdminAction = vi.fn();
vi.mock('@/lib/admin/audit', () => ({
  logAdminAction: (...args: unknown[]) => mockLogAdminAction(...args),
}));

const mockSetAdminSession = vi.fn();
const mockClearAdminSession = vi.fn();
vi.mock('@/lib/admin/admin-session', () => ({
  setAdminSession: (...args: unknown[]) => mockSetAdminSession(...args),
  clearAdminSession: (...args: unknown[]) => mockClearAdminSession(...args),
}));

import { POST, DELETE } from '@/app/api/admin/session/route';

function jsonRequest(body: unknown) {
  return new Request('http://localhost:3000/api/admin/session', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('POST /api/admin/session', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 when unauthenticated', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: null },
      error: null,
    });
    const res = await POST(jsonRequest({ password: 'x' }));
    expect(res.status).toBe(401);
  });

  it('returns 400 on invalid body', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: 'u1', email: 'admin@x.com' } },
      error: null,
    });
    const res = await POST(jsonRequest({}));
    expect(res.status).toBe(400);
  });

  it('returns 403 when user is not a platform admin', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: 'u1', email: 'admin@x.com' } },
      error: null,
    });
    mockIsPlatformAdmin.mockResolvedValue(false);
    const res = await POST(jsonRequest({ password: 'pass' }));
    expect(res.status).toBe(403);
  });

  it('returns 401 when password is wrong', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: 'u1', email: 'admin@x.com' } },
      error: null,
    });
    mockIsPlatformAdmin.mockResolvedValue(true);
    mockSupabase.auth.signInWithPassword.mockResolvedValue({
      data: { user: null },
      error: { message: 'Invalid login credentials' },
    });
    const res = await POST(jsonRequest({ password: 'wrong' }));
    expect(res.status).toBe(401);
    expect(mockLogAdminAction).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'admin_session.failed' })
    );
  });

  it('sets admin session cookie and logs on success', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: 'u1', email: 'admin@x.com' } },
      error: null,
    });
    mockIsPlatformAdmin.mockResolvedValue(true);
    mockSupabase.auth.signInWithPassword.mockResolvedValue({
      data: { user: { id: 'u1' } },
      error: null,
    });

    const res = await POST(jsonRequest({ password: 'correct' }));
    expect(res.status).toBe(200);
    expect(mockSetAdminSession).toHaveBeenCalledWith('u1');
    expect(mockLogAdminAction).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'admin_session.created' })
    );
  });
});

describe('DELETE /api/admin/session', () => {
  beforeEach(() => vi.clearAllMocks());

  it('clears the cookie and returns 200', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: 'u1' } },
      error: null,
    });
    const res = await DELETE();
    expect(res.status).toBe(200);
    expect(mockClearAdminSession).toHaveBeenCalled();
  });
});
