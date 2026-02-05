-- Fix: Add SECURITY DEFINER to create_qr_default_style function
-- This allows the trigger to bypass RLS when inserting into qr_styles

CREATE OR REPLACE FUNCTION create_qr_default_style()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO qr_styles (qr_id)
  VALUES (NEW.id);
  RETURN NEW;
END;
$$;

-- Also need to add INSERT policy for qr_styles (the trigger runs as definer, but
-- if users want to insert styles manually they need a policy too)
DROP POLICY IF EXISTS "Users can insert own QR styles" ON qr_styles;
CREATE POLICY "Users can insert own QR styles"
  ON qr_styles FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM qr_codes
      WHERE qr_codes.id = qr_styles.qr_id
      AND qr_codes.owner_id = auth.uid()
    )
  );
