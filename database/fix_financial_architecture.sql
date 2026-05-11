/**
 * @file database/fix_financial_architecture.sql
 * @description Mergen Kurye Finansal Mimari Düzeltmesi
 * 
 * KRITIK DEĞİŞİKLİK:
 * restaurant_debts artık "Paket Masrafı Borçları"nı temsil ediyor
 * 
 * YENİ FORMÜL:
 * Brüt Ciro = SUM(packages.amount)
 * Toplam Masraf = SUM(restaurant_debts.amount) [Paket sayısı × Paket ücreti]
 * Net Ödenmesi Gereken = (Brüt Ciro - Toplam Masraf) - Önceki Ödemeler
 */

-- ============================================================================
-- 1. RESTAURANT_DEBTS TABLOSUNU YENİDEN TANIMLA
-- ============================================================================
-- Artık "Paket Masrafı Borçları" için kullanılacak

-- Tablo yapısını kontrol et ve güncelle
DO $$ 
BEGIN
    -- Eğer tablo yoksa oluştur
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'restaurant_debts') THEN
        CREATE TABLE restaurant_debts (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE RESTRICT,
            
            -- Masraf Detayları
            debt_date DATE NOT NULL DEFAULT CURRENT_DATE,
            amount NUMERIC(10, 2) NOT NULL,              -- Paket masrafı tutarı
            package_count INTEGER NOT NULL DEFAULT 0,     -- Kaç paket için
            package_fee NUMERIC(10, 2) NOT NULL,         -- Paket başı ücret (snapshot)
            
            -- Durum
            status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'cancelled')),
            
            -- Zaman Damgaları
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            
            CONSTRAINT valid_debt_amounts CHECK (
                amount >= 0 AND
                package_count >= 0 AND
                package_fee >= 0 AND
                amount = (package_count * package_fee)
            )
        );
        
        -- İndeksler
        CREATE INDEX idx_rd_restaurant_id ON restaurant_debts(restaurant_id);
        CREATE INDEX idx_rd_status ON restaurant_debts(status);
        CREATE INDEX idx_rd_debt_date ON restaurant_debts(debt_date);
        
        COMMENT ON TABLE restaurant_debts IS 'Restoran paket masrafı borçları - Her sipariş için paket ücreti';
        COMMENT ON COLUMN restaurant_debts.amount IS 'Toplam masraf = package_count × package_fee';
    ELSE
        -- Tablo varsa, eksik kolonları ekle
        
        -- package_count kolonu
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'restaurant_debts' AND column_name = 'package_count') THEN
            ALTER TABLE restaurant_debts ADD COLUMN package_count INTEGER NOT NULL DEFAULT 0;
        END IF;
        
        -- package_fee kolonu
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'restaurant_debts' AND column_name = 'package_fee') THEN
            ALTER TABLE restaurant_debts ADD COLUMN package_fee NUMERIC(10, 2) NOT NULL DEFAULT 100;
        END IF;
        
        -- updated_at kolonu
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'restaurant_debts' AND column_name = 'updated_at') THEN
            ALTER TABLE restaurant_debts ADD COLUMN updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
        END IF;
        
        -- remaining_amount kolonunu kaldır (artık kullanılmıyor)
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'restaurant_debts' AND column_name = 'remaining_amount') THEN
            ALTER TABLE restaurant_debts DROP COLUMN IF EXISTS remaining_amount;
        END IF;
        
        -- notes kolonunu kaldır (kullanılmıyor, trigger'da da yok artık)
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'restaurant_debts' AND column_name = 'notes') THEN
            ALTER TABLE restaurant_debts DROP COLUMN IF EXISTS notes;
        END IF;
    END IF;
END $$;


