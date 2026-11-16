// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { FakeDb } from './fake-supabase';

const db = new FakeDb();
vi.mock('@/lib/supabase/admin', () => ({ createAdminClient: () => db }));
vi.mock('server-only', () => ({}));

import {
  generateApiKey,
  hashApiKey,
  extractBearerKey,
  looksLikeApiKey,
  verifyApiKey,
} from '@/lib/api-keys';
import { createDownloadToken, verifyDownloadToken } from '@/lib/mcp/download-token';
import { handleMcpRequest } from '@/lib/mcp/handler';

describe('API keys', () => {
  beforeEach(() => {
    db.tables = {};
  });

  it('generates well-formed keys and stores only a hash', () => {
    const { key, prefix, hash } = generateApiKey();
    expect(looksLikeApiKey(key)).toBe(true);
    expect(key.startsWith(prefix)).toBe(true);
    expect(hash).toBe(hashApiKey(key));
    expect(hash).not.toContain(key);
  });

  it('extracts bearer tokens', () => {
    expect(extractBearerKey('Bearer lynx_abc')).toBe('lynx_abc');
    expect(extractBearerKey('Basic xyz')).toBeNull();
    expect(extractBearerKey(null)).toBeNull();
  });

  it('verifies active keys for current org members only', async () => {
    const { key, hash } = generateApiKey();
    db.tables.api_keys = [{ id: 'k1', user_id: 'u1', org_id: 'o1', key_hash: hash, revoked_at: null }];
    db.tables.organization_members = [{ user_id: 'u1', org_id: 'o1' }];

    expect(await verifyApiKey(key)).toEqual({ keyId: 'k1', userId: 'u1', orgId: 'o1' });

    db.tables.organization_members = [];
    expect(await verifyApiKey(key)).toBeNull();
  });

  it('rejects revoked, unknown and malformed keys', async () => {
    const { key, hash } = generateApiKey();
    db.tables.api_keys = [{ id: 'k1', user_id: 'u1', org_id: 'o1', key_hash: hash, revoked_at: '2026-01-01' }];
    db.tables.organization_members = [{ user_id: 'u1', org_id: 'o1' }];
    expect(await verifyApiKey(key)).toBeNull();
    expect(await verifyApiKey(generateApiKey().key)).toBeNull();
    expect(await verifyApiKey('not-a-key')).toBeNull();
  });

  it('MCP endpoint returns 401 without a valid key', async () => {
    const res = await handleMcpRequest(
      new Request('https://lynx.test/api/mcp', {
        method: 'POST',
        headers: { 'content-type': 'application/json', accept: 'application/json, text/event-stream' },
        body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/list' }),
      })
    );
    expect(res.status).toBe(401);
  });

  it('MCP endpoint serves tools over HTTP with a key in the Bearer header or the URL path', async () => {
    const { key, hash } = generateApiKey();
    db.tables.api_keys = [{ id: 'k1', user_id: 'u1', org_id: 'o1', key_hash: hash, revoked_at: null }];
    db.tables.organization_members = [{ user_id: 'u1', org_id: 'o1' }];

    const call = (headers: Record<string, string>, pathKey?: string) =>
      handleMcpRequest(
        new Request('https://lynx.test/api/mcp', {
          method: 'POST',
          headers: { 'content-type': 'application/json', accept: 'application/json, text/event-stream', ...headers },
          body: JSON.stringify({
            jsonrpc: '2.0', id: 1, method: 'initialize',
            params: { protocolVersion: '2025-06-18', capabilities: {}, clientInfo: { name: 't', version: '1' } },
          }),
        }),
        pathKey
      );

    for (const res of [await call({ authorization: `Bearer ${key}` }), await call({}, key)]) {
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.result.serverInfo.name).toBe('lynx-qr');
      expect(body.result.capabilities.tools).toBeDefined();
    }
  });
});

describe('download tokens', () => {
  beforeEach(() => {
    process.env.MCP_DOWNLOAD_SECRET = 's'.repeat(40);
  });

  const payload = { qrId: 'q1', userId: 'u1', orgId: 'o1', format: 'png' as const, size: 1024 };

  it('round-trips', () => {
    expect(verifyDownloadToken(createDownloadToken(payload))).toMatchObject(payload);
  });

  it('rejects tampered tokens', () => {
    const token = createDownloadToken(payload);
    const [body, sig] = token.split('.');
    const forged = Buffer.from(JSON.stringify({ ...payload, qrId: 'q2', exp: 9e9 })).toString('base64url');
    expect(verifyDownloadToken(`${forged}.${sig}`)).toBeNull();
    expect(verifyDownloadToken(`${body}.AAAA`)).toBeNull();
  });

  it('rejects expired tokens', () => {
    expect(verifyDownloadToken(createDownloadToken(payload, -1))).toBeNull();
  });
});
