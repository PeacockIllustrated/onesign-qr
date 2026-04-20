import { describe, it, expect, vi } from 'vitest';
import { getPersonalOrgId } from '@/lib/org/get-personal-org';

type MaybeRow = { org_id: string } | null;

function mockSupabaseReturning(data: MaybeRow, error: unknown = null) {
  const single = vi.fn().mockResolvedValue({ data, error });
  const eq = vi.fn().mockReturnValue({ single });
  const select = vi.fn().mockReturnValue({ eq });
  const from = vi.fn().mockReturnValue({ select });
  return { from } as unknown as {
    from: ReturnType<typeof vi.fn>;
  };
}

describe('getPersonalOrgId', () => {
  it('returns the org_id when the user has exactly one membership', async () => {
    const client = mockSupabaseReturning({ org_id: 'org-123' });
    const orgId = await getPersonalOrgId(client as never, 'user-1');
    expect(orgId).toBe('org-123');
  });

  it('throws when no membership exists for the user', async () => {
    const client = mockSupabaseReturning(null, {
      code: 'PGRST116',
      message: 'not found',
    });
    await expect(
      getPersonalOrgId(client as never, 'user-1')
    ).rejects.toThrow(/no organisation/i);
  });

  it('throws when the query errors for an unrelated reason', async () => {
    const client = mockSupabaseReturning(null, {
      code: 'XX000',
      message: 'internal error',
    });
    await expect(
      getPersonalOrgId(client as never, 'user-1')
    ).rejects.toThrow(/internal error/i);
  });

  it('queries organization_members filtered by user_id', async () => {
    const client = mockSupabaseReturning({ org_id: 'org-1' });
    await getPersonalOrgId(client as never, 'user-abc');

    expect(client.from).toHaveBeenCalledWith('organization_members');
    const selectCall = client.from.mock.results[0].value.select;
    expect(selectCall).toHaveBeenCalledWith('org_id');
    const eqCall = selectCall.mock.results[0].value.eq;
    expect(eqCall).toHaveBeenCalledWith('user_id', 'user-abc');
  });
});
