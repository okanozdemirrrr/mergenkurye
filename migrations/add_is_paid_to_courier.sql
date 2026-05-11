-- =============================================
-- KURYE HAKEDİŞ ÖDEME SİSTEMİ - Migration
-- packages tablosuna is_paid_to_courier kolonu ekler
-- =============================================

-- 1. Kolon ekle (yoksa)
ALTER TABLE packages 
ADD COLUMN IF NOT EXISTS is_paid_to_courier BOOLEAN DEFAULT false;

-- 2. Mevcut tüm paketleri "ödenmedi" (false) olarak işaretle
-- Kullanıcı isteği: Tüm geçmiş hesaplar ödenmemiş olarak başlayacak
UPDATE packages SET is_paid_to_courier = false WHERE is_paid_to_courier IS NULL;

-- 3. Index ekle (performans için)
CREATE INDEX IF NOT EXISTS idx_packages_is_paid_to_courier 
ON packages (is_paid_to_courier) 
WHERE is_paid_to_courier = false;

-- 4. Bileşik index (courier_id + is_paid + delivered_at)
CREATE INDEX IF NOT EXISTS idx_packages_courier_payment_status 
ON packages (delivered_by_courier_id, is_paid_to_courier, delivered_at);
