import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const mockCookieStore = {
  get: vi.fn(),
  set: vi.fn(),
  delete: vi.fn(),
};
vi.mock('next/headers', () => ({
  cookies: vi.fn(async () => mockCookieStore),
}));

import {
  ADMIN_SESSION_COOKIE,
  ADMIN_SESSION_IDLE_MS,
  setAdminSession,
  clearAdminSession,
  verifyAdminSessionCookie,
} from '@/lib/admin/admin-session';

describe('admin session cookie', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.ADMIN_SESSION_SECRET = 'test-secret-at-least-32-characters-long-1';
  });

  afterEach(() => {
    delete process.env.ADMIN_SESSION_SECRET;
  });

  it('ADMIN_SESSION_IDLE_MS is 30 minutes', () => {
    expect(ADMIN_SESSION_IDLE_MS).toBe(30 * 60 * 1000);
  });

  it('setAdminSession writes a signed cookie with HttpOnly/SameSite=Lax', async () => {
    await setAdminSession('user-1');
    expect(mockCookieStore.set).toHaveBeenCalledTimes(1);
    const [name, value, opts] = mockCookieStore.set.mock.calls[0] as [
      string,
      string,
      Record<string, unknown>,
    ];
    expect(name).toBe(ADMIN_SESSION_COOKIE);
    expect(value.split('.').length).toBe(3);
    expect(value.startsWith('user-1.')).toBe(true);
    expect(opts.httpOnly).toBe(true);
    expect(opts.sameSite).toBe('lax');
  });

  it('verifyAdminSessionCookie returns the user id for a fresh valid cookie', async () => {
    await setAdminSession('user-1');
    const cookieValue = (
      mockCookieStore.set.mock.calls[0] as unknown as [string, string]
    )[1];
    const result = await verifyAdminSessionCookie(cookieValue);
    expect(result).toEqual({ valid: true, userId: 'user-1' });
  });

  it('verifyAdminSessionCookie rejects a tampered cookie', async () => {
    await setAdminSession('user-1');
    const cookieValue = (
      mockCookieStore.set.mock.calls[0] as unknown as [string, string]
    )[1];
    const tampered = 'user-2' + cookieValue.slice('user-1'.length);
    const result = await verifyAdminSessionCookie(tampered);
    expect(result.valid).toBe(false);
  });

  it('verifyAdminSessionCookie rejects an expired cookie', async () => {
    const oldIssued = Date.now() - (ADMIN_SESSION_IDLE_MS + 60_000);
    const payload = `user-1.${oldIssued}`;
    const { signPayload } = await import('@/lib/admin/admin-session');
    const hmac = await signPayload(payload);
    const cookie = `${payload}.${hmac}`;
    const result = await verifyAdminSessionCookie(cookie);
    expect(result.valid).toBe(false);
  });

  it('clearAdminSession deletes the cookie', async () => {
    await clearAdminSession();
    expect(mockCookieStore.delete).toHaveBeenCalledWith(ADMIN_SESSION_COOKIE);
  });

  it('verifyAdminSessionCookie rejects malformed input', async () => {
    const result = await verifyAdminSessionCookie('not.enough');
    expect(result.valid).toBe(false);
  });
});
