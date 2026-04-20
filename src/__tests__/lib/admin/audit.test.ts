import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockAdmin = { from: vi.fn() };
vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: vi.fn(() => mockAdmin),
}));

import { logAdminAction } from '@/lib/admin/audit';

describe('logAdminAction', () => {
  beforeEach(() => vi.clearAllMocks());

  it('inserts a row with all fields populated', async () => {
    const insert = vi.fn().mockResolvedValue({ error: null });
    mockAdmin.from.mockReturnValue({ insert });

    await logAdminAction({
      actorUserId: 'u1',
      action: 'view_org',
      targetType: 'organization',
      targetId: 'org-1',
      metadata: { reason: 'support' },
    });

    expect(mockAdmin.from).toHaveBeenCalledWith('platform_audit_log');
    expect(insert).toHaveBeenCalledWith(
      expect.objectContaining({
        actor_user_id: 'u1',
        action: 'view_org',
        target_type: 'organization',
        target_id: 'org-1',
        metadata: { reason: 'support' },
      })
    );
  });

  it('permits optional fields to be null/absent', async () => {
    const insert = vi.fn().mockResolvedValue({ error: null });
    mockAdmin.from.mockReturnValue({ insert });

    await logAdminAction({
      actorUserId: 'u1',
      action: 'heartbeat',
    });

    expect(insert).toHaveBeenCalledWith(
      expect.objectContaining({
        actor_user_id: 'u1',
        action: 'heartbeat',
        target_type: null,
        target_id: null,
        metadata: null,
      })
    );
  });

  it('does not throw on insert error — logs instead', async () => {
    const insert = vi.fn().mockResolvedValue({
      error: { message: 'boom' },
    });
    mockAdmin.from.mockReturnValue({ insert });

    await expect(
      logAdminAction({ actorUserId: 'u1', action: 'test' })
    ).resolves.not.toThrow();
  });
});
