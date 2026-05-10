-- ============================================
-- İPTAL KATEGORİZASYONU - FİNANSAL MANTIK
-- ============================================
-- Ücretli İptal: Kurye paketi aldıktan sonra iptal edilirse (on_the_way -> cancelled)
-- Ücretsiz İptal: Kurye paketi almadan önce iptal edilirse (diğer durumlar -> cancelled)

-- 1. is_chargeable_cancellation sütunu ekle
ALTER TABLE packages 
ADD COLUMN IF NOT EXISTS is_chargeable_cancellation BOOLEAN DEFAULT false;

-- 2. Mevcut iptal edilmiş siparişleri güncelle
-- Eğer sipariş 'on_the_way' durumundayken iptal edildiyse, ücretli iptal olarak işaretle
UPDATE packages
SET is_chargeable_cancellation = true
WHERE status = 'cancelled'
  AND picked_up_at IS NOT NULL  -- Kurye paketi almış
  AND delivered_at IS NULL;      -- Ama teslim etmemiş

-- 3. Açıklama ekle
COMMENT ON COLUMN packages.is_chargeable_cancellation IS 
'Ücretli iptal mi? true = Kurye paketi aldıktan sonra iptal (hesaplamalara dahil), false = Kurye paketi almadan önce iptal (hesaplamalara dahil değil)';

-- 4. İndeks ekle (performans için)
CREATE INDEX IF NOT EXISTS idx_packages_chargeable_cancellation 
ON packages(is_chargeable_cancellation) 
WHERE status = 'cancelled';

-- 5. Kontrol sorgusu
SELECT 
  status,
  is_chargeable_cancellation,
  COUNT(*) as count
FROM packages
WHERE status = 'cancelled'
GROUP BY status, is_chargeable_cancellation;

-- ============================================
-- KULLANIM ÖRNEKLERİ
-- ============================================

-- Tüm başarılı teslimatlar (delivered + ücretli iptaller)
-- SELECT * FROM packages 
-- WHERE status = 'delivered' 
--    OR (status = 'cancelled' AND is_chargeable_cancellation = true);

-- Restoran borç hesaplama
-- SELECT 
--   restaurant_id,
--   COUNT(*) as total_packages,
--   SUM(amount) as total_amount
-- FROM packages
-- WHERE (status = 'delivered' OR (status = 'cancelled' AND is_chargeable_cancellation = true))
--   AND restaurant_id = 'xxx'
-- GROUP BY restaurant_id;

-- Kurye kazanç hesaplama
-- SELECT 
--   courier_id,
--   COUNT(*) as total_deliveries,
--   COUNT(*) * package_rate as total_earnings
-- FROM packages
-- WHERE (status = 'delivered' OR (status = 'cancelled' AND is_chargeable_cancellation = true))
--   AND courier_id = 'xxx'
-- GROUP BY courier_id;
