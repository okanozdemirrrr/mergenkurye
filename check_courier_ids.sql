-- KURYE ID'LERİNİ KONTROL ET

-- 1. Couriers tablosundaki tüm ID'ler
SELECT 'COURIERS TABLOSU:' as info;
SELECT id, username, full_name, is_active FROM couriers ORDER BY full_name;

-- 2. Profiles tablosundaki tüm ID'ler (eski sistem)
SELECT 'PROFILES TABLOSU:' as info;
SELECT id, full_name FROM profiles WHERE full_name IS NOT NULL ORDER BY full_name;

-- 3. Problematik ID'yi ara
SELECT 'PROBLEMATİK ID ARAMA:' as info;
SELECT 'couriers tablosunda var mı?' as soru, 
       EXISTS(SELECT 1 FROM couriers WHERE id = 'fbf72c34-59af-4f28-bc10-4f427dec207a') as sonuc;
       
SELECT 'profiles tablosunda var mı?' as soru,
       EXISTS(SELECT 1 FROM profiles WHERE id = 'fbf72c34-59af-4f28-bc10-4f427dec207a') as sonuc;

-- 4. Eğer profiles'da varsa, onu couriers'a kopyala
INSERT INTO couriers (id, username, full_name, password, is_active, status, last_lat, last_lng)
SELECT 
  id,
  'user_' || substring(id::text, 1, 8), -- username olarak ID'nin ilk 8 karakteri
  full_name,
  'sifre123', -- varsayılan şifre
  true, -- aktif yap
  'idle', -- boşta
  0, -- koordinat yok
  0  -- koordinat yok
FROM profiles 
WHERE id = 'fbf72c34-59af-4f28-bc10-4f427dec207a'
  AND NOT EXISTS (SELECT 1 FROM couriers WHERE couriers.id = profiles.id);

SELECT 'KOPYALAMA TAMAMLANDI!' as mesaj;

-- 5. Tekrar kontrol
SELECT 'SON DURUM - COURIERS:' as info;
SELECT id, username, full_name, is_active FROM couriers ORDER BY full_name;