-- ============================================================================
-- 2. RESTAURANT_PAYMENT_TRANSACTIONS TABLOSUNU GÜNCELLEYİN
-- ============================================================================

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'restaurant_payment_transactions') THEN
        CREATE TABLE restaurant_payment_transactions (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE RESTRICT,
            
            -- Tarih ve Zaman
            transaction_date DATE NOT NULL DEFAULT CURRENT_DATE,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            
            -- Finansal Detaylar (DECIMAL HASSASIYET)
            brut_ciro NUMERIC(10, 2) NOT NULL DEFAULT 0,           -- Toplam paket tutarı
            toplam_masraf NUMERIC(10, 2) NOT NULL DEFAULT 0,       -- restaurant_debts toplamı
            net_hakedis NUMERIC(10, 2) NOT NULL DEFAULT 0,         -- Ciro - Masraf
            amount_paid NUMERIC(10, 2) NOT NULL DEFAULT 0,         -- Ödenen tutar
            
            -- İşlem Detayları
            package_count INTEGER NOT NULL DEFAULT 0,              -- Kaç paket
            order_ids INTEGER[] DEFAULT '{}',                      -- Hangi siparişler
            
            -- Admin ve Notlar
            admin_id UUID REFERENCES users(id) ON DELETE SET NULL,
            notes TEXT,
            
            CONSTRAINT valid_payment_amounts CHECK (
                brut_ciro >= 0 AND
                toplam_masraf >= 0 AND
                net_hakedis >= 0 AND
                amount_paid >= 0 AND
                net_hakedis = (brut_ciro - toplam_masraf)
            )
        );
        
        -- İndeksler
        CREATE INDEX idx_rpt_restaurant_id ON restaurant_payment_transactions(restaurant_id);
        CREATE INDEX idx_rpt_transaction_date ON restaurant_payment_transactions(transaction_date);
        CREATE INDEX idx_rpt_created_at ON restaurant_payment_transactions(created_at);
        
        COMMENT ON TABLE restaurant_payment_transactions IS 'Restoran ödeme işlemleri - SİLME YOK';
        COMMENT ON COLUMN restaurant_payment_transactions.net_hakedis IS 'Net hakediş = brut_ciro - toplam_masraf';
    ELSE
        -- Eski kolonları yeniden adlandır/güncelle
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'restaurant_payment_transactions' AND column_name = 'total_order_amount') THEN
            ALTER TABLE restaurant_payment_transactions RENAME COLUMN total_order_amount TO brut_ciro;
        END IF;
        
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'restaurant_payment_transactions' AND column_name = 'total_package_cost') THEN
            ALTER TABLE restaurant_payment_transactions RENAME COLUMN total_package_cost TO toplam_masraf;
        END IF;
        
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'restaurant_payment_transactions' AND column_name = 'net_amount') THEN
            ALTER TABLE restaurant_payment_transactions RENAME COLUMN net_amount TO net_hakedis;
        END IF;
        
        -- Gereksiz kolonları kaldır
        ALTER TABLE restaurant_payment_transactions DROP COLUMN IF EXISTS previous_debt;
        ALTER TABLE restaurant_payment_transactions DROP COLUMN IF EXISTS new_debt;
        ALTER TABLE restaurant_payment_transactions DROP COLUMN IF EXISTS debt_paid;
    END IF;
END $$;


-- ============================================================================
-- 3. YENİ PAKET OLUŞTURULDUĞUNDA OTOMATİK MASRAF KAYDI OLUŞTUR
-- ============================================================================
-- KRİTİK KURAL: Kurye paketi aldıysa, iptal edilse bile masraf restorana yansır!

CREATE OR REPLACE FUNCTION create_restaurant_debt_on_delivery()
RETURNS TRIGGER AS $$
DECLARE
    v_package_fee NUMERIC(10, 2);
    v_should_charge BOOLEAN := FALSE;
BEGIN
    -- Restoranın paket ücretini al
    SELECT COALESCE(package_fee, 100)
    INTO v_package_fee
    FROM restaurants
    WHERE id = NEW.restaurant_id;
    
    -- DURUM 1: Başarıyla teslim edildi
    IF NEW.status = 'delivered' AND (OLD.status IS NULL OR OLD.status != 'delivered') THEN
        v_should_charge := TRUE;
    END IF;
    
    -- DURUM 2: İptal edildi AMA kurye paketi almıştı (EDGE-CASE)
    -- Kural: picked_up_at dolu VEYA courier_id atanmış ise masraf yansır
    IF NEW.status = 'cancelled' AND (OLD.status IS NULL OR OLD.status != 'cancelled') THEN
        IF NEW.picked_up_at IS NOT NULL OR NEW.courier_id IS NOT NULL THEN
            v_should_charge := TRUE;
            RAISE NOTICE 'İPTAL EDGE-CASE: Kurye paketi almıştı, masraf restorana yansıtılıyor. Package ID: %, Courier ID: %, Picked Up: %', 
                NEW.id, NEW.courier_id, NEW.picked_up_at;
        END IF;
    END IF;
    
    -- Masraf kaydı oluştur
    IF v_should_charge THEN
        INSERT INTO restaurant_debts (
            restaurant_id,
            debt_date,
            amount,
            package_count,
            package_fee,
            status
        ) VALUES (
            NEW.restaurant_id,
            CURRENT_DATE,
            v_package_fee,
            1,
            v_package_fee,
            'pending'
        );
        
        RAISE NOTICE 'Restoran masraf kaydı oluşturuldu: Restaurant ID: %, Amount: %, Status: %', 
            NEW.restaurant_id, v_package_fee, NEW.status;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_create_restaurant_debt ON packages;
