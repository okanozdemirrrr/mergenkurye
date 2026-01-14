-- BASIT ÇÖZÜM: ESKİ TAHA'YI SİL, YENİ TAHA ZATEN HAZIR

-- 1. Hangi Taha'lar var?
SELECT 'MEVCUT TAHA KAYITLARI:' as info;
SELECT id, username, full_name, is_active FROM couriers WHERE full_name = 'Taha';

-- 2. Eski Taha'nın username'ini değiştir (çünkü 'taha' unique)
UPDATE couriers 
SET username = 'taha_eski_silinecek'
WHERE id = '5a400a8a-4a15-4cd7-af6c-7d0ca8b514dc';

-- 3. Eski Taha'yı sil
DELETE FROM couriers WHERE id = '5a400a8a-4a15-4cd7-af6c-7d0ca8b514dc';

-- 4. Yeni Taha'yı aktif yap ve koordinat ver
UPDATE couriers 
SET is_active = true, status = 'idle', last_lat = 41.0082, last_lng = 28.9784
WHERE id = 'fbf72c34-59af-4f28-bc10-4f427dec207a';

-- 5. Kontrol
SELECT 'TAMAMLANDI!' as mesaj;
SELECT id, username, full_name, is_active, last_lat, last_lng FROM couriers ORDER BY full_name;
