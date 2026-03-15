-- ============================================
-- 📊 SİPARİŞ DURUM SİSTEMİ GÜNCELLEMESİ
-- ============================================
-- Tarih: 11.02.2026
-- Amaç: 'waiting' → 'new_order' dönüşümü ve status sistemi iyileştirmesi

-- 1. Mevcut 'waiting' ve 'pending' durumlarını 'new_order'a çevir
UPDATE packages 
SET status = 'new_order' 
WHERE status IN ('waiting', 'pending');

-- 2. Status enum'ını güncelle (PostgreSQL için)
-- Not: Supabase'de enum kullanmıyorsak bu adım atlanabilir
-- ALTER TYPE package_status RENAME VALUE 'waiting' TO 'new_order';

-- 3. Default status'u 'new_order' yap
ALTER TABLE packages 
ALTER COLUMN status SET DEFAULT 'new_order';

-- 4. Status check constraint ekle (opsiyonel)
ALTER TABLE packages 
DROP CONSTRAINT IF EXISTS packages_status_check;

ALTER TABLE packages 
ADD CONSTRAINT packages_status_check 
CHECK (status IN ('new_order', 'assigned', 'picking_up', 'on_the_way', 'delivered', 'cancelled'));

-- 5. Status index'i oluştur (performans için)
CREATE INDEX IF NOT EXISTS idx_packages_status 
ON packages(status);

CREATE INDEX IF NOT EXISTS idx_packages_status_created 
ON packages(status, created_at DESC);

-- 6. Aktif paketler için composite index
CREATE INDEX IF NOT EXISTS idx_packages_active 
ON packages(status, courier_id) 
WHERE status NOT IN ('delivered', 'cancelled');

-- 7. Teslim edilmiş paketler için index
CREATE INDEX IF NOT EXISTS idx_packages_delivered 
ON packages(status, delivered_at DESC) 
WHERE status = 'delivered';

-- 8. Restoran bazlı sorgular için index
CREATE INDEX IF NOT EXISTS idx_packages_restaurant_status 
ON packages(restaurant_id, status, created_at DESC);

-- 9. Kurye bazlı sorgular için index
CREATE INDEX IF NOT EXISTS idx_packages_courier_status 
ON packages(courier_id, status, created_at DESC) 
WHERE courier_id IS NOT NULL;

-- ============================================
-- 📊 VERİ DOĞRULAMA
-- ============================================

-- Mevcut status dağılımını kontrol et
SELECT 
  status,
  COUNT(*) as count,
  ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER(), 2) as percentage
FROM packages
GROUP BY status
ORDER BY count DESC;

-- Null status kontrolü
SELECT COUNT(*) as null_status_count
FROM packages
WHERE status IS NULL;

-- Geçersiz status kontrolü
SELECT COUNT(*) as invalid_status_count
FROM packages
WHERE status NOT IN ('new_order', 'assigned', 'picking_up', 'on_the_way', 'delivered', 'cancelled');

-- ============================================
-- 🔄 REALTIME SUBSCRIPTION GÜNCELLEMESİ
-- ============================================

-- Realtime için publication'ı güncelle (zaten varsa)
-- ALTER PUBLICATION supabase_realtime ADD TABLE packages;

-- ============================================
-- ✅ BAŞARILI!
-- ============================================
-- Migration tamamlandı.
-- Artık tüm 'waiting' ve 'pending' durumları 'new_order' olarak güncellenmiştir.
