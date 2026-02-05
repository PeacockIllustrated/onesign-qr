-- Migration: Storage buckets for QR assets and logos

-- =============================================================================
-- CREATE STORAGE BUCKETS
-- =============================================================================

-- Bucket for generated QR assets (SVG, PNG, PDF)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'qr-assets',
  'qr-assets',
  false,  -- Private bucket, accessed via signed URLs
  10485760,  -- 10MB limit
  ARRAY['image/svg+xml', 'image/png', 'application/pdf']
)
ON CONFLICT (id) DO UPDATE SET
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Bucket for user-uploaded logos
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'qr-logos',
  'qr-logos',
  false,  -- Private bucket
  5242880,  -- 5MB limit
  ARRAY['image/png', 'image/jpeg', 'image/svg+xml', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- =============================================================================
-- STORAGE POLICIES - QR ASSETS
-- =============================================================================

-- Users can view their own QR assets
-- Path format: {qr_id}/{format}/{filename}
CREATE POLICY "qr_assets_select_own"
  ON storage.objects
  FOR SELECT
  USING (
    bucket_id = 'qr-assets'
    AND EXISTS (
      SELECT 1 FROM qr_code.codes
      WHERE qr_code.codes.owner_id = auth.uid()
      AND storage.objects.name LIKE qr_code.codes.id::text || '/%'
    )
  );

-- Service role handles uploads (no user insert policy)
-- This ensures assets are only created through the server-side generation

-- =============================================================================
-- STORAGE POLICIES - QR LOGOS
-- =============================================================================

-- Path format: {user_id}/{filename}
-- Users can view their own logos
CREATE POLICY "qr_logos_select_own"
  ON storage.objects
  FOR SELECT
  USING (
    bucket_id = 'qr-logos'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- Users can upload logos to their own folder
CREATE POLICY "qr_logos_insert_own"
  ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'qr-logos'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- Users can update their own logos
CREATE POLICY "qr_logos_update_own"
  ON storage.objects
  FOR UPDATE
  USING (
    bucket_id = 'qr-logos'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- Users can delete their own logos
CREATE POLICY "qr_logos_delete_own"
  ON storage.objects
  FOR DELETE
  USING (
    bucket_id = 'qr-logos'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );
