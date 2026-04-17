// src/__tests__/app/r/slug-route.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// Mock the admin client module before importing the route handler.
vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: vi.fn(),
}));

// Mock url-validator to isolate handler branching.
vi.mock('@/lib/security/url-validator', () => ({
  validateRedirectUrl: vi.fn().mockReturnValue(true),
}));

import { createAdminClient } from '@/lib/supabase/admin';
import { GET } from '@/app/r/[slug]/route';

type QrRow = {
  id: string;
  destination_url: string;
  is_active: boolean;
  analytics_enabled: boolean;
};

function mockAdminClientWith(row: QrRow | null, error: unknown = null) {
  const single = vi.fn().mockResolvedValue({ data: row, error });
  const eqMode = vi.fn().mockReturnValue({ single });
  const eqSlug = vi.fn().mockReturnValue({ eq: eqMode });
  const select = vi.fn().mockReturnValue({ eq: eqSlug });
  const from = vi.fn().mockReturnValue({ select });
  const insert = vi.fn().mockResolvedValue({ error: null });

  // Second from() call (for scan_events insert) also routes through from.
  from.mockImplementation((table: string) => {
    if (table === 'qr_codes') return { select };
    if (table === 'qr_scan_events') return { insert };
    throw new Error(`Unexpected table: ${table}`);
  });

  (createAdminClient as ReturnType<typeof vi.fn>).mockReturnValue({ from });
  return { from, select, insert };
}

function mkRequest() {
  return new NextRequest('http://localhost:3000/r/test-slug', {
    headers: { 'user-agent': 'test' },
  });
}

function paramsFor(slug: string) {
  return { params: Promise.resolve({ slug }) };
}

describe('GET /r/[slug]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.IP_HASH_SALT = 'test-salt';
  });

  it('redirects with 307 to destination_url for an active managed QR', async () => {
    mockAdminClientWith({
      id: 'qr-1',
      destination_url: 'https://example.com/menu',
      is_active: true,
      analytics_enabled: false,
    });

    const res = await GET(mkRequest(), paramsFor('test-slug'));

    expect(res.status).toBe(307);
    expect(res.headers.get('location')).toBe('https://example.com/menu');
  });

  it('redirects to /?error=qr-not-found when the slug does not exist', async () => {
    mockAdminClientWith(null, { code: 'PGRST116' });

    const res = await GET(mkRequest(), paramsFor('missing'));

    expect(res.status).toBe(307);
    expect(res.headers.get('location')).toContain('error=qr-not-found');
  });

  it('redirects to /?error=qr-inactive when is_active is false', async () => {
    mockAdminClientWith({
      id: 'qr-1',
      destination_url: 'https://example.com/menu',
      is_active: false,
      analytics_enabled: false,
    });

    const res = await GET(mkRequest(), paramsFor('inactive-slug'));

    expect(res.status).toBe(307);
    expect(res.headers.get('location')).toContain('error=qr-inactive');
  });

  it('selects exactly the columns the handler relies on', async () => {
    const { select } = mockAdminClientWith({
      id: 'qr-1',
      destination_url: 'https://example.com/menu',
      is_active: true,
      analytics_enabled: false,
    });

    await GET(mkRequest(), paramsFor('test-slug'));

    // This assertion locks the select list. Adding or removing columns here
    // means the redirect handler's contract has changed — deliberate change
    // required.
    expect(select).toHaveBeenCalledWith(
      'id, destination_url, is_active, analytics_enabled'
    );
  });

  it('records a scan event when analytics_enabled is true', async () => {
    const { insert } = mockAdminClientWith({
      id: 'qr-1',
      destination_url: 'https://example.com/menu',
      is_active: true,
      analytics_enabled: true,
    });

    await GET(mkRequest(), paramsFor('test-slug'));

    // Allow the fire-and-forget insert microtask to run.
    await new Promise((r) => setTimeout(r, 0));

    expect(insert).toHaveBeenCalledTimes(1);
  });

  it('does not record a scan event when analytics_enabled is false', async () => {
    const { insert } = mockAdminClientWith({
      id: 'qr-1',
      destination_url: 'https://example.com/menu',
      is_active: true,
      analytics_enabled: false,
    });

    await GET(mkRequest(), paramsFor('test-slug'));
    await new Promise((r) => setTimeout(r, 0));

    expect(insert).not.toHaveBeenCalled();
  });
});
