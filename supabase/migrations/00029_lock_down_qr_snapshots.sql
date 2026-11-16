-- Migration: lock down the QR endpoint snapshot view and function
--
-- Fixes two Supabase security advisor findings from 00027:
--
-- 1. v_qr_endpoint_latest ran with its creator's rights (security definer
--    view), so it bypassed RLS on qr_endpoint_snapshots. With Supabase's
--    default grants, anon could read every org's slugs, destinations and
--    owner ids through /rest/v1/v_qr_endpoint_latest. The view now runs as
--    the caller (security_invoker), so the table's RLS applies: members see
--    their own org's snapshots, platform admins see all, anon sees nothing.
--
-- 2. snapshot_qr_endpoints(text) was executable by anon (Supabase grants anon
--    directly, so 00027's REVOKE ... FROM PUBLIC didn't remove it) and by any
--    signed-in user. It copies every org's qr_codes rows, so it is now
--    service-role only (dashboard / scheduled jobs). Nothing in the app calls it.
--
-- Neither object is used by the /r/<slug> redirect, which reads qr_codes
-- directly, so live QR links are unaffected.

BEGIN;

ALTER VIEW v_qr_endpoint_latest SET (security_invoker = true);
REVOKE ALL ON v_qr_endpoint_latest FROM anon;

REVOKE EXECUTE ON FUNCTION snapshot_qr_endpoints(TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION snapshot_qr_endpoints(TEXT) TO service_role;

COMMIT;
