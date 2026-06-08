-- =============================================================================
-- courier_settlements + packages (mutabakat) — RLS düzeltmesi
-- Hata: "new row violates row-level security policy for table courier_settlements"
-- Supabase SQL Editor'da çalıştırın (anon key ile admin paneli).
-- =============================================================================

ALTER TABLE courier_settlements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow read courier_settlements" ON courier_settlements;
DROP POLICY IF EXISTS "Allow insert courier_settlements" ON courier_settlements;
DROP POLICY IF EXISTS "Allow update courier_settlements" ON courier_settlements;

CREATE POLICY "Allow read courier_settlements"
  ON courier_settlements
  FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Allow insert courier_settlements"
  ON courier_settlements
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Allow update courier_settlements"
  ON courier_settlements
  FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

-- Mutabakat sonrası packages.courier_settlement_id güncellemesi
DROP POLICY IF EXISTS "Allow update packages settlement link" ON packages;

CREATE POLICY "Allow update packages settlement link"
  ON packages
  FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);
