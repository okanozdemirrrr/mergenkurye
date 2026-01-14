-- user_fbf72c34'ü Emre olarak değiştir

UPDATE couriers 
SET 
  username = 'emre',
  full_name = 'Emre',
  password = 'emre123'
WHERE id = 'fbf72c34-59af-4f28-bc10-4f427dec207a';

-- Kontrol
SELECT 'DEĞİŞTİRİLDİ!' as mesaj;
SELECT id, username, full_name, password, is_active FROM couriers ORDER BY full_name;
