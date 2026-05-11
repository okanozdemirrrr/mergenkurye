/**
 * @file database/create_professional_finance_system.sql
 * @description Mergen Kurye Profesyonel Finansal Omurga
 * 
 * PAZARYERI MANTIGI (Trendyol/Yemeksepeti)
 * - Brüt Ciro: Toplam paket tutarı
 * - Masraf: Paket sayısı × Paket başı ücret (applied_price)
 * - Net Hakediş: Ciro - Masraf
 * - Bakiye: Net Hakediş - Önceki Ödemeler
 * 
 * DECIMAL HASSASIYET: Tüm parasal değerler NUMERIC(10, 2) - kuruş kaybı YOK
 */

-- ============================================================================
-- 1. RESTAURANT_PAYMENT_TRANSACTIONS TABLOSU
-- ============================================================================
-- Tüm ödeme işlemlerinin audit log'u (silme YOK, sadece ekleme)

CREATE TABLE IF NOT EXISTS restaurant_payment_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE RESTRICT,
    
    -- Tarih ve Zaman
    transaction_date DATE NOT NULL DEFAULT CURRENT_DATE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Finansal Detaylar (DECIMAL HASSASIYET)
    total_order_amount NUMERIC(10, 2) NOT NULL DEFAULT 0,  -- Brüt ciro
    total_package_cost NUMERIC(10, 2) NOT NULL DEFAULT 0,  -- Toplam masraf
    net_amount NUMERIC(10, 2) NOT NULL DEFAULT 0,          -- Net hakediş (ciro - masraf)
    amount_paid NUMERIC(10, 2) NOT NULL DEFAULT 0,         -- Ödenen tutar
    
    -- Borç Yönetimi
    previous_debt NUMERIC(10, 2) NOT NULL DEFAULT 0,       -- Önceki borç
    new_debt NUMERIC(10, 2) NOT NULL DEFAULT 0,            -- Yeni borç (eksik ödeme)
    debt_paid NUMERIC(10, 2) NOT NULL DEFAULT 0,           -- Borçtan ödenen
    
    -- İşlem Detayları
    package_count INTEGER NOT NULL DEFAULT 0,              -- Kaç paket
    order_ids INTEGER[] DEFAULT '{}',                      -- Hangi siparişler
    
    -- Admin ve Notlar
    admin_id UUID REFERENCES users(id) ON DELETE SET NULL,
    notes TEXT,
    
    -- İndeksler
    CONSTRAINT valid_amounts CHECK (
        total_order_amount >= 0 AND
        total_package_cost >= 0 AND
        net_amount >= 0 AND
        amount_paid >= 0 AND
        previous_debt >= 0 AND
        new_debt >= 0 AND
        debt_paid >= 0
    )
);

-- İndeksler (Performans)
CREATE INDEX IF NOT EXISTS idx_rpt_restaurant_id ON restaurant_payment_transactions(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_rpt_transaction_date ON restaurant_payment_transactions(transaction_date);
CREATE INDEX IF NOT EXISTS idx_rpt_created_at ON restaurant_payment_transactions(created_at);

-- Yorumlar
COMMENT ON TABLE restaurant_payment_transactions IS 'Restoran ödeme işlemleri audit log - SİLME YOK, sadece ekleme';
COMMENT ON COLUMN restaurant_payment_transactions.net_amount IS 'Net hakediş = total_order_amount - total_package_cost';
COMMENT ON COLUMN restaurant_payment_transactions.new_debt IS 'Eksik ödeme varsa yeni borç tutarı';


-- ============================================================================
-- 2. RESTAURANT_DEBTS TABLOSU (Mevcut yapıyı kontrol et)
-- ============================================================================
-- Restoran borç takibi (kısmi ödemeler için)

CREATE TABLE IF NOT EXISTS restaurant_debts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE RESTRICT,
    
    -- Borç Detayları
    debt_date DATE NOT NULL,
    amount NUMERIC(10, 2) NOT NULL,              -- Orijinal borç tutarı
    remaining_amount NUMERIC(10, 2) NOT NULL,    -- Kalan borç
    
    -- Durum
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'cancelled')),
    
    -- Zaman Damgaları
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Notlar
    notes TEXT,
    
    CONSTRAINT valid_debt_amounts CHECK (
        amount >= 0 AND
        remaining_amount >= 0 AND
        remaining_amount <= amount
    )
);

-- İndeksler
CREATE INDEX IF NOT EXISTS idx_rd_restaurant_id ON restaurant_debts(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_rd_status ON restaurant_debts(status);
CREATE INDEX IF NOT EXISTS idx_rd_debt_date ON restaurant_debts(debt_date);

-- Yorumlar
COMMENT ON TABLE restaurant_debts IS 'Restoran borç takibi - kısmi ödemeler için';
COMMENT ON COLUMN restaurant_debts.remaining_amount IS 'Kalan borç tutarı - ödemelerle azalır';


-- ============================================================================
-- 3. PACKAGES TABLOSUNA RESTAURANT_SETTLED_AT KONTROLÜ
-- ============================================================================
-- Hangi siparişlerin ödemesi yapıldı?

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'packages' AND column_name = 'restaurant_settled_at'
    ) THEN
        ALTER TABLE packages 
        ADD COLUMN restaurant_settled_at TIMESTAMPTZ;
        
        COMMENT ON COLUMN packages.restaurant_settled_at IS 'Restorana ödeme yapıldığı zaman';
    END IF;
