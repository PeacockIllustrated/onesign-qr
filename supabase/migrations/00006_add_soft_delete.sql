-- Add soft delete support to qr_codes table
ALTER TABLE qr_codes ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;

-- Index for efficiently querying non-deleted records
CREATE INDEX IF NOT EXISTS idx_qr_codes_not_deleted
  ON qr_codes(owner_id)
  WHERE deleted_at IS NULL;

-- Comment for documentation
COMMENT ON COLUMN qr_codes.deleted_at IS 'Soft delete timestamp. NULL means the record is active.';
