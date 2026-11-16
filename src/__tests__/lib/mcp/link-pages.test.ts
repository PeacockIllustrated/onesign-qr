// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { FakeDb } from './fake-supabase';

const db = new FakeDb();
vi.mock('@/lib/supabase/admin', () => ({ createAdminClient: () => db }));
vi.mock('@/lib/audit', () => ({
  writeAuditLog: vi.fn(async () => undefined),
  writeBioAuditLog: vi.fn(async () => undefined),
  determineUpdateAction: vi.fn(() => 'updated'),
}));
vi.mock('@/lib/security/url-validator-strict', () => ({
  validateUrlStrict: vi.fn(async (url: string) => ({ isValid: true, normalizedUrl: url })),
}));

import { createLynxMcpServer } from '@/lib/mcp/server';

const ctx = { keyId: 'k1', userId: 'user-1', orgId: 'org-1' };

async function connect() {
  const server = createLynxMcpServer(ctx);
  const client = new Client({ name: 'test', version: '1.0.0' });
  const [a, b] = InMemoryTransport.createLinkedPair();
  await Promise.all([server.connect(a), client.connect(b)]);
  return client;
}

const json = (r: any) => JSON.parse(r.content.find((c: any) => c.type === 'text').text);

describe('Lynx MCP link pages', () => {
  beforeEach(() => {
    db.tables = {};
    db.rpcResults = {
      generate_bio_unique_slug: ['page1234', 'page5678'],
      generate_qr_unique_slug: ['qr123456'],
    };
    process.env.NEXT_PUBLIC_APP_URL = 'https://lynx.test';
    process.env.QR_REDIRECT_BASE_URL = 'https://lynx.test';
    process.env.MCP_DOWNLOAD_SECRET = 'x'.repeat(40);
  });

  it('creates a live link page with socials and links in grid order', async () => {
    const client = await connect();
    const res: any = await client.callTool({
      name: 'create_link_page',
      arguments: {
        title: 'The Copper Kettle',
        bio: 'Independent café in Gateshead',
        theme: 'nature',
        accent_color: '#58A386',
        links: [
          { title: 'Menu', url: 'https://kettle.example/menu', icon: '🍰' },
          { title: 'Book a table', url: 'https://kettle.example/book' },
        ],
        social: [
          { platform: 'instagram', url: 'https://instagram.com/kettle' },
          { platform: 'email', url: 'hello@kettle.example' },
        ],
      },
    });

    expect(res.isError).toBeFalsy();
    const body = json(res);
    expect(body.link_page.status).toBe('live');
    expect(body.link_page.page_url).toBe('https://lynx.test/p/page1234');
    expect(body.link_page.links.map((l: any) => l.title)).toEqual(['Menu', 'Book a table']);
    expect(body.link_page.social[1].url).toBe('mailto:hello@kettle.example');

    const page = db.tables.bio_link_pages[0];
    expect(page).toMatchObject({ owner_id: 'user-1', org_id: 'org-1', theme: 'nature', custom_accent_color: '#58A386', is_active: true });
    const rows = db.tables.bio_blocks.map((b) => [b.block_type, b.grid_row]);
    expect(rows).toEqual([['social_icons', 0], ['link', 1], ['link', 2]]);
  });

  it('saves a second page as a draft and can create a QR for it', async () => {
    db.tables.bio_link_pages = [{ id: 'live-1', owner_id: 'user-1', org_id: 'org-1', slug: 'live', title: 'Live', is_active: true, deleted_at: null }];
    const client = await connect();
    const res: any = await client.callTool({
      name: 'create_link_page',
      arguments: { title: 'Summer event', create_qr: true },
    });
    expect(res.isError).toBeFalsy();
    expect(res.content.some((c: any) => c.type === 'image')).toBe(true);
    const body = json(res);
    expect(body.link_page.status).toBe('draft');
    expect(body.qr_code.destination_url).toBe('https://lynx.test/p/page1234');

    const page = db.tables.bio_link_pages.find((p) => p.title === 'Summer event')!;
    expect(page.qr_code_id).toBe(body.qr_code.id);
  });

  it('rejects bad link URLs before creating anything', async () => {
    const client = await connect();
    const res: any = await client.callTool({
      name: 'create_link_page',
      arguments: { title: 'X', links: [{ title: 'Bad', url: 'javascript:alert(1)' }] },
    });
    expect(res.isError).toBe(true);
    expect(db.tables.bio_link_pages ?? []).toHaveLength(0);
  });

  it('adds and removes links, and publishing swaps the live page', async () => {
    db.tables.bio_link_pages = [{ id: 'live-1', owner_id: 'user-1', org_id: 'org-1', slug: 'live', title: 'Live', is_active: true, deleted_at: null }];
    const client = await connect();
    const created = json(await client.callTool({
      name: 'create_link_page',
      arguments: { title: 'New', links: [{ title: 'A', url: 'https://a.example' }] },
    }));
    const id = created.link_page.id;
    const linkA = created.link_page.links[0].id;

    const updated: any = await client.callTool({
      name: 'update_link_page',
      arguments: { id, add_links: [{ title: 'B', url: 'https://b.example' }], remove_link_ids: [linkA], publish: true },
    });
    const body = json(updated);
    expect(body.link_page.links.map((l: any) => l.title)).toEqual(['B']);
    expect(body.link_page.status).toBe('live');
    expect(db.tables.bio_link_pages.find((p) => p.id === 'live-1')!.is_active).toBe(false);
  });

  it('cannot see pages from another user or org', async () => {
    db.tables.bio_link_pages = [
      { id: '11111111-1111-4111-8111-111111111111', owner_id: 'user-2', org_id: 'org-1', slug: 'a', title: 'Theirs', is_active: true, deleted_at: null },
      { id: '22222222-2222-4222-8222-222222222222', owner_id: 'user-1', org_id: 'org-9', slug: 'b', title: 'Other org', is_active: false, deleted_at: null },
    ];
    const client = await connect();
    expect(json(await client.callTool({ name: 'list_link_pages', arguments: {} })).total).toBe(0);
    const get: any = await client.callTool({ name: 'get_link_page', arguments: { id: '11111111-1111-4111-8111-111111111111' } });
    expect(get.isError).toBe(true);
  });
});
