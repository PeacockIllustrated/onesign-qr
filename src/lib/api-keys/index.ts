import { createHash, randomBytes, timingSafeEqual } from 'crypto';
import { createAdminClient } from '@/lib/supabase/admin';

/**
 * Personal API keys — used by the Claude MCP connector (/api/mcp).
 *
 * Format: `lynx_` + 40 base62-ish chars (base64url of 30 random bytes).
 * Only the SHA-256 hash is stored. The plaintext is returned once at creation.
 */

export const API_KEY_PREFIX = 'lynx_';
const KEY_PATTERN = /^lynx_[A-Za-z0-9_-]{40}$/;

export interface ApiKeyContext {
  keyId: string;
  userId: string;
  orgId: string;
}

export function generateApiKey(): { key: string; prefix: string; hash: string } {
  const key = API_KEY_PREFIX + randomBytes(30).toString('base64url');
  return { key, prefix: key.slice(0, 12), hash: hashApiKey(key) };
}

export function hashApiKey(key: string): string {
  return createHash('sha256').update(key).digest('hex');
}

export function looksLikeApiKey(value: string | null | undefined): value is string {
  return typeof value === 'string' && KEY_PATTERN.test(value);
}

/**
 * Pull a key out of `Authorization: Bearer <key>`.
 */
export function extractBearerKey(authHeader: string | null): string | null {
  if (!authHeader) return null;
  const match = /^Bearer\s+(\S+)$/i.exec(authHeader.trim());
  return match ? match[1] : null;
}

/**
 * Resolve a plaintext key to the user + org it acts as.
 * Returns null for unknown, malformed or revoked keys, or if the user is no
 * longer a member of the key's organisation.
 */
export async function verifyApiKey(key: string | null | undefined): Promise<ApiKeyContext | null> {
  if (!looksLikeApiKey(key)) return null;

  const hash = hashApiKey(key);
  const admin = createAdminClient();

  const { data: row, error } = await admin
    .from('api_keys')
    .select('id, user_id, org_id, key_hash, revoked_at')
    .eq('key_hash', hash)
    .maybeSingle();

  if (error || !row || row.revoked_at) return null;

  // Defence in depth: constant-time compare of the stored hash.
  const a = Buffer.from(row.key_hash as string, 'hex');
  const b = Buffer.from(hash, 'hex');
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;

  // Membership can be revoked after the key was issued.
  const { data: membership } = await admin
    .from('organization_members')
    .select('org_id')
    .eq('org_id', row.org_id)
    .eq('user_id', row.user_id)
    .maybeSingle();
  if (!membership) return null;

  // Fire-and-forget usage stamp.
  void admin
    .from('api_keys')
    .update({ last_used_at: new Date().toISOString() })
    .eq('id', row.id)
    .then(() => undefined, () => undefined);

  return { keyId: row.id as string, userId: row.user_id as string, orgId: row.org_id as string };
}
