-- Migration: platform_audit_log — every super-admin action logged
--
-- Records who (platform_admin user_id), what (action string + target),
-- when (created_at), and any action-specific metadata (JSON). Read/write
-- restricted to platform admins via RLS using the existing
-- is_platform_admin() helper from 00018.

BEGIN;

CREATE TABLE IF NOT EXISTS platform_audit_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  actor_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  target_type TEXT,
  target_id TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_platform_audit_log_created
  ON platform_audit_log(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_platform_audit_log_actor
  ON platform_audit_log(actor_user_id, created_at DESC);

ALTER TABLE platform_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "platform_audit_log_select_platform_admin"
  ON platform_audit_log FOR SELECT
  TO authenticated
  USING (is_platform_admin());

CREATE POLICY "platform_audit_log_insert_platform_admin"
  ON platform_audit_log FOR INSERT
  TO authenticated
  WITH CHECK (is_platform_admin());

-- No UPDATE or DELETE policies — audit log is append-only by design.

COMMIT;
