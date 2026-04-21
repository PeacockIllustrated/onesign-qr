import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockAdminClient: any = {
  from: vi.fn(),
};
vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: vi.fn(() => mockAdminClient),
}));

vi.mock('@/lib/security/url-validator', () => ({
  validateRedirectUrl: vi.fn(() => true),
}));

import { GET } from '@/app/r/[slug]/route';

function mockLookupResult(row: unknown) {
  const single = vi.fn().mockResolvedValue({ data: row, error: null });
  const modeEq = vi.fn(() => ({ single }));
  const slugEq = vi.fn(() => ({ eq: modeEq }));
  const select = vi.fn(() => ({ eq: slugEq }));
  mockAdminClient.from.mockReturnValue({ select });
}

describe('Redirect handler — carrier column does not affect resolution', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("redirects a managed link with carrier='qr' (the default for existing rows)", async () => {
    mockLookupResult({
      id: 'qr-1',
      destination_url: 'https://example.com/menu',
      is_active: true,
      analytics_enabled: false,
    });
    const req = new Request('http://localhost/r/hello', {}) as any;
    const res = await GET(req, { params: Promise.resolve({ slug: 'hello' }) } as any);

    expect(res.status).toBe(307);
    expect(res.headers.get('location')).toBe('https://example.com/menu');
  });

  it("still returns 307 even though the handler never reads carrier", async () => {
    mockLookupResult({
      id: 'qr-2',
      destination_url: 'https://other.example/x',
      is_active: true,
      analytics_enabled: false,
    });
    const req = new Request('http://localhost/r/tag', {}) as any;
    const res = await GET(req, { params: Promise.resolve({ slug: 'tag' }) } as any);

    expect(res.status).toBe(307);
  });
});
