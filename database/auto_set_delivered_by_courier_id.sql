-- =====================================================
-- AUTO SET delivered_by_courier_id TRIGGER
-- =====================================================
-- Amaç: Paket 'delivered' durumuna geçtiğinde, eğer delivered_by_courier_id
--       NULL ise, otomatik olarak courier_id'yi kopyala
-- 
-- Neden Gerekli: Kodun birçok yerinde status: 'delivered' güncellenirken
--                delivered_by_courier_id atanmayı unutabiliriz. Bu trigger
--                güvenlik ağı görevi görür.
-- =====================================================

-- Trigger fonksiyonu
CREATE OR REPLACE FUNCTION auto_set_delivered_by_courier_id()
RETURNS TRIGGER AS $$
BEGIN
    -- Eğer status 'delivered' olarak değiştiriliyorsa
    IF NEW.status = 'delivered' THEN
        -- delivered_by_courier_id NULL ise ve courier_id varsa
        IF NEW.delivered_by_courier_id IS NULL AND NEW.courier_id IS NOT NULL THEN
            NEW.delivered_by_courier_id := NEW.courier_id;
            
            -- Log için (opsiyonel)
            RAISE NOTICE 'Auto-set delivered_by_courier_id: Package #% -> Courier %', 
                NEW.id, NEW.courier_id;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger'ı oluştur (eğer varsa önce sil)
DROP TRIGGER IF EXISTS tr_auto_set_delivered_by_courier_id ON packages;

CREATE TRIGGER tr_auto_set_delivered_by_courier_id
    BEFORE UPDATE ON packages
    FOR EACH ROW
    WHEN (NEW.status = 'delivered')
    EXECUTE FUNCTION auto_set_delivered_by_courier_id();

-- =====================================================
-- TEST
-- =====================================================
-- Test için bir paket güncelle (sadece test amaçlı, production'da çalıştırma!)
-- UPDATE packages 
-- SET status = 'delivered', delivered_at = NOW()
-- WHERE id = 123 AND courier_id IS NOT NULL;
-- 
-- Kontrol et:
-- SELECT id, courier_id, delivered_by_courier_id, status 
-- FROM packages 
-- WHERE id = 123;
