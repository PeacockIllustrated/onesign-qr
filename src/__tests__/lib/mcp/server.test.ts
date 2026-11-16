// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { FakeDb } from './fake-supabase';

const db = new FakeDb();
vi.mock('@/lib/supabase/admin', () => ({ createAdminClient: () => db }));
vi.mock('@/lib/audit', () => ({
  writeAuditLog: vi.fn(async () => undefined),
  determineUpdateAction: vi.fn(() => 'updated'),
}));
vi.mock('@/lib/security/url-validator-strict', () => ({
  validateUrlStrict: vi.fn(async (url: string) =>
    url.startsWith('https://')
      ? { isValid: true, normalizedUrl: url }
      : { isValid: false, error: 'URL must use https' }
  ),
}));

import { createLynxMcpServer } from '@/lib/mcp/server';
import { verifyDownloadToken } from '@/lib/mcp/download-token';

const ctx = { keyId: 'k1', userId: 'user-1', orgId: 'org-1' };

async function connect() {
  const server = createLynxMcpServer(ctx);
  const client = new Client({ name: 'test', version: '1.0.0' });
  const [a, b] = InMemoryTransport.createLinkedPair();
  await Promise.all([server.connect(a), client.connect(b)]);
  return client;
}

function json(result: any) {
  const text = result.content.find((c: any) => c.type === 'text').text;
  return JSON.parse(text);
}

describe('Lynx MCP server', () => {
  beforeEach(() => {
    db.tables = {};
    db.rpcResults = { generate_qr_unique_slug: ['abc12345', 'xyz98765'] };
    process.env.NEXT_PUBLIC_APP_URL = 'https://lynx.test';
    process.env.QR_REDIRECT_BASE_URL = 'https://lynx.test';
    process.env.MCP_DOWNLOAD_SECRET = 'x'.repeat(40);
  });

  it('exposes the QR tools', async () => {
    const client = await connect();
    const { tools } = await client.listTools();
    expect(tools.map((t) => t.name).sort()).toEqual([
      'create_qr_code', 'export_qr_code', 'get_qr_analytics', 'get_qr_code', 'list_qr_codes', 'update_qr_code',
    ]);
  });

  it('creates a managed QR code scoped to the key owner and org, with preview and downloads', async () => {
    const client = await connect();
    const result: any = await client.callTool({
      name: 'create_qr_code',
      arguments: { name: 'Cafe menu', destination_url: 'https://example.com/menu', foreground_color: '#1E3A2F', module_shape: 'dots' },
    });

    expect(result.isError).toBeFalsy();
    const image = result.content.find((c: any) => c.type === 'image');
    expect(image.mimeType).toBe('image/png');
    expect(Buffer.from(image.data, 'base64').subarray(1, 4).toString()).toBe('PNG');

    const body = json(result);
    expect(body.qr_code.short_link).toBe('https://lynx.test/r/abc12345');
    expect(body.qr_code.encodes).toBe('https://lynx.test/r/abc12345');
    expect(body.qr_code.style.foreground_color).toBe('#1E3A2F');
    expect(body.qr_code.style.module_shape).toBe('dots');

    const row = db.tables.qr_codes[0];
    expect(row).toMatchObject({ owner_id: 'user-1', org_id: 'org-1', mode: 'managed', carrier: 'qr' });

    const token = body.downloads.svg.split('/api/mcp/download/')[1];
    expect(verifyDownloadToken(token)).toMatchObject({ qrId: row.id, userId: 'user-1', orgId: 'org-1', format: 'svg' });
  });

  it('rejects unsafe destinations', async () => {
    const client = await connect();
    const result: any = await client.callTool({
      name: 'create_qr_code',
      arguments: { name: 'Bad', destination_url: 'javascript:alert(1)' },
    });
    expect(result.isError).toBe(true);
    expect(db.tables.qr_codes ?? []).toHaveLength(0);
  });

  it('reports a taken custom slug instead of silently picking another', async () => {
    const client = await connect();
    await client.callTool({ name: 'create_qr_code', arguments: { name: 'A', destination_url: 'https://a.com', slug: 'menu' } });
    const second: any = await client.callTool({ name: 'create_qr_code', arguments: { name: 'B', destination_url: 'https://b.com', slug: 'menu' } });
    expect(second.isError).toBe(true);
    expect(second.content[0].text).toContain('already taken');
  });

  it('does not list or fetch codes belonging to another user or org', async () => {
    db.tables.qr_codes = [
      { id: '11111111-1111-4111-8111-111111111111', owner_id: 'user-2', org_id: 'org-1', name: 'Theirs', mode: 'direct', slug: null, destination_url: 'https://x.com', deleted_at: null },
      { id: '22222222-2222-4222-8222-222222222222', owner_id: 'user-1', org_id: 'org-9', name: 'Other org', mode: 'direct', slug: null, destination_url: 'https://y.com', deleted_at: null },
    ];
    const client = await connect();
    const list: any = await client.callTool({ name: 'list_qr_codes', arguments: {} });
    expect(json(list).total).toBe(0);

    const get: any = await client.callTool({ name: 'get_qr_code', arguments: { id: '11111111-1111-4111-8111-111111111111' } });
    expect(get.isError).toBe(true);
  });

  it('updates the destination of a managed code', async () => {
    const client = await connect();
    const created: any = await client.callTool({ name: 'create_qr_code', arguments: { name: 'Menu', destination_url: 'https://example.com/old' } });
    const id = json(created).qr_code.id;

    const updated: any = await client.callTool({ name: 'update_qr_code', arguments: { id, destination_url: 'https://example.com/new' } });
    expect(updated.isError).toBeFalsy();
    const body = json(updated);
    expect(body.qr_code.destination_url).toBe('https://example.com/new');
    expect(body.qr_code.encodes).toBe('https://lynx.test/r/abc12345');
    expect(body.notes[0]).toContain('Printed copies keep working');
  });

  it('searches by name', async () => {
    const client = await connect();
    await client.callTool({ name: 'create_qr_code', arguments: { name: 'Window poster', destination_url: 'https://a.com' } });
    await client.callTool({ name: 'create_qr_code', arguments: { name: 'Table talker', destination_url: 'https://b.com' } });
    const res: any = await client.callTool({ name: 'list_qr_codes', arguments: { search: 'table' } });
    const body = json(res);
    expect(body.total).toBe(1);
    expect(body.qr_codes[0].name).toBe('Table talker');
  });
});
