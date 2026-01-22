-- Restoran Borç Yönetimi Tabloları
-- Bu dosyayı Supabase SQL Editor'de çalıştırın

-- 1. Restoran Borçları Tablosu
CREATE TABLE IF NOT EXISTS restaurant_debts (
  id BIGSERIAL PRIMARY KEY,
  restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  debt_date DATE NOT NULL,
  amount DECIMAL(10, 2) NOT NULL,
  remaining_amount DECIMAL(10, 2) NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('pending', 'paid')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Restoran Ödeme İşlemleri Tablosu (Transaction Log)
CREATE TABLE IF NOT EXISTS restaurant_payment_transactions (
  id BIGSERIAL PRIMARY KEY,
  restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  transaction_date DATE NOT NULL,
  total_order_amount DECIMAL(10, 2) NOT NULL,
  amount_paid DECIMAL(10, 2) NOT NULL,
  new_debt_amount DECIMAL(10, 2) DEFAULT 0,
  payment_to_debts DECIMAL(10, 2) DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Packages tablosuna settled_at kolonu ekle (eğer yoksa)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'packages' AND column_name = 'restaurant_settled_at'
  ) THEN
    ALTER TABLE packages ADD COLUMN restaurant_settled_at TIMESTAMPTZ;
  END IF;
END $$;

-- 4. İndeksler (Performans için)
CREATE INDEX IF NOT EXISTS idx_restaurant_debts_restaurant_id ON restaurant_debts(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_restaurant_debts_status ON restaurant_debts(status);
CREATE INDEX IF NOT EXISTS idx_restaurant_payment_transactions_restaurant_id ON restaurant_payment_transactions(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_packages_restaurant_settled_at ON packages(restaurant_settled_at);

-- 5. RLS (Row Level Security) Politikaları
ALTER TABLE restaurant_debts ENABLE ROW LEVEL SECURITY;
ALTER TABLE restaurant_payment_transactions ENABLE ROW LEVEL SECURITY;

-- Herkese okuma/yazma izni (Admin paneli için)
CREATE POLICY "Enable all access for restaurant_debts" ON restaurant_debts FOR ALL USING (true);
CREATE POLICY "Enable all access for restaurant_payment_transactions" ON restaurant_payment_transactions FOR ALL USING (true);

-- 6. Trigger: updated_at otomatik güncelleme
CREATE OR REPLACE FUNCTION update_restaurant_debts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_restaurant_debts_updated_at
  BEFORE UPDATE ON restaurant_debts
  FOR EACH ROW
  EXECUTE FUNCTION update_restaurant_debts_updated_at();

-- Başarılı mesajı
DO $$
BEGIN
  RAISE NOTICE 'Restoran borç yönetimi tabloları başarıyla oluşturuldu!';
END $$;
