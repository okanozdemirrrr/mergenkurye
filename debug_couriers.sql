-- Debug için couriers tablosunu kontrol et
-- Bu SQL'i Supabase SQL Editor'da çalıştır

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