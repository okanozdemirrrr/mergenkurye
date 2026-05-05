-- ============================================
-- 📦 TESLİMAT YAPAN KURYE KAYDI
-- ============================================
-- Sorun: Kurye değişikliği yapıldığında courier_id güncelleniyor
-- ama teslimat anında hangi kuryenin teslim ettiği kaydedilmiyor.
-- 
-- Çözüm: delivered_by_courier_id kolonu ekle

-- 1. Yeni kolon ekle
ALTER TABLE packages 
ADD COLUMN IF NOT EXISTS delivered_by_courier_id UUID REFERENCES couriers(id);

-- 2. Index ekle (performans için)
CREATE INDEX IF NOT EXISTS idx_packages_delivered_by_courier 
ON packages(delivered_by_courier_id);

-- 3. Mevcut delivered paketler için courier_id'yi kopyala
UPDATE packages 
SET delivered_by_courier_id = courier_id 
WHERE status = 'delivered' 
  AND delivered_by_courier_id IS NULL 
  AND courier_id IS NOT NULL;

-- 4. Yorum ekle
COMMENT ON COLUMN packages.delivered_by_courier_id IS 'Paketi teslim eden kurye (kurye değişikliğinde bile değişmez)';

-- ✅ TAMAMLANDI!
-- Artık teslimat sırasında delivered_by_courier_id güncellenecek
-- ve kurye geçmişi bu kolona göre çekilecek
