-- ============================================
-- Yeni Sipariş Durum Akışı Migration
-- ============================================
-- getting_ready ve ready durumlarını ekle
-- Veritabanı VARCHAR kullanıyor (ENUM değil)

-- 1. Mevcut constraint'i kaldır (varsa)
ALTER TABLE packages DROP CONSTRAINT IF EXISTS packages_status_check;

-- 2. Yeni constraint ekle (tüm durumları içeren)
ALTER TABLE packages ADD CONSTRAINT packages_status_check 
CHECK (status IN (
    'new_order',
    'getting_ready',  -- YENİ
    'ready',          -- YENİ
    'assigned',
    'picking_up',
    'on_the_way',
    'delivered',
    'cancelled',
    -- Eski değerler (geriye uyumluluk için)
    'waiting',
    'pending'
));

-- 3. Yeni timestamp sütunları ekle
ALTER TABLE packages 
ADD COLUMN IF NOT EXISTS getting_ready_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS ready_at TIMESTAMP;

-- 4. İndeksler ekle (performans için)
CREATE INDEX IF NOT EXISTS idx_packages_getting_ready_at ON packages(getting_ready_at);
CREATE INDEX IF NOT EXISTS idx_packages_ready_at ON packages(ready_at);
CREATE INDEX IF NOT EXISTS idx_packages_status ON packages(status);

-- 5. Yorumlar ekle
COMMENT ON COLUMN packages.getting_ready_at IS 'Restoran siparişi hazırlamaya başladığında';
COMMENT ON COLUMN packages.ready_at IS 'Restoran siparişi hazır olarak işaretlediğinde';

-- 6. Eski 'waiting' ve 'pending' değerlerini 'new_order'a çevir
UPDATE packages 
SET status = 'new_order' 
WHERE status IN ('waiting', 'pending');

-- 7. Kontrol: Yeni durumları listele
SELECT 
    'Migration tamamlandı! Yeni durum akışı:' as message,
    'new_order → getting_ready → ready → assigned → picking_up → on_the_way → delivered' as flow;

-- 8. Test: Mevcut siparişlerin durumlarını kontrol et
SELECT 
    status,
    COUNT(*) as count
FROM packages
GROUP BY status
ORDER BY 
    CASE status
        WHEN 'new_order' THEN 1
        WHEN 'getting_ready' THEN 2
        WHEN 'ready' THEN 3
        WHEN 'assigned' THEN 4
        WHEN 'picking_up' THEN 5
        WHEN 'on_the_way' THEN 6
        WHEN 'delivered' THEN 7
        WHEN 'cancelled' THEN 8
        ELSE 99
    END;

-- ============================================
-- Migration Tamamlandı! ✅
-- ============================================
