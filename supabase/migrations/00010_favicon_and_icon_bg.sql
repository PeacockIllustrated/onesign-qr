-- 00010: Add page favicon upload + per-link icon background color
-- 1. Custom favicon for bio link pages (browser tab icon)
ALTER TABLE bio_link_pages
  ADD COLUMN IF NOT EXISTS favicon_storage_path TEXT DEFAULT NULL;

-- 2. Per-link icon background color for legibility
ALTER TABLE bio_link_items
  ADD COLUMN IF NOT EXISTS icon_bg_color TEXT DEFAULT NULL;

-- 3. Expand bio-avatars bucket to accept favicon-friendly MIME types
UPDATE storage.buckets
SET allowed_mime_types = ARRAY[
  'image/png', 'image/jpeg', 'image/webp', 'image/gif',
  'image/svg+xml', 'image/x-icon', 'image/vnd.microsoft.icon'
]
WHERE id = 'bio-avatars';
