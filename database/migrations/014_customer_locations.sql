-- =============================================================================
-- Müşteri konum geçmişi (Geolocation Binding)
-- Supabase SQL Editor'da çalıştırın.
-- =============================================================================

CREATE TABLE IF NOT EXISTS customer_locations (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone_number  TEXT NOT NULL,
  latitude      DOUBLE PRECISION NOT NULL,
  longitude     DOUBLE PRECISION NOT NULL,
  label         TEXT NOT NULL DEFAULT '',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_customer_locations_phone
  ON customer_locations (phone_number);

CREATE INDEX IF NOT EXISTS idx_customer_locations_phone_created
  ON customer_locations (phone_number, created_at DESC);

ALTER TABLE customer_locations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "customer_locations_select_all" ON customer_locations;
CREATE POLICY "customer_locations_select_all"
  ON customer_locations FOR SELECT
  TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "customer_locations_insert_all" ON customer_locations;
CREATE POLICY "customer_locations_insert_all"
  ON customer_locations FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "customer_locations_update_all" ON customer_locations;
CREATE POLICY "customer_locations_update_all"
  ON customer_locations FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "customer_locations_delete_all" ON customer_locations;
CREATE POLICY "customer_locations_delete_all"
  ON customer_locations FOR DELETE
  TO anon, authenticated
  USING (true);

GRANT SELECT, INSERT, UPDATE, DELETE ON customer_locations TO anon, authenticated;
