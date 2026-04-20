import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockAdmin = { from: vi.fn() };
vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: vi.fn(() => mockAdmin),
}));

import { isPlatformAdmin } from '@/lib/admin/is-platform-admin';

function mockResult(data: { user_id: string } | null) {
  const maybeSingle = vi.fn().mockResolvedValue({
    data,
    error: null,
  });
  const eq = vi.fn().mockReturnValue({ maybeSingle });
  const select = vi.fn().mockReturnValue({ eq });
  mockAdmin.from.mockReturnValue({ select });
}

describe('isPlatformAdmin', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns true when platform_admins row exists', async () => {
    mockResult({ user_id: 'u1' });
    expect(await isPlatformAdmin('u1')).toBe(true);
  });

  it('returns false when no row matches', async () => {
    mockResult(null);
    expect(await isPlatformAdmin('u1')).toBe(false);
  });

  it('returns false for empty user id (defensive)', async () => {
    expect(await isPlatformAdmin('')).toBe(false);
    expect(mockAdmin.from).not.toHaveBeenCalled();
  });
});
