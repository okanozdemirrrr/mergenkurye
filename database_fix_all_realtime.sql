-- 🔧 TÜM REALTIME HATALARINI ÇÖZEN SQL
-- Supabase SQL Editor'de çalıştır

-- ========================================
-- HIZLI ÇÖZÜM: RLS'yi Kapat (Test İçin)
-- ========================================

-- packages tablosu için RLS'yi kapat
ALTER TABLE packages DISABLE ROW LEVEL SECURITY;

-- couriers tablosu için RLS'yi kapat (kurye paneli için)
ALTER TABLE couriers DISABLE ROW LEVEL SECURITY;

-- restaurants tablosu için RLS'yi kapat (restoran paneli için)
ALTER TABLE restaurants DISABLE ROW LEVEL SECURITY;

-- ========================================
-- KONTROL: RLS kapatıldı mı?
-- ========================================

SELECT 
  tablename, 
  rowsecurity as "RLS Aktif?"
FROM pg_tables 
WHERE tablename IN ('packages', 'couriers', 'restaurants')
ORDER BY tablename;

-- Beklenen sonuç:
-- tablename    | RLS Aktif?
-- -------------+------------
-- couriers     | f          (false = kapalı ✅)
-- packages     | f          (false = kapalı ✅)
-- restaurants  | f          (false = kapalı ✅)

-- ========================================
-- NOT: Bu geçici bir çözüm!
-- Üretimde RLS'yi açıp politika eklemelisin.
-- ========================================

-- Üretim için (daha sonra):
/*
ALTER TABLE packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE couriers ENABLE ROW LEVEL SECURITY;
ALTER TABLE restaurants ENABLE ROW LEVEL SECURITY;

-- Politikalar ekle
CREATE POLICY "Herkes packages okuyabilir" ON packages FOR SELECT USING (true);
CREATE POLICY "Herkes couriers okuyabilir" ON couriers FOR SELECT USING (true);
CREATE POLICY "Herkes restaurants okuyabilir" ON restaurants FOR SELECT USING (true);
*/
