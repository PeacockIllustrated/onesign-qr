import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockClient: any = {
  from: vi.fn(),
};

const mockResolveActiveOrgId = vi.fn();
vi.mock('@/lib/org/active-org', () => ({
  resolveActiveOrgId: (...args: unknown[]) => mockResolveActiveOrgId(...args),
}));

import { getActiveOrgPlan } from '@/lib/org/get-active-org-plan';

function mockSelectSingle(result: { data: unknown; error: unknown }) {
  const single = vi.fn().mockResolvedValue(result);
  const eq = vi.fn(() => ({ single }));
  const select = vi.fn(() => ({ eq }));
  mockClient.from.mockReturnValue({ select });
  return { single, eq, select };
}

describe('getActiveOrgPlan', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 'pro' when the active org is on the pro plan", async () => {
    mockResolveActiveOrgId.mockResolvedValue({ orgId: 'org-1', wasReset: false });
    mockSelectSingle({ data: { plan: 'pro' }, error: null });

    const plan = await getActiveOrgPlan(mockClient, 'user-1');

    expect(plan).toBe('pro');
    expect(mockClient.from).toHaveBeenCalledWith('organizations');
  });

  it("returns 'free' when the active org is on the free plan", async () => {
    mockResolveActiveOrgId.mockResolvedValue({ orgId: 'org-1', wasReset: false });
    mockSelectSingle({ data: { plan: 'free' }, error: null });

    const plan = await getActiveOrgPlan(mockClient, 'user-1');

    expect(plan).toBe('free');
  });

  it("defaults to 'free' when the lookup errors", async () => {
    mockResolveActiveOrgId.mockResolvedValue({ orgId: 'org-1', wasReset: false });
    mockSelectSingle({ data: null, error: { message: 'boom' } });

    const plan = await getActiveOrgPlan(mockClient, 'user-1');

    expect(plan).toBe('free');
  });
});
