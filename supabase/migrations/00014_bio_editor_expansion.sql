-- Migration: Bio Editor Expansion
-- Adds new block types (contact_form, gallery, countdown, payment_link),
-- a form submissions table for contact form data, and a gallery storage bucket.

-- =============================================================================
-- ENUMS: Add new values to bio_block_type
-- =============================================================================

DO $$ BEGIN
  ALTER TYPE bio_block_type ADD VALUE IF NOT EXISTS 'contact_form';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TYPE bio_block_type ADD VALUE IF NOT EXISTS 'gallery';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TYPE bio_block_type ADD VALUE IF NOT EXISTS 'countdown';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TYPE bio_block_type ADD VALUE IF NOT EXISTS 'payment_link';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- =============================================================================
-- TABLE: bio_form_submissions
-- =============================================================================

CREATE TABLE IF NOT EXISTS bio_form_submissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  page_id UUID NOT NULL REFERENCES bio_link_pages(id) ON DELETE CASCADE,
  block_id UUID NOT NULL REFERENCES bio_blocks(id) ON DELETE CASCADE,

  -- Submission fields
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  message TEXT NOT NULL,
  phone TEXT,
  subject TEXT,

  -- Security / de-duplication
  ip_hash TEXT NOT NULL,

  -- Read state
  is_read BOOLEAN NOT NULL DEFAULT false,

  -- Timestamps
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =============================================================================
-- INDEXES
-- =============================================================================

CREATE INDEX IF NOT EXISTS idx_bio_form_submissions_page_time
  ON bio_form_submissions(page_id, submitted_at DESC);

CREATE INDEX IF NOT EXISTS idx_bio_form_submissions_block
  ON bio_form_submissions(block_id);

-- =============================================================================
-- ROW LEVEL SECURITY: bio_form_submissions
-- =============================================================================

ALTER TABLE bio_form_submissions ENABLE ROW LEVEL SECURITY;

-- Owners can read their own form submissions
CREATE POLICY "bio_form_submissions_select_own"
  ON bio_form_submissions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM bio_link_pages
      WHERE bio_link_pages.id = bio_form_submissions.page_id
      AND bio_link_pages.owner_id = auth.uid()
    )
  );

-- Owners can mark submissions as read / update them
CREATE POLICY "bio_form_submissions_update_own"
  ON bio_form_submissions FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM bio_link_pages
      WHERE bio_link_pages.id = bio_form_submissions.page_id
      AND bio_link_pages.owner_id = auth.uid()
    )
  );

-- Owners can delete their own form submissions
CREATE POLICY "bio_form_submissions_delete_own"
  ON bio_form_submissions FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM bio_link_pages
      WHERE bio_link_pages.id = bio_form_submissions.page_id
      AND bio_link_pages.owner_id = auth.uid()
    )
  );

-- NOTE: No public INSERT policy — submissions are created via the admin/service client
-- to prevent abuse and allow server-side rate limiting and IP hashing.

-- =============================================================================
-- STORAGE BUCKET: bio-gallery
-- =============================================================================

-- Public bucket for user-uploaded gallery images.
-- Path format: {user_id}/{filename}
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'bio-gallery',
  'bio-gallery',
  true,
  2097152,  -- 2MB limit
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- =============================================================================
-- STORAGE POLICIES: bio-gallery
-- =============================================================================

-- Public read for all gallery images
CREATE POLICY "bio_gallery_select_public"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'bio-gallery'
  );

-- Users can upload images to their own folder
CREATE POLICY "bio_gallery_insert_own"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'bio-gallery'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- Users can update their own gallery images
CREATE POLICY "bio_gallery_update_own"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'bio-gallery'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- Users can delete their own gallery images
CREATE POLICY "bio_gallery_delete_own"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'bio-gallery'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );
