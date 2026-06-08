-- ============================================
-- ÜCRETLİ İPTALLERİ DÜZELT VE TRİGGER EKLE
-- ============================================

-- 1. Mevcut iptal edilmiş siparişleri güncelle
-- Tek kural: Kurye atandıysa (assigned_at veya courier_id var) → ücretli iptal
UPDATE packages
SET is_chargeable_cancellation = true
WHERE status = 'cancelled'
  AND is_chargeable_cancellation = false  -- Sadece false olanları güncelle
  AND (assigned_at IS NOT NULL OR courier_id IS NOT NULL);  -- Kurye atandı

-- 2. Trigger fonksiyonu oluştur
CREATE OR REPLACE FUNCTION set_chargeable_cancellation()
RETURNS TRIGGER AS $$
BEGIN
    -- Eğer sipariş iptal ediliyorsa ve kurye atanmışsa ücretli say
    IF NEW.status = 'cancelled' THEN
        NEW.is_chargeable_cancellation :=
            (COALESCE(OLD.courier_id, NEW.courier_id) IS NOT NULL)
            OR (COALESCE(OLD.assigned_at, NEW.assigned_at) IS NOT NULL);
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3. Trigger oluştur (eğer yoksa)
DROP TRIGGER IF EXISTS trigger_set_chargeable_cancellation ON packages;
CREATE TRIGGER trigger_set_chargeable_cancellation
    BEFORE INSERT OR UPDATE ON packages
    FOR EACH ROW
    EXECUTE FUNCTION set_chargeable_cancellation();

-- 4. Kontrol sorgusu
SELECT 
    status,
    is_chargeable_cancellation,
    picked_up_at IS NOT NULL as has_picked_up,
    courier_id IS NOT NULL as has_courier,
    COUNT(*) as count
FROM packages
WHERE status = 'cancelled'
GROUP BY status, is_chargeable_cancellation, has_picked_up, has_courier
ORDER BY is_chargeable_cancellation DESC;

-- 5. İkramdöner'in iptal edilmiş siparişlerini kontrol et
SELECT 
    id,
    order_number,
    status,
    is_chargeable_cancellation,
    picked_up_at,
    courier_id,
    amount,
    created_at
FROM packages
WHERE restaurant_id = (SELECT id FROM restaurants WHERE name ILIKE '%ikram%')
    AND status = 'cancelled'
ORDER BY created_at DESC;
