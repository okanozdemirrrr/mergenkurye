-- Supabase Realtime için packages tablosunu aktifleştir
-- Bu SQL komutunu Supabase SQL Editor'de çalıştırın

-- ✅ HATA: "packages" is already member of publication "supabase_realtime"
-- Bu iyi bir haber! Tablo zaten Realtime'da kayıtlı.

-- 1. Kontrol sorgusu - packages tablosu publication'da mı?
SELECT 
  schemaname,
  tablename,
  pubname
FROM pg_publication_tables 
WHERE tablename = 'packages';

-- Beklenen Sonuç:
-- schemaname | tablename | pubname
-- -----------+-----------+--------------------
-- public     | packages  | supabase_realtime

-- 2. RLS (Row Level Security) politikalarını kontrol et
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies 
WHERE tablename = 'packages';

-- 3. Realtime ayarlarını kontrol et
SELECT * FROM pg_publication WHERE pubname = 'supabase_realtime';

-- 4. Eğer RLS aktifse ve politika yoksa, SELECT politikası ekle
-- (Sadece gerekirse çalıştır - önce yukarıdaki sorguları kontrol et)

-- Önce mevcut politikayı sil (varsa)
DROP POLICY IF EXISTS "Herkes packages okuyabilir" ON packages;

-- Yeni politika ekle
CREATE POLICY "Herkes packages okuyabilir" 
ON packages FOR SELECT 
USING (true);

-- 5. Veya RLS'yi geçici olarak kapat (test için)
-- ALTER TABLE packages DISABLE ROW LEVEL SECURITY;

-- NOT: Realtime çalışmıyorsa, sorun RLS politikalarında olabilir.
-- Supabase Dashboard > Authentication > Policies'den kontrol edin.
