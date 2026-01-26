-- ============================================
-- TRİGGER KONTROL SORGUSU
-- ============================================
-- Veritabanında kurye atamasını engelleyen trigger var mı kontrol et

-- 1. Tüm trigger'ları listele
SELECT 
  trigger_name,
  event_manipulation,
  event_object_table,
  action_statement,
  action_timing
FROM information_schema.triggers
WHERE event_object_table = 'packages'
ORDER BY trigger_name;

-- Beklenen: 0 satır (hiç trigger olmamalı)
-- Eğer satır varsa, trigger'lar hala aktif!

-- 2. Trigger fonksiyonlarını listele
SELECT 
  routine_name,
  routine_definition
FROM information_schema.routines
WHERE routine_type = 'FUNCTION'
  AND routine_name LIKE '%protect%'
  OR routine_name LIKE '%assign%'
  OR routine_name LIKE '%courier%';

-- Beklenen: 0 satır (hiç koruma fonksiyonu olmamalı)

-- 3. UNIQUE constraint'leri kontrol et
SELECT 
  constraint_name,
  constraint_type
FROM information_schema.table_constraints
WHERE table_name = 'packages'
  AND constraint_type = 'UNIQUE';

-- Beklenen: 0 satır (UNIQUE constraint olmamalı)
-- Eğer 'unique_external_order_per_source' varsa, hala aktif!

-- 4. packages tablosu kolonlarını kontrol et
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'packages'
ORDER BY ordinal_position;

-- 'locked_by' kolonu varsa, hala eski sistem aktif!

-- ============================================
-- TEST: Kurye Atama Çalışıyor mu?
-- ============================================

-- Önce kurye atanmamış bir paket bul
SELECT 
  id,
  customer_name,
  courier_id,
  status,
  created_at
FROM packages
WHERE courier_id IS NULL
ORDER BY created_at DESC
LIMIT 1;

-- Yukarıdaki sorgudan aldığın ID'yi kullan:
-- UPDATE packages
-- SET courier_id = 'test-kurye-id-123', status = 'assigned'
-- WHERE id = <PAKET_ID>;

-- Eğer "1 row updated" diyorsa → Çalışıyor ✅
-- Eğer "0 rows updated" diyorsa → Trigger engelliyor ❌
-- Eğer hata veriyorsa → Trigger veya constraint engelliyor ❌

-- ============================================
-- SONUÇ
-- ============================================
-- Eğer yukarıdaki sorgularda herhangi bir trigger, fonksiyon veya constraint görüyorsan,
-- database_CLEAN_SYSTEM.sql dosyasını çalıştır!
