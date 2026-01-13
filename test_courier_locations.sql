-- Test için kurye konumları ekle
-- Bu SQL'i Supabase SQL Editor'da çalıştır

-- Önce mevcut kuryeleri kontrol et
SELECT id, full_name, is_active, status, last_lat, last_lng FROM profiles;

-- Test konumları ekle (Samsun çevresinde)
-- Ahmet Abi için konum
UPDATE profiles 
SET last_lat = 41.2867, last_lng = 36.3300, is_active = true, status = 'idle'
WHERE full_name = 'Ahmet Abi';

-- Taha için konum (biraz farklı)
UPDATE profiles 
SET last_lat = 41.2900, last_lng = 36.3350, is_active = true, status = 'idle'
WHERE full_name = 'Taha';

-- Sonucu kontrol et
SELECT id, full_name, is_active, status, last_lat, last_lng FROM profiles;