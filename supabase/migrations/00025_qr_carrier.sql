-- supabase/migrations/00025_qr_carrier.sql
--
-- Adds the carrier column to qr_codes. Additive, non-breaking:
-- - Default 'qr' means every existing row becomes carrier='qr' without any
--   semantic change.
-- - Only meaningful when mode='managed'; ignored for mode='direct'.
-- - The redirect handler (src/app/r/[slug]/route.ts) does not consult this
--   column, so no runtime behaviour changes.

ALTER TABLE qr_codes
  ADD COLUMN carrier text NOT NULL DEFAULT 'qr'
  CHECK (carrier IN ('qr', 'nfc', 'both'));

COMMENT ON COLUMN qr_codes.carrier IS
  'User intent about physical delivery of a managed link. qr = printable QR only (default), nfc = NFC chips only, both = QR + NFC campaign. Only meaningful when mode = managed; ignored for mode = direct.';
