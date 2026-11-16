-- Migration: personal API keys (used by the Claude / MCP connector)
--
-- A key lets an external client (Claude, via the MCP endpoint at /api/mcp)
-- act as one user inside one organisation. Only a SHA-256 hash of the key is
-- stored; the plaintext is shown once at creation and never again.
--
-- RLS: a user can read and revoke their own keys. Creation goes through the
-- /api/api-keys route (authenticated client), so INSERT is allowed for the
-- caller's own user_id in an org they belong to. Key lookups from the MCP
-- endpoint use the service-role client and bypass RLS.

BEGIN;

CREATE TABLE IF NOT EXISTS api_keys (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  key_prefix TEXT NOT NULL,            -- first chars of the key, for display only
  key_hash TEXT NOT NULL UNIQUE,       -- hex SHA-256 of the full key
  last_used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  revoked_at TIMESTAMPTZ,

  CONSTRAINT api_keys_name_length CHECK (char_length(name) BETWEEN 1 AND 60)
);

CREATE INDEX IF NOT EXISTS idx_api_keys_user ON api_keys(user_id, created_at DESC);

ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;

CREATE POLICY "api_keys_select_own"
  ON api_keys FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "api_keys_insert_own"
  ON api_keys FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid() AND is_member_of_org(org_id));

-- Only revoking (setting revoked_at) is expected; the route enforces that.
CREATE POLICY "api_keys_update_own"
  ON api_keys FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

COMMIT;
