import { createAdminClient } from '@/lib/supabase/admin';

/**
 * Audit logging utility for tracking all QR code mutations.
 *
 * Uses the admin Supabase client to bypass RLS (the audit_log table
 * only allows SELECT for authenticated users, not INSERT).
 *
 * All calls are fire-and-forget — audit logging must never break
 * the main request flow.
 */

type AuditAction =
  | 'created'
  | 'updated'
  | 'destination_changed'
  | 'style_changed'
  | 'deactivated'
  | 'reactivated'
  | 'deleted';

interface AuditEntry {
  qrId: string;
  actorId: string;
  action: AuditAction;
  previousValue?: Record<string, unknown> | null;
  newValue?: Record<string, unknown> | null;
  ipAddress?: string | null;
  userAgent?: string | null;
}

/**
 * Write an entry to the audit log. This is fire-and-forget —
 * it will never throw and should not be awaited in the critical path.
 */
export async function writeAuditLog(entry: AuditEntry): Promise<void> {
  try {
    const supabase = createAdminClient();
    await supabase.from('qr_audit_log').insert({
      qr_id: entry.qrId,
      actor_id: entry.actorId,
      action: entry.action,
      previous_value: entry.previousValue ?? null,
      new_value: entry.newValue ?? null,
      ip_address: entry.ipAddress ?? null,
      user_agent: entry.userAgent ?? null,
    });
  } catch (error) {
    // Audit logging must never break the main flow
    console.error('[audit] Failed to write audit log:', error instanceof Error ? error.message : 'unknown error');
  }
}

/**
 * Determine the audit action for a QR code update based on changed fields.
 */
export function determineUpdateAction(
  qrUpdate: Record<string, unknown>,
  styleUpdate: Record<string, unknown>,
): AuditAction {
  if ('destination_url' in qrUpdate) return 'destination_changed';
  if ('is_active' in qrUpdate && qrUpdate.is_active === false) return 'deactivated';
  if ('is_active' in qrUpdate && qrUpdate.is_active === true) return 'reactivated';
  if (Object.keys(styleUpdate).length > 0) return 'style_changed';
  return 'updated';
}
