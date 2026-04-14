-- ============================================
-- 📊 KURYE GÜN SONU MUTABAKAT SİSTEMİ
-- ============================================
-- Bu tablo, admin'in kuryeden para aldığı her işlemi kaydeder.
-- ORİJİNAL PAKET FİYATLARI VE STATUSLER DEĞİŞMEZ!

-- Courier Settlements Tablosu
CREATE TABLE IF NOT EXISTS courier_settlements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  courier_id UUID NOT NULL REFERENCES couriers(id) ON DELETE CASCADE,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  amount_paid DECIMAL(10, 2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by TEXT DEFAULT 'admin',
  notes TEXT
);

-- Index'ler (performans için)
CREATE INDEX IF NOT EXISTS idx_courier_settlements_courier_id ON courier_settlements(courier_id);
CREATE INDEX IF NOT EXISTS idx_courier_settlements_dates ON courier_settlements(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_courier_settlements_created_at ON courier_settlements(created_at);

-- Realtime için publication
ALTER PUBLICATION supabase_realtime ADD TABLE courier_settlements;

-- Yorum ekle
COMMENT ON TABLE courier_settlements IS 'Kurye gün sonu mutabakatları - Admin kuryeden para aldığında kayıt oluşturulur';
COMMENT ON COLUMN courier_settlements.amount_paid IS 'Admin tarafından kuryeden alınan tutar (eksik, tam veya fazla olabilir)';
COMMENT ON COLUMN courier_settlements.start_date IS 'Mutabakat tarih aralığı başlangıcı';
COMMENT ON COLUMN courier_settlements.end_date IS 'Mutabakat tarih aralığı bitişi';

-- ✅ TAMAMLANDI!
-- Artık admin kuryeden para aldığında bu tabloya kayıt düşülecek
-- Orijinal packages tablosundaki veriler hiç değişmeyecek

