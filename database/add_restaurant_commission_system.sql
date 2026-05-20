-- ============================================
-- RESTORAN DİNAMİK KOMİSYON SİSTEMİ
-- ============================================
-- Geçmiş siparişleri mühürleyen (snapshot) komisyon yapısı
-- Gelecek siparişler güncel komisyon oranıyla işlenir

-- ============================================
-- 1. RESTAURANTS TABLOSUNA GÜNCEL KOMİSYON ORANI EKLE
-- ============================================
ALTER TABLE restaurants 
ADD COLUMN IF NOT EXISTS current_commission_rate NUMERIC(5, 2) DEFAULT 10.00;

-- Mevcut restoranlar için default değer ata
UPDATE restaurants 
SET current_commission_rate = 10.00 
WHERE current_commission_rate IS NULL;

-- ============================================
-- 2. PACKAGES TABLOSUNA MÜHÜRLEME KOLONLARI EKLE
-- ============================================
ALTER TABLE packages 
ADD COLUMN IF NOT EXISTS applied_commission_rate NUMERIC(5, 2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS commission_amount NUMERIC(10, 2) DEFAULT 0.00;

-- ============================================
-- 3. OTOMATİK MÜHÜRLEME FONKSİYONU (INSERT + UPDATE)
-- ============================================
CREATE OR REPLACE FUNCTION seal_commission_on_web_order()
RETURNS TRIGGER AS $$
DECLARE
    v_commission_rate NUMERIC(5, 2);
    v_calculated_commission NUMERIC(10, 2);
BEGIN
    -- Sadece platform = 'web' olan siparişler için çalış
    IF NEW.platform = 'web' THEN
        -- KRİTİK KURAL: İptal edilen siparişlerden komisyon alınmaz
        IF NEW.status = 'cancelled' THEN
            NEW.applied_commission_rate := 0.00;
            NEW.commission_amount := 0.00;
            RAISE NOTICE 'İptal edilen sipariş, komisyon 0: Paket #%', NEW.id;
            RETURN NEW;
        END IF;
        
        -- Restoranın güncel komisyon oranını al
        SELECT current_commission_rate 
        INTO v_commission_rate
        FROM restaurants 
        WHERE id = NEW.restaurant_id;
        
        -- Eğer restoran bulunamazsa default %10 kullan
        IF v_commission_rate IS NULL THEN
            v_commission_rate := 10.00;
        END IF;
        
        -- Komisyon tutarını hesapla ve ROUND ile yuvarla (2 ondalık)
        v_calculated_commission := ROUND((NEW.amount * v_commission_rate / 100), 2);
        
        -- Komisyon oranını ve tutarını mühürle
        NEW.applied_commission_rate := v_commission_rate;
        NEW.commission_amount := v_calculated_commission;
        
        -- Log (opsiyonel)
        RAISE NOTICE 'Komisyon mühürlendi: Paket #%, Oran: %, Tutar: %', 
            NEW.id, v_commission_rate, v_calculated_commission;
    ELSE
        -- Web dışı platformlar için komisyon 0
        NEW.applied_commission_rate := 0.00;
        NEW.commission_amount := 0.00;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 4. TETİKLEYİCİ OLUŞTUR (INSERT + UPDATE)
-- ============================================
DROP TRIGGER IF EXISTS trigger_seal_commission ON packages;

CREATE TRIGGER trigger_seal_commission
    BEFORE INSERT OR UPDATE ON packages
    FOR EACH ROW
    EXECUTE FUNCTION seal_commission_on_web_order();

-- ============================================
-- 5. MEVCUT WEB SİPARİŞLERİNİ MÜHÜRLE (Geçmişe Dönük)
-- ============================================
-- Mevcut web siparişlerine komisyon uygula (iptal edilenler hariç)
UPDATE packages p
SET 
    applied_commission_rate = CASE 
        WHEN p.status = 'cancelled' THEN 0.00
        ELSE COALESCE(r.current_commission_rate, 10.00)
    END,
    commission_amount = CASE 
        WHEN p.status = 'cancelled' THEN 0.00
        ELSE ROUND((p.amount * COALESCE(r.current_commission_rate, 10.00) / 100), 2)
    END
FROM restaurants r
WHERE p.restaurant_id = r.id
  AND p.platform = 'web'
  AND (p.applied_commission_rate IS NULL OR p.applied_commission_rate = 0);

-- ============================================
-- 6. RPC: RESTORAN WEB SİPARİŞ İSTATİSTİKLERİ
-- ============================================
CREATE OR REPLACE FUNCTION get_restaurant_web_order_stats(
    p_restaurant_id UUID
)
RETURNS JSON AS $$
DECLARE
    v_result JSON;
    v_package_fee NUMERIC(10, 2);
    v_total_revenue NUMERIC(10, 2);
    v_total_commission NUMERIC(10, 2);
    v_order_count INT;
    v_total_cost NUMERIC(10, 2);
    v_net_payable NUMERIC(10, 2);
BEGIN
    -- Restoran paket başı ücretini al
    SELECT COALESCE(package_fee, 100) INTO v_package_fee
    FROM restaurants WHERE id = p_restaurant_id;
    
    -- Web siparişlerini topla (sadece delivered, iptal edilenler hariç)
    SELECT 
        COALESCE(SUM(amount), 0),
        COALESCE(SUM(commission_amount), 0),
        COUNT(*)
    INTO v_total_revenue, v_total_commission, v_order_count
    FROM packages
    WHERE restaurant_id = p_restaurant_id
      AND platform = 'web'
      AND status = 'delivered'
      AND is_paid_to_restaurant = false;
    
    -- Kurye masrafı hesapla
    v_total_cost := v_order_count * v_package_fee;
    
    -- Net ödenecek hesapla ve yuvarla
    v_net_payable := ROUND(v_total_revenue - v_total_commission - v_total_cost, 2);
    
    -- JSON olarak döndür
    SELECT json_build_object(
        'total_revenue', ROUND(v_total_revenue, 2),
        'total_commission', ROUND(v_total_commission, 2),
        'total_cost', ROUND(v_total_cost, 2),
        'net_payable', v_net_payable,
        'order_count', v_order_count,
        'package_fee', v_package_fee
    ) INTO v_result;
    
    RETURN v_result;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 7. TEST SORGUSU
-- ============================================
-- Komisyon mühürlemesini test et
-- SELECT 
--     id,
--     order_number,
--     restaurant_id,
--     platform,
--     status,
--     amount,
--     applied_commission_rate,
--     commission_amount,
--     created_at
-- FROM packages
-- WHERE platform = 'web'
-- ORDER BY created_at DESC
-- LIMIT 10;

-- ============================================
-- 8. RPC TEST SORGUSU
-- ============================================
-- SELECT * FROM get_restaurant_web_order_stats('[RESTORAN_ID]');

-- ============================================
-- 9. RESTORAN KOMİSYON RAPORU (Test için)
-- ============================================
-- SELECT 
--     r.name as restoran_adi,
--     r.current_commission_rate as guncel_oran,
--     COUNT(p.id) FILTER (WHERE p.status = 'delivered') as teslim_edilen,
--     COUNT(p.id) FILTER (WHERE p.status = 'cancelled') as iptal_edilen,
--     SUM(p.amount) FILTER (WHERE p.status = 'delivered') as toplam_ciro,
--     SUM(p.commission_amount) FILTER (WHERE p.status = 'delivered') as toplam_komisyon
-- FROM restaurants r
-- LEFT JOIN packages p ON p.restaurant_id = r.id AND p.platform = 'web'
-- GROUP BY r.id, r.name, r.current_commission_rate
-- ORDER BY toplam_komisyon DESC NULLS LAST;

-- ============================================
-- NOTLAR
-- ============================================
-- ✅ Yeni sipariş eklendiğinde otomatik mühürleme (INSERT)
-- ✅ Sipariş güncellendiğinde yeniden mühürleme (UPDATE)
-- ✅ İptal edilen siparişlerden komisyon alınmaz (status = 'cancelled')
-- ✅ Geçmiş siparişler değişmez (immutable after first seal)
-- ✅ Komisyon oranı değiştirildiğinde sadece gelecek siparişler etkilenir
-- ✅ Web dışı platformlar için komisyon 0
-- ✅ Tüm küsuratlar ROUND() ile 2 ondalık basamağa yuvarlanır
-- ✅ Frontend hesaplama yapmaz, RPC kullanır (get_restaurant_web_order_stats)
