-- Debug için couriers tablosunu kontrol et
-- Bu SQL'i Supabase SQL Editor'da çalıştır

-- Önce couriers tablosunu kontrol et
SELECT * FROM couriers LIMIT 1;

-- is_active kolonunu ekle (eğer yoksa)
ALTER TABLE couriers ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT false;

-- status kolonunu ekle (eğer yoksa)
ALTER TABLE couriers ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'idle' CHECK (status IN ('idle', 'busy', 'picking_up', 'on_the_way', 'assigned', 'inactive'));

-- last_lat ve last_lng kolonlarını ekle (eğer yoksa)
ALTER TABLE couriers ADD COLUMN IF NOT EXISTS last_lat DECIMAL(10, 8);
ALTER TABLE couriers ADD COLUMN IF NOT EXISTS last_lng DECIMAL(11, 8);

-- Couriers tablosunu kontrol et
SELECT * FROM couriers;

-- Eğer tablo boşsa, test verilerini ekle
INSERT INTO couriers (username, password, full_name, is_active, status, last_lat, last_lng) VALUES 
  ('ahmet55', 'ahmet55123', 'Ahmet Abi', true, 'idle', 41.2867, 36.3300),
  ('taha', 'taha123', 'Taha', true, 'idle', 41.2900, 36.3350)
ON CONFLICT (username) DO UPDATE SET
  is_active = EXCLUDED.is_active,
  status = EXCLUDED.status,
  last_lat = EXCLUDED.last_lat,
  last_lng = EXCLUDED.last_lng;

-- Sonucu kontrol et
SELECT id, username, full_name, is_active, status, last_lat, last_lng FROM couriers;