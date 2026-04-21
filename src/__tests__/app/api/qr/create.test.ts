import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockSupabase: any = {
  auth: { getUser: vi.fn() },
  from: vi.fn(),
  rpc: vi.fn(),
};
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(async () => mockSupabase),
}));

vi.mock('@/lib/security/url-validator', () => ({
  validateUrlStrict: vi.fn(async () => ({
    isValid: true,
    normalizedUrl: 'https://example.com/',
  })),
}));

vi.mock('@/lib/security/rate-limiter', () => ({
  checkQrCreateLimit: vi.fn(() => ({ success: true })),
  checkApiLimit: vi.fn(() => ({ success: true })),
  getRateLimitHeaders: vi.fn(() => ({})),
}));

vi.mock('@/lib/org/get-personal-org', () => ({
  getPersonalOrgId: vi.fn(async () => 'org-1'),
}));

const mockGetActiveOrgPlan = vi.fn();
vi.mock('@/lib/org/get-active-org-plan', () => ({
  getActiveOrgPlan: (...args: unknown[]) => mockGetActiveOrgPlan(...args),
}));

vi.mock('@/lib/audit', () => ({
  writeAuditLog: vi.fn(),
}));

import { POST } from '@/app/api/qr/route';

function jsonRequest(body: unknown) {
  return new Request('http://localhost:3000/api/qr', {
    method: 'POST',
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

function setupInsertSuccess() {
  mockSupabase.rpc.mockResolvedValue({ data: 'generated-slug', error: null });
  const single = vi.fn().mockResolvedValue({
    data: { id: 'qr-new-id' },
    error: null,
  });
  const select = vi.fn(() => ({ single }));
  const insert = vi.fn(() => ({ select }));
  const update = vi.fn(() => ({ eq: vi.fn() }));
  mockSupabase.from.mockImplementation((table: string) => {
    if (table === 'qr_codes') return { insert };
    if (table === 'qr_styles') return { update };
    return {};
  });
  return { insert };
}

describe('POST /api/qr — carrier handling', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("defaults carrier to 'qr' when omitted and persists it", async () => {
    setupAuthedUser();
    mockGetActiveOrgPlan.mockResolvedValue('free');
    const { insert } = setupInsertSuccess();

    const res = await POST(jsonRequest({
      name: 'My Link',
      mode: 'managed',
      destination_url: 'https://example.com',
    }));

    expect(res.status).toBe(201);
    expect(insert).toHaveBeenCalledWith(
      expect.objectContaining({ carrier: 'qr' })
    );
  });

  it("rejects carrier='nfc' for free orgs with 403 pro_plan_required", async () => {
    setupAuthedUser();
    mockGetActiveOrgPlan.mockResolvedValue('free');

    const res = await POST(jsonRequest({
      name: 'My Link',
      mode: 'managed',
      destination_url: 'https://example.com',
      carrier: 'nfc',
    }));

    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error).toBe('pro_plan_required');
  });

  it("rejects carrier='both' for free orgs with 403", async () => {
    setupAuthedUser();
    mockGetActiveOrgPlan.mockResolvedValue('free');

    const res = await POST(jsonRequest({
      name: 'My Link',
      mode: 'managed',
      destination_url: 'https://example.com',
      carrier: 'both',
    }));

    expect(res.status).toBe(403);
  });

  it("accepts carrier='both' for pro orgs and persists it", async () => {
    setupAuthedUser();
    mockGetActiveOrgPlan.mockResolvedValue('pro');
    const { insert } = setupInsertSuccess();

    const res = await POST(jsonRequest({
      name: 'My Link',
      mode: 'managed',
      destination_url: 'https://example.com',
      carrier: 'both',
    }));

    expect(res.status).toBe(201);
    expect(insert).toHaveBeenCalledWith(
      expect.objectContaining({ carrier: 'both' })
    );
  });
});
