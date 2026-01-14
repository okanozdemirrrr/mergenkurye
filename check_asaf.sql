-- ASAF'IN BİLGİLERİNİ KONTROL ET

SELECT 'ASAF KAYDI:' as bilgi;
SELECT id, username, password, full_name, is_active FROM couriers WHERE username = 'asaf';

-- Eğer yoksa veya şifre yanlışsa düzelt
UPDATE couriers 
SET password = 'asaf123', is_active = false, status = 'inactive'
WHERE username = 'asaf';

-- Eğer hiç yoksa ekle
INSERT INTO couriers (username, password, full_name, is_active, status, last_lat, last_lng)
SELECT 'asaf', 'asaf123', 'Asaf', false, 'inactive', 0, 0
WHERE NOT EXISTS (SELECT 1 FROM couriers WHERE username = 'asaf');

-- Son durum
SELECT 'GÜNCEL DURUM:' as bilgi;
SELECT username, password, full_name, is_active FROM couriers ORDER BY full_name;
