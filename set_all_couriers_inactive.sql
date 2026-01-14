-- Tüm kuryeleri pasif yap (giriş yapınca aktif olacaklar)

UPDATE couriers 
SET is_active = false, status = 'inactive'
WHERE username IN ('taha', 'emre', 'asaf', 'ahmet55');

-- Kontrol
SELECT 'TÜM KURYELER PASİF YAPILDI!' as mesaj;
SELECT id, username, full_name, is_active, status FROM couriers ORDER BY full_name;
