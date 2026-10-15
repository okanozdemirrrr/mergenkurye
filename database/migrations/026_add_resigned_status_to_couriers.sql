-- ==============================================================================
-- 026_add_resigned_status_to_couriers.sql
-- Kuryeler için 'resigned' (İşten Kendisi Çıkan) Hesap Durumu Eklenmesi
-- ==============================================================================

ALTER TABLE public.couriers 
DROP CONSTRAINT IF EXISTS couriers_account_status_check;

ALTER TABLE public.couriers 
ADD CONSTRAINT couriers_account_status_check 
CHECK (account_status IN ('active', 'suspended', 'terminated', 'resigned'));

COMMENT ON COLUMN public.couriers.account_status IS 'Hesap durumu: active (aktif), suspended (geçici kapalı), terminated (işten çıkarıldı), resigned (işten kendisi çıktı)';
