-- supabase/migrations/00028_qr_frame.sql
--
-- Adds an outer FRAME treatment to QR styles. Additive, non-breaking:
--   - frame_shape defaults to 'none', so every existing style row keeps its
--     current square appearance with no visual change.
--   - frame_label is optional call-to-action text (e.g. "SCAN ME") rendered
--     along circular / radial frames.
--
-- The frame is decoration drawn AROUND the code. The scannable QR matrix is
-- always the standard square grid, fully intact in the centre — see
-- src/lib/qr/frames.ts. Values:
--   'none'   – standard square QR (default)
--   'circle' – intact matrix inside a circular badge
--   'radial' – concentric two-tone dashed rings (App Clip-inspired "signal")

BEGIN;

ALTER TABLE qr_styles
  ADD COLUMN IF NOT EXISTS frame_shape text NOT NULL DEFAULT 'none'
    CHECK (frame_shape IN ('none', 'circle', 'radial'));

ALTER TABLE qr_styles
  ADD COLUMN IF NOT EXISTS frame_label text
    CHECK (frame_label IS NULL OR char_length(frame_label) <= 40);

COMMENT ON COLUMN qr_styles.frame_shape IS
  'Outer frame treatment drawn around the (always intact, always square) QR matrix: none | circle | radial. Decorative only — does not affect the scannable payload.';

COMMENT ON COLUMN qr_styles.frame_label IS
  'Optional call-to-action (e.g. "SCAN ME") curved along a circle/radial frame. Max 40 chars. Ignored when frame_shape = none.';

COMMIT;
