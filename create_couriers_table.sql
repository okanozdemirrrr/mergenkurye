-- Couriers tablosunu oluştur
-- Bu SQL'i Supabase SQL Editor'da çalıştır

-- Couriers tablosunu oluştur
CREATE TABLE IF NOT EXISTS couriers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  full_name TEXT NOT NULL,
  is_active BOOLEAN DEFAULT false,
  status TEXT DEFAULT 'idle' CHECK (status IN ('idle', 'busy', 'picking_up', 'on_the_way', 'assigned', 'inactive')),
  last_lat DECIMAL(10, 8),
  last_lng DECIMAL(11, 8),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS (Row Level Security) politikalarını ayarla
ALTER TABLE couriers ENABLE ROW LEVEL SECURITY;

-- Herkes kuryeleri görebilir (okuma)
CREATE POLICY IF NOT EXISTS "Everyone can view couriers" ON couriers
  FOR SELECT USING (true);

-- Kuryeler kendi bilgilerini güncelleyebilir
CREATE POLICY IF NOT EXISTS "Couriers can update own data" ON couriers
  FOR UPDATE USING (true);

-- Kurye verilerini ekle
INSERT INTO couriers (username, password, full_name, is_active, status) VALUES 
  ('ahmet55', 'ahmet55123', 'Ahmet Abi', false, 'idle'),
  ('taha', 'taha123', 'Taha', false, 'idle')
ON CONFLICT (username) DO NOTHING;

-- Updated_at alanını otomatik güncelleyen trigger
CREATE OR REPLACE FUNCTION public.handle_couriers_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS handle_couriers_updated_at ON couriers;
CREATE TRIGGER handle_couriers_updated_at
  BEFORE UPDATE ON couriers
  FOR EACH ROW EXECUTE FUNCTION public.handle_couriers_updated_at();

-- Packages tablosundaki courier_id'yi couriers tablosuna referans yap
-- (Eğer foreign key constraint eklemek istersen)
-- ALTER TABLE packages ADD CONSTRAINT fk_courier 
--   FOREIGN KEY (courier_id) REFERENCES couriers(id);

-- Sonucu kontrol et
SELECT id, username, full_name, is_active, status, last_lat, last_lng FROM couriers;