import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockSupabase = {
  auth: { getUser: vi.fn() },
  from: vi.fn(),
};
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(async () => mockSupabase),
}));

const mockAdmin = { from: vi.fn() };
vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: vi.fn(() => mockAdmin),
}));

const mockIsPlatformAdmin = vi.fn();
vi.mock('@/lib/admin/is-platform-admin', () => ({
  isPlatformAdmin: (...args: unknown[]) => mockIsPlatformAdmin(...args),
}));

import { POST, GET } from '@/app/api/admin/shop/products/route';

function jsonRequest(body: unknown) {
  return new Request('http://localhost:3000/api/admin/shop/products', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('POST /api/admin/shop/products', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns 401 when unauthenticated', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: null },
      error: null,
    });
    const res = await POST(jsonRequest({}));
    expect(res.status).toBe(401);
  });

  it('returns 403 when not a platform admin', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: 'u1' } },
      error: null,
    });
    mockIsPlatformAdmin.mockResolvedValue(false);
    const res = await POST(jsonRequest({
      slug: 'x', name: 'x', category: 'nfc_card', base_price_pence: 1,
    }));
    expect(res.status).toBe(403);
  });

  it('returns 400 on invalid body', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: 'u1' } },
      error: null,
    });
    mockIsPlatformAdmin.mockResolvedValue(true);
    const res = await POST(jsonRequest({ slug: '' }));
    expect(res.status).toBe(400);
  });

  it('returns 201 with the created product', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: 'u1' } },
      error: null,
    });
    mockIsPlatformAdmin.mockResolvedValue(true);

    const single = vi.fn().mockResolvedValue({
      data: {
        id: 'prod-1',
        slug: 'nfc-card',
        name: 'NFC Card',
        category: 'nfc_card',
        base_price_pence: 1000,
        is_active: true,
        created_at: '2026-04-20T00:00:00Z',
      },
      error: null,
    });
    mockAdmin.from.mockReturnValue({
      insert: () => ({ select: () => ({ single }) }),
    });

    const res = await POST(jsonRequest({
      slug: 'nfc-card',
      name: 'NFC Card',
      category: 'nfc_card',
      base_price_pence: 1000,
    }));
    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json.product.slug).toBe('nfc-card');
  });

  it('returns 409 on unique slug conflict', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: 'u1' } },
      error: null,
    });
    mockIsPlatformAdmin.mockResolvedValue(true);

    const single = vi.fn().mockResolvedValue({
      data: null,
      error: { code: '23505', message: 'duplicate' },
    });
    mockAdmin.from.mockReturnValue({
      insert: () => ({ select: () => ({ single }) }),
    });

    const res = await POST(jsonRequest({
      slug: 'dup',
      name: 'dup',
      category: 'nfc_card',
      base_price_pence: 1,
    }));
    expect(res.status).toBe(409);
  });
});

describe('GET /api/admin/shop/products', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns 401 when unauthenticated', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: null },
      error: null,
    });
    const res = await GET();
    expect(res.status).toBe(401);
  });

  it('returns 403 when not a platform admin', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: 'u1' } },
      error: null,
    });
    mockIsPlatformAdmin.mockResolvedValue(false);
    const res = await GET();
    expect(res.status).toBe(403);
  });

  it('returns the product list', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: 'u1' } },
      error: null,
    });
    mockIsPlatformAdmin.mockResolvedValue(true);

    const order = vi.fn().mockResolvedValue({
      data: [
        { id: 'p1', slug: 'a', name: 'A', category: 'nfc_card', base_price_pence: 100, is_active: true },
      ],
      error: null,
    });
    mockAdmin.from.mockReturnValue({
      select: () => ({ order }),
    });

    const res = await GET();
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.products).toHaveLength(1);
  });
});
