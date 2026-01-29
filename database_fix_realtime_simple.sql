-- 🔧 Realtime Hızlı Çözüm
-- Supabase SQL Editor'de SADECE GEREKLİ KOMUTU çalıştır

-- ADIM 1: Önce kontrol et - RLS aktif mi?
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE tablename = 'packages';

-- ADIM 2: Politika var mı?
SELECT policyname, cmd 
FROM pg_policies 
WHERE tablename = 'packages';

-- ========================================
-- ÇÖZÜM SEÇENEKLERİ (Birini seç)
-- ========================================

-- ÇÖZÜM A: RLS Politikası Ekle (ÖNERİLEN)
-- Eğer yukarıdaki sorguda politika yoksa, bunu çalıştır:

DROP POLICY IF EXISTS "Herkes packages okuyabilir" ON packages;

CREATE POLICY "Herkes packages okuyabilir" 
ON packages FOR SELECT 
USING (true);

-- ========================================

-- ÇÖZÜM B: RLS'yi Kapat (SADECE TEST İÇİN)
-- Hızlı test için RLS'yi kapat:

-- ALTER TABLE packages DISABLE ROW LEVEL SECURITY;

-- Test ettikten sonra tekrar aç:
-- ALTER TABLE packages ENABLE ROW LEVEL SECURITY;

-- ========================================

-- KONTROL: Politika eklendi mi?
SELECT policyname, cmd 
FROM pg_policies 
WHERE tablename = 'packages';

-- Beklenen sonuç:
-- policyname                      | cmd
-- --------------------------------+--------
-- Herkes packages okuyabilir      | SELECT
