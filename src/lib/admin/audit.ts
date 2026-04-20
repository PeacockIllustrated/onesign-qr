import { createAdminClient } from '@/lib/supabase/admin';

export interface LogAdminActionArgs {
  actorUserId: string;
  action: string;
  targetType?: string;
  targetId?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Appends a row to platform_audit_log. Failures are logged but not thrown —
 * an admin action must never be blocked by an audit-write failure.
 */
export async function logAdminAction(args: LogAdminActionArgs): Promise<void> {
  const admin = createAdminClient();
  const { error } = await admin.from('platform_audit_log').insert({
    actor_user_id: args.actorUserId,
    action: args.action,
    target_type: args.targetType ?? null,
    target_id: args.targetId ?? null,
    metadata: args.metadata ?? null,
  });
  if (error) {
    console.error('[logAdminAction] insert failed', error);
  }
}