CREATE TRIGGER trigger_create_restaurant_debt
    AFTER INSERT OR UPDATE OF status ON packages
    FOR EACH ROW
    EXECUTE FUNCTION create_restaurant_debt_on_delivery();

COMMENT ON FUNCTION create_restaurant_debt_on_delivery IS 'Paket delivered VEYA iptal edildiğinde (kurye almışsa) otomatik masraf kaydı oluşturur';


-- ============================================================================
-- 4. FİNANSAL ÖZET FONKSİYONU - YENİ MANTIK + İPTAL EDGE-CASE
-- ============================================================================

CREATE OR REPLACE FUNCTION get_restaurant_financial_summary(
    p_restaurant_id UUID,
    p_start_date DATE DEFAULT NULL,
    p_end_date DATE DEFAULT NULL
)
RETURNS TABLE (
    brut_ciro NUMERIC(10, 2),
    toplam_masraf NUMERIC(10, 2),
    net_hakedis NUMERIC(10, 2),
    onceki_odemeler NUMERIC(10, 2),
    net_odenecek NUMERIC(10, 2),
    paket_sayisi INTEGER
) AS $$
BEGIN
    RETURN QUERY
    WITH delivered_packages AS (
        -- Brüt Ciro: SADECE başarıyla teslim edilen paketler
        -- İptal edilen paketler ciroya dahil DEĞİL (restoran para kazanmaz)
        SELECT 
            COALESCE(SUM(amount), 0) as total_revenue,
            COUNT(*) as pkg_count
        FROM packages
        WHERE restaurant_id = p_restaurant_id
          AND status = 'delivered'  -- SADECE delivered
          AND (p_start_date IS NULL OR delivered_at >= p_start_date::TIMESTAMPTZ)
          AND (p_end_date IS NULL OR delivered_at <= (p_end_date::DATE + INTERVAL '1 day')::TIMESTAMPTZ)
    ),
    restaurant_costs AS (
        -- Toplam Masraf: restaurant_debts toplamı
        -- Bu tablo hem delivered hem de ücretli iptalleri içerir (trigger sayesinde)
        SELECT COALESCE(SUM(amount), 0) as total_cost
        FROM restaurant_debts
        WHERE restaurant_id = p_restaurant_id
          AND status = 'pending'
          AND (p_start_date IS NULL OR debt_date >= p_start_date)
          AND (p_end_date IS NULL OR debt_date <= p_end_date)
    ),
    previous_payments AS (
        -- Önceki Ödemeler: restaurant_payment_transactions toplamı
        SELECT COALESCE(SUM(amount_paid), 0) as total_paid
        FROM restaurant_payment_transactions
        WHERE restaurant_id = p_restaurant_id
          AND (p_start_date IS NULL OR transaction_date >= p_start_date)
          AND (p_end_date IS NULL OR transaction_date <= p_end_date)
    )
    SELECT 
        dp.total_revenue as brut_ciro,
        rc.total_cost as toplam_masraf,
        (dp.total_revenue - rc.total_cost) as net_hakedis,
        pp.total_paid as onceki_odemeler,
        (dp.total_revenue - rc.total_cost - pp.total_paid) as net_odenecek,
        dp.pkg_count::INTEGER as paket_sayisi
    FROM delivered_packages dp
    CROSS JOIN restaurant_costs rc
    CROSS JOIN previous_payments pp;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_restaurant_financial_summary IS 'YENİ MANTIK: Brüt Ciro (sadece delivered) - Toplam Masraf (delivered + ücretli iptaller) - Önceki Ödemeler';


-- ============================================================================
-- 5. TEST VERİSİ TEMİZLEME (Opsiyonel)
-- ============================================================================

-- Geliştirme ortamında test için eski verileri temizle
-- TRUNCATE TABLE restaurant_payment_transactions CASCADE;
-- TRUNCATE TABLE restaurant_debts CASCADE;


-- ============================================================================
-- BAŞARILI KURULUM MESAJI
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '✅ Finansal Mimari Düzeltildi + İptal Edge-Case Eklendi!';
    RAISE NOTICE '📊 restaurant_debts artık "Paket Masrafı Borçları"';
    RAISE NOTICE '💰 Formül: Net Ödenecek = (Brüt Ciro - Toplam Masraf) - Önceki Ödemeler';
    RAISE NOTICE '🔧 Trigger: create_restaurant_debt_on_delivery';
    RAISE NOTICE '⚠️ İPTAL KURALI: Kurye paketi aldıysa, iptal edilse bile masraf restorana yansır!';
    RAISE NOTICE '📈 Fonksiyon: get_restaurant_financial_summary()';
END $$;
