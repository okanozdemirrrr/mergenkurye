-- ==============================================================================
-- Kuryeler için 'resigned' (İşten Kendisi Çıkan) Hesap Durumu Eklenmesi
-- ==============================================================================
-- Bu migration, kuryelerin hesap durumu kısıtlamasına 'resigned' durumunu ekler.
-- Supabase SQL Editor'de çalıştırılmalıdır.

-- 1. Mevcut check constraint'i kaldır
ALTER TABLE public.couriers 
DROP CONSTRAINT IF EXISTS couriers_account_status_check;

-- 2. 'resigned' durumunu da içeren güncellenmiş check constraint'i ekle
ALTER TABLE public.couriers 
ADD CONSTRAINT couriers_account_status_check 
CHECK (account_status IN ('active', 'suspended', 'terminated', 'resigned'));

-- 3. Yorum ekle
COMMENT ON COLUMN public.couriers.account_status IS 'Hesap durumu: active (aktif), suspended (geçici kapalı), terminated (işten çıkarıldı), resigned (işten kendisi çıktı)';
