-- =====================================================
-- MERGEN KURYE SİSTEMİ - ÇOK ŞİRKETLİ MİMARİ
-- =====================================================

-- 1. ŞİRKETLER TABLOSU
CREATE TABLE IF NOT EXISTS companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_code VARCHAR(50) UNIQUE NOT NULL, -- Benzersiz şirket kodu (MERGEN001, ACME002, vb.)
  company_name VARCHAR(255) NOT NULL,
  logo_url TEXT, -- Şirket logosu URL'i
  theme_primary_color VARCHAR(7) DEFAULT '#f97316', -- Ana renk (hex)
  theme_secondary_color VARCHAR(7) DEFAULT '#ea580c', -- İkincil renk
  theme_accent_color VARCHAR(7) DEFAULT '#fb923c', -- Vurgu rengi
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. KULLANICILAR TABLOSU (Tüm kullanıcı tipleri için birleşik)
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  username VARCHAR(100) NOT NULL,
  password VARCHAR(255) NOT NULL, -- Hash'lenmiş şifre
  email VARCHAR(255),
  full_name VARCHAR(255),
  phone VARCHAR(20),
  user_type VARCHAR(20) NOT NULL CHECK (user_type IN ('admin', 'courier', 'restaurant')),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Birleşik benzersiz anahtar: Aynı kullanıcı adı farklı şirketlerde olabilir
  UNIQUE(company_id, username)
);

-- 3. COURIERS TABLOSUNU GÜNCELLE (company_id ekle)
ALTER TABLE couriers 
ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id) ON DELETE CASCADE;

-- 4. RESTAURANTS TABLOSUNU GÜNCELLE (company_id ekle)
ALTER TABLE restaurants 
ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id) ON DELETE CASCADE;

-- 5. PACKAGES TABLOSUNU GÜNCELLE (company_id ekle)
ALTER TABLE packages 
ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id) ON DELETE CASCADE;

-- 6. İNDEXLER (Performans için)
CREATE INDEX IF NOT EXISTS idx_users_company_username ON users(company_id, username);
CREATE INDEX IF NOT EXISTS idx_users_company_type ON users(company_id, user_type);
CREATE INDEX IF NOT EXISTS idx_couriers_company ON couriers(company_id);
CREATE INDEX IF NOT EXISTS idx_restaurants_company ON restaurants(company_id);
CREATE INDEX IF NOT EXISTS idx_packages_company ON packages(company_id);

-- 7. ÖRNEK ŞİRKET VERİSİ (Test için)
INSERT INTO companies (company_code, company_name, logo_url, theme_primary_color, theme_secondary_color, theme_accent_color)
VALUES 
  ('MERGEN001', 'Mergen Kurye', '/logo.png', '#f97316', '#ea580c', '#fb923c'),
  ('DEMO001', 'Demo Şirket', '/logo.png', '#3b82f6', '#2563eb', '#60a5fa')
ON CONFLICT (company_code) DO NOTHING;

-- 8. ÖRNEK KULLANICILAR (Test için - ŞİFRELER HASH'LENMELİ!)
-- NOT: Gerçek uygulamada şifreler bcrypt ile hash'lenmelidir
DO $$
DECLARE
  mergen_company_id UUID;
  demo_company_id UUID;
BEGIN
  -- Şirket ID'lerini al
  SELECT id INTO mergen_company_id FROM companies WHERE company_code = 'MERGEN001';
  SELECT id INTO demo_company_id FROM companies WHERE company_code = 'DEMO001';

  -- Mergen şirketi için kullanıcılar
  INSERT INTO users (company_id, username, password, full_name, user_type, email)
  VALUES 
    (mergen_company_id, 'admin', 'admin123', 'Admin Kullanıcı', 'admin', 'admin@mergen.com'),
    (mergen_company_id, 'kurye1', 'kurye123', 'Ahmet Yılmaz', 'courier', 'ahmet@mergen.com'),
    (mergen_company_id, 'restoran1', 'restoran123', 'Lezzet Restoranı', 'restaurant', 'lezzet@mergen.com')
  ON CONFLICT (company_id, username) DO NOTHING;

  -- Demo şirketi için kullanıcılar
  INSERT INTO users (company_id, username, password, full_name, user_type, email)
  VALUES 
    (demo_company_id, 'admin', 'demo123', 'Demo Admin', 'admin', 'admin@demo.com'),
    (demo_company_id, 'kurye1', 'demo123', 'Demo Kurye', 'courier', 'kurye@demo.com')
  ON CONFLICT (company_id, username) DO NOTHING;
END $$;

-- 9. ROW LEVEL SECURITY (RLS) - Şirketler arası veri izolasyonu
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE couriers ENABLE ROW LEVEL SECURITY;
ALTER TABLE restaurants ENABLE ROW LEVEL SECURITY;
ALTER TABLE packages ENABLE ROW LEVEL SECURITY;

-- RLS Politikaları (Kullanıcılar sadece kendi şirketlerinin verilerini görebilir)
-- NOT: Bu politikalar Supabase Auth ile entegre edilmelidir

-- 10. TRIGGER: updated_at otomatik güncelleme
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_companies_updated_at BEFORE UPDATE ON companies
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- NOTLAR:
-- =====================================================
-- 1. Şifreler mutlaka bcrypt ile hash'lenmelidir (frontend'de)
-- 2. RLS politikaları Supabase Auth ile entegre edilmelidir
-- 3. Mevcut veriler için migration scripti yazılmalıdır
-- 4. Logo dosyaları Supabase Storage'a yüklenmelidir
-- 5. Theme renkleri CSS değişkenleri olarak uygulanmalıdır
