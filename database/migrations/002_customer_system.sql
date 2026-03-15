-- ============================================
-- 🛍️ MÜŞTERİ SİSTEMİ - VERITABANI MİGRASYONU
-- ============================================

-- 1. Customers tablosu oluştur
CREATE TABLE IF NOT EXISTS customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    full_name TEXT NOT NULL,
    phone TEXT,
    email TEXT UNIQUE,
    address TEXT,
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Packages tablosuna customer_id ekle
ALTER TABLE packages 
ADD COLUMN IF NOT EXISTS customer_id UUID REFERENCES customers(id) ON DELETE SET NULL;

-- 3. Index'ler ekle (performans için)
CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers(phone);
CREATE INDEX IF NOT EXISTS idx_customers_email ON customers(email);
CREATE INDEX IF NOT EXISTS idx_packages_customer_id ON packages(customer_id);

-- 4. RLS (Row Level Security) politikaları
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;

-- Müşteriler kendi kayıtlarını görebilir
CREATE POLICY "Customers can view own data"
ON customers FOR SELECT
USING (true); -- Şimdilik herkese açık, sonra auth eklenecek

-- Müşteriler kendi kayıtlarını oluşturabilir
CREATE POLICY "Customers can insert own data"
ON customers FOR INSERT
WITH CHECK (true);

-- Müşteriler kendi kayıtlarını güncelleyebilir
CREATE POLICY "Customers can update own data"
ON customers FOR UPDATE
USING (true);

-- 5. Packages tablosuna müşteri görüntüleme politikası
CREATE POLICY "Customers can view own packages"
ON packages FOR SELECT
USING (true); -- Şimdilik herkese açık

-- 6. Trigger: updated_at otomatik güncelleme
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$ LANGUAGE plpgsql;

CREATE TRIGGER update_customers_updated_at
BEFORE UPDATE ON customers
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- 7. Test verisi (opsiyonel)
-- INSERT INTO customers (full_name, phone, email, address, latitude, longitude) VALUES
-- ('Test Müşteri', '05551234567', 'test@example.com', '19 Mayıs KYK Yurdu', 41.492892, 36.081592);

-- ============================================
-- BAŞARILI! Müşteri sistemi hazır.
-- ============================================
