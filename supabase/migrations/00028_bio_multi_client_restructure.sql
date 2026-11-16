-- Productisation: let one OneSign account host multiple LIVE bio pages
-- (one per managed client) instead of a single active page per owner.
--
-- Context: agencies (e.g. Tom Peacock Design / OneSign) build and host bio
-- pages on behalf of clients. The original single-active-page lock meant
-- publishing one client's page silently drafted every other page on the
-- account — taking their QR code offline. This migration removes that lock
-- and tags each page with the client it belongs to.
--
-- Safety: this only LOOSENS a constraint. It cannot deactivate a page or
-- modify any qr_codes row. Applied to production 2026-06-08 after verifying
-- no bio page was linked to a QR and only one owner had bio pages.

-- 1. Remove the single-active-page-per-owner lock so client pages can be live simultaneously.
DROP INDEX IF EXISTS bio_one_active_page_per_user;

-- 2. Tag each page with the managed client's identity (agency dashboards + future self-serve handoff).
ALTER TABLE bio_link_pages ADD COLUMN IF NOT EXISTS client_name TEXT;
ALTER TABLE bio_link_pages ADD COLUMN IF NOT EXISTS client_email TEXT;
