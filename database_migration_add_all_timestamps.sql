-- packages tablosuna tüm zaman damgası sütunlarını ekle

-- 1. assigned_at - Admin kurye atadığında
ALTER TABLE packages 
ADD COLUMN IF NOT EXISTS assigned_at TIMESTAMPTZ;

COMMENT ON COLUMN packages.assigned_at IS 'Kurye atandığı zaman (admin tarafından)';

-- 2. accepted_at - Kurye "Kabul Et" butonuna bastığında
ALTER TABLE packages 
ADD COLUMN IF NOT EXISTS accepted_at TIMESTAMPTZ;

COMMENT ON COLUMN packages.accepted_at IS 'Kurye paketi kabul ettiği zaman';

-- 3. picked_up_at - Kurye restorandan paketi aldığında
ALTER TABLE packages 
ADD COLUMN IF NOT EXISTS picked_up_at TIMESTAMPTZ;

COMMENT ON COLUMN packages.picked_up_at IS 'Kurye paketi restorandan aldığı zaman';

-- 4. delivered_at - Kurye müşteriye teslim ettiğinde
ALTER TABLE packages 
ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMPTZ;

COMMENT ON COLUMN packages.delivered_at IS 'Paketin müşteriye teslim edildiği zaman';

-- Index'ler ekle (performans için)
CREATE INDEX IF NOT EXISTS idx_packages_assigned_at ON packages(assigned_at);
CREATE INDEX IF NOT EXISTS idx_packages_accepted_at ON packages(accepted_at);
CREATE INDEX IF NOT EXISTS idx_packages_picked_up_at ON packages(picked_up_at);
CREATE INDEX IF NOT EXISTS idx_packages_delivered_at ON packages(delivered_at);

-- Mevcut delivered paketler için delivered_at'ı created_at'tan kopyala (sadece null olanlar için)
UPDATE packages 
SET delivered_at = created_at 
WHERE status = 'delivered' AND delivered_at IS NULL;

-- Bilgi mesajı
DO $$
BEGIN
    RAISE NOTICE 'Zaman damgası sütunları başarıyla eklendi veya zaten mevcut:';
    RAISE NOTICE '- assigned_at: Kurye atama zamanı (admin)';
    RAISE NOTICE '- accepted_at: Kurye kabul zamanı';
    RAISE NOTICE '- picked_up_at: Restorandan alma zamanı';
    RAISE NOTICE '- delivered_at: Müşteriye teslim zamanı';
END $$;
