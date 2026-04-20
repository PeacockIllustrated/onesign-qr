export interface AuditLogRecord {
  id: string;
  actor_user_id: string;
  action: string;
  target_type: string | null;
  target_id: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

export interface PlatformKpis {
  total_orgs: number;
  total_users: number;
  orgs_created_this_week: number;
  total_bio_pages: number;
  total_qr_codes: number;
  form_submissions_last_7d: number;
}
