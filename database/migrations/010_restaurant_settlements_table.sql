-- =============================================================================
-- ADIM 1/2 — Tablo + kolon + RLS
-- Supabase SQL Editor'da SADECE bu dosyayı çalıştırın (fonksiyon yok).
-- =============================================================================

CREATE TABLE IF NOT EXISTS restaurant_settlements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  total_revenue NUMERIC(10, 2) NOT NULL DEFAULT 0,
  courier_cost NUMERIC(10, 2) NOT NULL DEFAULT 0,
  commission_amount NUMERIC(10, 2) NOT NULL DEFAULT 0,
  net_paid NUMERIC(10, 2) NOT NULL DEFAULT 0,
  package_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by TEXT DEFAULT 'admin',
  notes TEXT
);

CREATE INDEX IF NOT EXISTS idx_restaurant_settlements_restaurant_id
  ON restaurant_settlements (restaurant_id);

CREATE INDEX IF NOT EXISTS idx_restaurant_settlements_dates
  ON restaurant_settlements (start_date, end_date);

CREATE INDEX IF NOT EXISTS idx_restaurant_settlements_created_at
  ON restaurant_settlements (created_at DESC);

COMMENT ON TABLE restaurant_settlements IS
  'Restoran dönem mutabakat fişleri — Hesap Öde işleminde oluşturulur';

ALTER TABLE packages
ADD COLUMN IF NOT EXISTS restaurant_settlement_id UUID NULL
REFERENCES restaurant_settlements(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_packages_restaurant_settlement_id
  ON packages (restaurant_settlement_id)
  WHERE restaurant_settlement_id IS NOT NULL;

ALTER TABLE restaurant_settlements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "restaurant_settlements_select_all" ON restaurant_settlements;
CREATE POLICY "restaurant_settlements_select_all"
  ON restaurant_settlements FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "restaurant_settlements_insert_all" ON restaurant_settlements;
CREATE POLICY "restaurant_settlements_insert_all"
  ON restaurant_settlements FOR INSERT
  WITH CHECK (true);

DROP POLICY IF EXISTS "restaurant_settlements_update_all" ON restaurant_settlements;
CREATE POLICY "restaurant_settlements_update_all"
  ON restaurant_settlements FOR UPDATE
  USING (true)
  WITH CHECK (true);
