-- ============================================
-- 🏪 RESTORAN ÇALIŞMA DURUMU SÜTUNU EKLE
-- ============================================

-- is_active sütununu ekle (varsayılan: true)
ALTER TABLE restaurants 
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- Mevcut tüm restoranları aktif yap
UPDATE restaurants SET is_active = true WHERE is_active IS NULL;

-- Index ekle (performans için)
CREATE INDEX IF NOT EXISTS idx_restaurants_is_active ON restaurants(is_active);

-- ✅ TAMAMLANDI!
-- Artık restoranlar çalışma durumlarını kontrol edebilir
