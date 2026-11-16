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
import { UI_RESOURCE_URI, UI_MIME_TYPE } from '@/lib/mcp/ui';

const ctx = { keyId: 'k1', userId: 'user-1', orgId: 'org-1' };

async function connect() {
  const server = createLynxMcpServer(ctx);
  const client = new Client({ name: 'test', version: '1.0.0' });
  const [a, b] = InMemoryTransport.createLinkedPair();
  await Promise.all([server.connect(a), client.connect(b)]);
  return client;
}

describe('Lynx MCP card UI', () => {
  beforeEach(() => {
    db.tables = {};
    db.rpcResults = { generate_qr_unique_slug: ['abc12345'], generate_bio_unique_slug: ['page1234'] };
    process.env.NEXT_PUBLIC_APP_URL = 'https://lynx.test/';
    process.env.MCP_DOWNLOAD_SECRET = 'x'.repeat(40);
  });

  it('serves the card as an MCP Apps resource with the brand font origin allowed', async () => {
    const client = await connect();
    const { resources } = await client.listResources();
    expect(resources.map((r) => r.uri)).toContain(UI_RESOURCE_URI);

    const read = await client.readResource({ uri: UI_RESOURCE_URI });
    const item = read.contents[0] as { mimeType: string; text: string; _meta: any };
    expect(item.mimeType).toBe(UI_MIME_TYPE);
    expect(item._meta.ui.csp.resourceDomains).toEqual(['https://lynx.test']);
    expect(item.text).toContain('https://lynx.test/fonts/Gilroy-Bold.ttf');
    expect(item.text).toContain("'ui/initialize'");
    expect(item.text).not.toContain('__FONT_ORIGIN__');
  });

  it('links the hub, QR and link page tools to the card, and leaves list tools as text', async () => {
    const client = await connect();
    const { tools } = await client.listTools();
    const withUi = tools.filter((t) => (t._meta as any)?.ui?.resourceUri === UI_RESOURCE_URI).map((t) => t.name).sort();
    expect(withUi).toEqual([
      'create_link_page', 'create_qr_code', 'export_qr_code', 'get_link_page', 'get_qr_code',
      'lynx_hub', 'update_link_page', 'update_qr_code',
    ]);
    for (const t of tools.filter((x) => withUi.includes(x.name))) {
      expect((t._meta as any)['ui/resourceUri']).toBe(UI_RESOURCE_URI);
    }
  });

  it('hub summarises codes and pages for the key owner only', async () => {
    db.tables.qr_codes = [
      { id: 'a', owner_id: 'user-1', org_id: 'org-1', name: 'Menu', mode: 'managed', slug: 'menu', destination_url: 'https://a.example', is_active: true, total_scans: 40, deleted_at: null, created_at: '2026-01-02' },
      { id: 'b', owner_id: 'user-1', org_id: 'org-1', name: 'Poster', mode: 'direct', slug: null, destination_url: 'https://b.example', is_active: false, total_scans: 2, deleted_at: null, created_at: '2026-01-03' },
      { id: 'c', owner_id: 'user-2', org_id: 'org-1', name: 'Theirs', mode: 'managed', slug: 'x', destination_url: 'https://c.example', is_active: true, total_scans: 999, deleted_at: null, created_at: '2026-01-04' },
    ];
    db.tables.bio_link_pages = [
      { id: 'p1', owner_id: 'user-1', org_id: 'org-1', title: 'Draft', slug: 'd', is_active: false, total_views: 1, deleted_at: null },
      { id: 'p2', owner_id: 'user-1', org_id: 'org-1', title: 'Live', slug: 'l', is_active: true, total_views: 9, deleted_at: null },
    ];
    const client = await connect();
    const res: any = await client.callTool({ name: 'lynx_hub', arguments: {} });
    const body = res.structuredContent;
    expect(body.view).toBe('hub');
    expect(body.totals).toEqual({ qr_codes: 2, active_qr_codes: 1, total_scans: 42, link_pages: 2, live_link_pages: 1 });
    expect(body.top_qr_codes[0]).toMatchObject({ name: 'Menu', short_link: 'https://lynx.test/r/menu' });
    expect(body.link_pages.map((p: any) => p.title)).toEqual(['Live', 'Draft']);
  });

  it('tags QR and link page results with the view the card should show, with resolved page colours', async () => {
    const client = await connect();
    const qr: any = await client.callTool({ name: 'create_qr_code', arguments: { name: 'A', destination_url: 'https://a.example' } });
    expect(qr.structuredContent.view).toBe('qr');

    const page: any = await client.callTool({ name: 'create_link_page', arguments: { title: 'Cafe', theme: 'midnight', links: [{ title: 'Menu', url: 'https://a.example/menu' }] } });
    expect(page.structuredContent.view).toBe('link_page');
    expect(page.structuredContent.link_page.design).toMatchObject({ theme: 'midnight', text: '#F8FAFC' });
  });
});
