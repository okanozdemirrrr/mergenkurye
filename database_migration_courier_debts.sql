-- Kurye Borçları Tablosu
CREATE TABLE IF NOT EXISTS courier_debts (
  id BIGSERIAL PRIMARY KEY,
  courier_id TEXT NOT NULL REFERENCES couriers(id) ON DELETE CASCADE,
  debt_date DATE NOT NULL,
  amount DECIMAL(10, 2) NOT NULL,
  remaining_amount DECIMAL(10, 2) NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('pending', 'paid')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- İndeksler
CREATE INDEX IF NOT EXISTS idx_courier_debts_courier_id ON courier_debts(courier_id);
CREATE INDEX IF NOT EXISTS idx_courier_debts_status ON courier_debts(status);
CREATE INDEX IF NOT EXISTS idx_courier_debts_debt_date ON courier_debts(debt_date);

-- Gün Sonu İşlem Kayıtları Tablosu
CREATE TABLE IF NOT EXISTS debt_transactions (
  id BIGSERIAL PRIMARY KEY,
  courier_id TEXT NOT NULL REFERENCES couriers(id) ON DELETE CASCADE,
  transaction_date DATE NOT NULL,
  daily_cash_total DECIMAL(10, 2) NOT NULL,
  amount_received DECIMAL(10, 2) NOT NULL,
  new_debt_amount DECIMAL(10, 2) DEFAULT 0,
  payment_to_debts DECIMAL(10, 2) DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- İndeksler
CREATE INDEX IF NOT EXISTS idx_debt_transactions_courier_id ON debt_transactions(courier_id);
CREATE INDEX IF NOT EXISTS idx_debt_transactions_date ON debt_transactions(transaction_date);

-- RLS (Row Level Security) Politikaları
ALTER TABLE courier_debts ENABLE ROW LEVEL SECURITY;
ALTER TABLE debt_transactions ENABLE ROW LEVEL SECURITY;

-- Herkes okuyabilir (admin paneli için)
CREATE POLICY "Enable read access for all users" ON courier_debts FOR SELECT USING (true);
CREATE POLICY "Enable read access for all users" ON debt_transactions FOR SELECT USING (true);

-- Herkes ekleyebilir (admin paneli için)
CREATE POLICY "Enable insert for all users" ON courier_debts FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable insert for all users" ON debt_transactions FOR INSERT WITH CHECK (true);

-- Herkes güncelleyebilir (admin paneli için)
CREATE POLICY "Enable update for all users" ON courier_debts FOR UPDATE USING (true);
CREATE POLICY "Enable update for all users" ON debt_transactions FOR UPDATE USING (true);
