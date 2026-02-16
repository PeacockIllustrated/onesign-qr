-- Migration: Contact Card Layouts
-- Adds contact card layout options and extra contact information fields
-- to bio_link_pages, enabling 5 distinct header layouts with rich contact info.

-- =============================================================================
-- NEW COLUMNS (all nullable = use app-layer defaults)
-- =============================================================================

ALTER TABLE bio_link_pages ADD COLUMN IF NOT EXISTS card_layout TEXT DEFAULT NULL;
ALTER TABLE bio_link_pages ADD COLUMN IF NOT EXISTS subtitle TEXT DEFAULT NULL;
ALTER TABLE bio_link_pages ADD COLUMN IF NOT EXISTS company TEXT DEFAULT NULL;
ALTER TABLE bio_link_pages ADD COLUMN IF NOT EXISTS job_title TEXT DEFAULT NULL;
ALTER TABLE bio_link_pages ADD COLUMN IF NOT EXISTS location TEXT DEFAULT NULL;
ALTER TABLE bio_link_pages ADD COLUMN IF NOT EXISTS contact_email TEXT DEFAULT NULL;
ALTER TABLE bio_link_pages ADD COLUMN IF NOT EXISTS contact_phone TEXT DEFAULT NULL;
ALTER TABLE bio_link_pages ADD COLUMN IF NOT EXISTS contact_website TEXT DEFAULT NULL;
ALTER TABLE bio_link_pages ADD COLUMN IF NOT EXISTS cover_storage_path TEXT DEFAULT NULL;

-- =============================================================================
-- CONSTRAINTS
-- =============================================================================

ALTER TABLE bio_link_pages ADD CONSTRAINT bio_card_layout_values
  CHECK (card_layout IS NULL OR card_layout IN ('centered', 'left-aligned', 'split', 'minimal', 'cover'));

ALTER TABLE bio_link_pages ADD CONSTRAINT bio_subtitle_length
  CHECK (subtitle IS NULL OR char_length(subtitle) <= 150);

ALTER TABLE bio_link_pages ADD CONSTRAINT bio_company_length
  CHECK (company IS NULL OR char_length(company) <= 100);

ALTER TABLE bio_link_pages ADD CONSTRAINT bio_job_title_length
  CHECK (job_title IS NULL OR char_length(job_title) <= 100);

ALTER TABLE bio_link_pages ADD CONSTRAINT bio_location_length
  CHECK (location IS NULL OR char_length(location) <= 100);

ALTER TABLE bio_link_pages ADD CONSTRAINT bio_contact_email_length
  CHECK (contact_email IS NULL OR char_length(contact_email) <= 200);

ALTER TABLE bio_link_pages ADD CONSTRAINT bio_contact_phone_length
  CHECK (contact_phone IS NULL OR char_length(contact_phone) <= 50);

ALTER TABLE bio_link_pages ADD CONSTRAINT bio_contact_website_length
  CHECK (contact_website IS NULL OR char_length(contact_website) <= 2048);

-- =============================================================================
-- COMMENTS
-- =============================================================================

COMMENT ON COLUMN bio_link_pages.card_layout IS 'Contact card layout variant (null = centered)';
COMMENT ON COLUMN bio_link_pages.subtitle IS 'Tagline or subtitle shown below the title';
COMMENT ON COLUMN bio_link_pages.company IS 'Organization or company name';
COMMENT ON COLUMN bio_link_pages.job_title IS 'Job title or role';
COMMENT ON COLUMN bio_link_pages.location IS 'City, region, or location';
COMMENT ON COLUMN bio_link_pages.contact_email IS 'Contact email for action button';
COMMENT ON COLUMN bio_link_pages.contact_phone IS 'Contact phone for action button';
COMMENT ON COLUMN bio_link_pages.contact_website IS 'Contact website URL for action button';
COMMENT ON COLUMN bio_link_pages.cover_storage_path IS 'Supabase Storage path for cover/banner image';
