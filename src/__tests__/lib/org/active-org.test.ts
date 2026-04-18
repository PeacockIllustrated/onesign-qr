import { describe, it, expect, vi } from 'vitest';
import {
  lookupMembership,
  firstOrgForUser,
  ACTIVE_ORG_COOKIE,
  ACTIVE_ORG_COOKIE_OPTIONS,
} from '@/lib/org/active-org';
import type { SupabaseClient } from '@supabase/supabase-js';

const VALID_ORG = '11111111-1111-1111-1111-111111111111';
const USER = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';

type ChainStub = Record<string, ReturnType<typeof vi.fn>>;

function mockClient(chain: (query: ChainStub) => void): SupabaseClient {
  const query: ChainStub = {};
  chain(query);
  return { from: vi.fn().mockReturnValue(query) } as unknown as SupabaseClient;
}

describe('lookupMembership', () => {
  it('returns null for a non-UUID org id without hitting the DB', async () => {
    const client = mockClient((q) => {
      q.select = vi.fn();
    });
    expect(await lookupMembership(client, USER, 'not-a-uuid')).toBeNull();
    expect(client.from).not.toHaveBeenCalled();
  });

  it('returns null when the membership row does not exist', async () => {
    const client = mockClient((q) => {
      q.select = vi.fn().mockReturnValue(q);
      q.eq = vi.fn().mockReturnValue(q);
      q.maybeSingle = vi.fn().mockResolvedValue({ data: null, error: null });
    });
    expect(await lookupMembership(client, USER, VALID_ORG)).toBeNull();
  });

  it('returns null if the org is soft-deleted', async () => {
    const client = mockClient((q) => {
      q.select = vi.fn().mockReturnValue(q);
      q.eq = vi.fn().mockReturnValue(q);
      q.maybeSingle = vi.fn().mockResolvedValue({
        data: {
          org_id: VALID_ORG,
          role: 'owner',
          organizations: { slug: 'x', deleted_at: '2026-01-01T00:00:00Z' },
        },
        error: null,
      });
    });
    expect(await lookupMembership(client, USER, VALID_ORG)).toBeNull();
  });

  it('returns the active context for a live membership', async () => {
    const client = mockClient((q) => {
      q.select = vi.fn().mockReturnValue(q);
      q.eq = vi.fn().mockReturnValue(q);
      q.maybeSingle = vi.fn().mockResolvedValue({
        data: {
          org_id: VALID_ORG,
          role: 'admin',
          organizations: { slug: 'x', deleted_at: null },
        },
        error: null,
      });
    });
    expect(await lookupMembership(client, USER, VALID_ORG)).toEqual({
      userId: USER,
      orgId: VALID_ORG,
      role: 'admin',
    });
  });
});

describe('firstOrgForUser', () => {
  it('returns null when the user has no memberships', async () => {
    const client = mockClient((q) => {
      q.select = vi.fn().mockReturnValue(q);
      q.eq = vi.fn().mockResolvedValue({ data: [], error: null });
    });
    expect(await firstOrgForUser(client, USER)).toBeNull();
  });

  it('filters out soft-deleted orgs', async () => {
    const client = mockClient((q) => {
      q.select = vi.fn().mockReturnValue(q);
      q.eq = vi.fn().mockResolvedValue({
        data: [
          {
            org_id: VALID_ORG,
            role: 'owner',
            organizations: { slug: 'x', deleted_at: '2026-01-01T00:00:00Z' },
          },
        ],
        error: null,
      });
    });
    expect(await firstOrgForUser(client, USER)).toBeNull();
  });

  it('prefers owner over admin over member', async () => {
    const client = mockClient((q) => {
      q.select = vi.fn().mockReturnValue(q);
      q.eq = vi.fn().mockResolvedValue({
        data: [
          { org_id: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', role: 'member', organizations: { slug: 'a', deleted_at: null } },
          { org_id: VALID_ORG, role: 'owner', organizations: { slug: 'b', deleted_at: null } },
          { org_id: 'cccccccc-cccc-cccc-cccc-cccccccccccc', role: 'admin', organizations: { slug: 'c', deleted_at: null } },
        ],
        error: null,
      });
    });
    const result = await firstOrgForUser(client, USER);
    expect(result?.orgId).toBe(VALID_ORG);
    expect(result?.role).toBe('owner');
  });
});

describe('cookie constants', () => {
  it('uses secure defaults', () => {
    expect(ACTIVE_ORG_COOKIE).toBe('oneSignActiveOrg');
    expect(ACTIVE_ORG_COOKIE_OPTIONS.httpOnly).toBe(true);
    expect(ACTIVE_ORG_COOKIE_OPTIONS.secure).toBe(true);
    expect(ACTIVE_ORG_COOKIE_OPTIONS.sameSite).toBe('lax');
    expect(ACTIVE_ORG_COOKIE_OPTIONS.path).toBe('/');
  });
});