END $$;


-- ============================================================================
-- 4. APPLIED_PRICE KONTROLÜ (Snapshot Fiyat)
-- ============================================================================
-- Her paketin oluşturulduğu andaki paket başı ücret

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'packages' AND column_name = 'applied_price'
    ) THEN
        ALTER TABLE packages 
        ADD COLUMN applied_price NUMERIC(10, 2);
        
        COMMENT ON COLUMN packages.applied_price IS 'Paketin oluşturulduğu andaki paket başı ücret (snapshot)';
        
        -- Mevcut paketlere restoranın güncel package_fee değerini ata
        UPDATE packages
        SET applied_price = (
            SELECT COALESCE(package_fee, 100)
            FROM restaurants 
            WHERE restaurants.id = packages.restaurant_id
        )
        WHERE applied_price IS NULL;
    END IF;
END $$;


-- ============================================================================
-- 5. TRIGGER: YENİ PAKET OLUŞTURULDUĞUNDA APPLIED_PRICE OTO-DOLDUR
-- ============================================================================

CREATE OR REPLACE FUNCTION set_applied_price_on_package_insert()
RETURNS TRIGGER AS $$
BEGIN
    -- Eğer applied_price boşsa, restoranın güncel package_fee'sini al
    IF NEW.applied_price IS NULL THEN
        SELECT COALESCE(package_fee, 100)
        INTO NEW.applied_price
        FROM restaurants
        WHERE id = NEW.restaurant_id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_set_applied_price ON packages;
CREATE TRIGGER trigger_set_applied_price
    BEFORE INSERT ON packages
    FOR EACH ROW
    EXECUTE FUNCTION set_applied_price_on_package_insert();


-- ============================================================================
-- 6. VERİ TUTARLILIĞI KONTROL FONKSİYONU
-- ============================================================================
-- Admin panelinde kullanılacak - restoran finansal özeti

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
    mevcut_borc NUMERIC(10, 2),
    odenecek_net NUMERIC(10, 2),
    paket_sayisi INTEGER
) AS $$
BEGIN
    RETURN QUERY
    WITH delivered_packages AS (
        SELECT 
            p.id,
            p.amount,
            COALESCE(p.applied_price, r.package_fee, 100) as package_cost
        FROM packages p
        JOIN restaurants r ON r.id = p.restaurant_id
        WHERE p.restaurant_id = p_restaurant_id
          AND p.status = 'delivered'
          AND (p_start_date IS NULL OR p.delivered_at >= p_start_date)
          AND (p_end_date IS NULL OR p.delivered_at <= p_end_date)
    ),
    package_summary AS (
        SELECT 
            COALESCE(SUM(amount), 0) as total_revenue,
            COALESCE(SUM(package_cost), 0) as total_cost,
            COUNT(*) as pkg_count
        FROM delivered_packages
    ),
    payment_summary AS (
        SELECT COALESCE(SUM(amount_paid), 0) as total_paid
        FROM restaurant_payment_transactions
        WHERE restaurant_id = p_restaurant_id
          AND (p_start_date IS NULL OR transaction_date >= p_start_date)
          AND (p_end_date IS NULL OR transaction_date <= p_end_date)
    ),
    debt_summary AS (
        SELECT COALESCE(SUM(remaining_amount), 0) as total_debt
        FROM restaurant_debts
        WHERE restaurant_id = p_restaurant_id
          AND status = 'pending'
    )
    SELECT 
        ps.total_revenue as brut_ciro,
        ps.total_cost as toplam_masraf,
        (ps.total_revenue - ps.total_cost) as net_hakedis,
        pys.total_paid as onceki_odemeler,
        ds.total_debt as mevcut_borc,
        (ps.total_revenue - ps.total_cost - pys.total_paid + ds.total_debt) as odenecek_net,
        ps.pkg_count::INTEGER as paket_sayisi
    FROM package_summary ps
    CROSS JOIN payment_summary pys
    CROSS JOIN debt_summary ds;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_restaurant_financial_summary IS 'Restoran finansal özeti - Brüt ciro, masraf, net hakediş, ödemeler, borç';


-- ============================================================================
-- 7. TEST VERİSİ (Opsiyonel - Geliştirme için)
-- ============================================================================
-- Test için örnek veri oluştur

-- SELECT get_restaurant_financial_summary(
--     'restaurant-uuid-buraya',
--     '2024-01-01'::DATE,
--     '2024-12-31'::DATE
-- );


-- ============================================================================
-- BAŞARILI KURULUM MESAJI
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '✅ Profesyonel Finansal Omurga Kuruldu!';
    RAISE NOTICE '📊 Tablolar: restaurant_payment_transactions, restaurant_debts';
    RAISE NOTICE '🔧 Trigger: set_applied_price_on_package_insert';
    RAISE NOTICE '📈 Fonksiyon: get_restaurant_financial_summary()';
    RAISE NOTICE '💰 Decimal Hassasiyet: NUMERIC(10, 2) - Kuruş kaybı YOK';
END $$;
