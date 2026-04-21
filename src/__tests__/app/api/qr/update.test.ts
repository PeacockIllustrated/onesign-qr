import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockSupabase: any = {
  auth: { getUser: vi.fn() },
  from: vi.fn(),
};
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(async () => mockSupabase),
}));

vi.mock('@/lib/security/rate-limiter', () => ({
  checkApiLimit: vi.fn(() => ({ success: true })),
  getRateLimitHeaders: vi.fn(() => ({})),
}));

const mockGetActiveOrgPlan = vi.fn();
vi.mock('@/lib/org/get-active-org-plan', () => ({
  getActiveOrgPlan: (...args: unknown[]) => mockGetActiveOrgPlan(...args),
}));

vi.mock('@/lib/audit', () => ({
  writeAuditLog: vi.fn(),
  determineUpdateAction: vi.fn(() => 'updated'),
}));

import { PATCH } from '@/app/api/qr/[id]/route';

const VALID_UUID = '11111111-1111-4111-a111-111111111111';

function jsonRequest(body: unknown) {
  return new Request(`http://localhost:3000/api/qr/${VALID_UUID}`, {
    method: 'PATCH',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  }) as any;
}

function setupAuthedUser() {
  mockSupabase.auth.getUser.mockResolvedValue({
    data: { user: { id: 'user-1' } },
    error: null,
  });
}

function setupExistingQR(mode: 'managed' | 'direct' = 'managed') {
  // ownership-fetch chain: from().select().eq().eq().is().single()
  const single = vi.fn().mockResolvedValue({
    data: {
      id: VALID_UUID,
      owner_id: 'user-1',
      mode,
      destination_url: 'https://old.example.com',
      name: 'Existing',
      is_active: true,
      analytics_enabled: true,
    },
    error: null,
  });
  const isMethod = vi.fn(() => ({ single }));
  const eq2 = vi.fn(() => ({ is: isMethod }));
  const eq1 = vi.fn(() => ({ eq: eq2 }));

  // update chain: from().update().eq().eq()
  const updateEq2 = vi.fn().mockResolvedValue({ error: null });
  const updateEq1 = vi.fn(() => ({ eq: updateEq2 }));
  const update = vi.fn(() => ({ eq: updateEq1 }));

  // post-update re-fetch chain: from().select().eq().single()
  const fetchSingle = vi
    .fn()
    .mockResolvedValue({ data: { id: VALID_UUID, carrier: 'qr' } });
  const fetchEqSingle = vi.fn(() => ({ single: fetchSingle }));

  // Use a call counter so mockImplementation (not Once) routes correctly
  let qrFromCallCount = 0;
  mockSupabase.from.mockImplementation((table: string) => {
    if (table === 'qr_codes') {
      qrFromCallCount++;
      if (qrFromCallCount === 1) {
        // ownership fetch: select().eq().eq().is().single()
        return { select: vi.fn(() => ({ eq: eq1 })), update };
      }
      if (qrFromCallCount === 2) {
        // update: .update().eq().eq()
        return { update };
      }
      // re-fetch: select().eq().single()
      return { select: vi.fn(() => ({ eq: fetchEqSingle })) };
    }
    if (table === 'qr_styles') {
      return { update: vi.fn(() => ({ eq: vi.fn().mockResolvedValue({ error: null }) })) };
    }
    return {};
  });

  return { update };
}

async function callPatch(body: unknown) {
  return PATCH(jsonRequest(body), { params: Promise.resolve({ id: VALID_UUID }) } as any);
}

describe('PATCH /api/qr/[id] — carrier handling', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejects carrier='nfc' for free orgs with 403 pro_plan_required", async () => {
    setupAuthedUser();
    setupExistingQR();
    mockGetActiveOrgPlan.mockResolvedValue('free');

    const res = await callPatch({ carrier: 'nfc' });

    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error).toBe('pro_plan_required');
  });

  it("accepts carrier='both' for pro orgs and writes it", async () => {
    setupAuthedUser();
    const { update } = setupExistingQR();
    mockGetActiveOrgPlan.mockResolvedValue('pro');

    const res = await callPatch({ carrier: 'both' });

    expect(res.status).toBe(200);
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({ carrier: 'both' })
    );
  });

  it("accepts carrier='qr' for free orgs", async () => {
    setupAuthedUser();
    const { update } = setupExistingQR();
    mockGetActiveOrgPlan.mockResolvedValue('free');

    const res = await callPatch({ carrier: 'qr' });

    expect(res.status).toBe(200);
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({ carrier: 'qr' })
    );
  });
});
