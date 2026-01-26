-- ============================================
-- KURYE ATAMA DEBUG SORULARI
-- ============================================
-- Bu sorguları Supabase SQL Editor'de çalıştırarak sorunu tespit edin

-- 1. TÜM PAKETLERİN DURUMUNU KONTROL ET
SELECT 
  id,
  order_number,
  status,
  courier_id,
  locked_by,
  created_at,
  assigned_at
FROM packages
ORDER BY created_at DESC
LIMIT 20;

-- 2. WAITING DURUMUNDAKI PAKETLERİ KONTROL ET
SELECT 
  id,
  order_number,
  status,
  courier_id,
  locked_by
FROM packages
WHERE status = 'waiting'
ORDER BY created_at DESC;

-- 3. LOCKED_BY KOLONU VAR MI KONTROL ET
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'packages' 
  AND column_name IN ('status', 'courier_id', 'locked_by');

-- 4. TRIGGER ÇALIŞIYOR MU KONTROL ET
SELECT 
  trigger_name,
  event_manipulation,
  event_object_table,
  action_statement
FROM information_schema.triggers
WHERE event_object_table = 'packages';

-- 5. BİR PAKETİ MANUEL ATAMA TESTİ (ID'yi değiştir)
-- NOT: Bu sorguyu çalıştırmadan önce ID'yi gerçek bir paket ID'si ile değiştir
/*
UPDATE packages
SET 
  courier_id = 'test-kurye-id',
  status = 'assigned',
  locked_by = 'courier',
  assigned_at = NOW()
WHERE id = 123 -- BURAYA GERÇEK PAKET ID'Sİ YAZ
  AND status = 'waiting'
RETURNING *;
*/

-- 6. EĞER GÜNCELLEME BAŞARISIZ OLURSA, PAKETIN MEVCUT DURUMUNU KONTROL ET
/*
SELECT 
  id,
  status,
  courier_id,
  locked_by,
  'Paket zaten atanmış veya status waiting değil' as mesaj
FROM packages
WHERE id = 123 -- BURAYA GERÇEK PAKET ID'Sİ YAZ
  AND status != 'waiting';
*/

-- 7. TÜM STATUS DEĞERLERİNİ KONTROL ET (Hangi status'ler kullanılıyor?)
SELECT 
  status,
  COUNT(*) as adet,
  COUNT(CASE WHEN courier_id IS NOT NULL THEN 1 END) as kuryeli_adet,
  COUNT(CASE WHEN locked_by = 'courier' THEN 1 END) as locked_courier_adet
FROM packages
GROUP BY status
ORDER BY adet DESC;

-- 8. LOCKED_BY DAĞILIMI
SELECT 
  locked_by,
  status,
  COUNT(*) as adet
FROM packages
GROUP BY locked_by, status
ORDER BY locked_by, status;

-- ============================================
-- BEKLENEN SONUÇLAR
-- ============================================
-- Eğer sistem doğru çalışıyorsa:
-- - status='waiting' olan paketlerin locked_by='agent' olmalı
-- - status='assigned' olan paketlerin locked_by='courier' olmalı
-- - courier_id NULL olan paketlerin status='waiting' olmalı

-- ============================================
-- SORUN GİDERME
-- ============================================
-- Eğer waiting paket yoksa:
-- 1. Tüm paketler zaten atanmış olabilir
-- 2. Agent yeni paket oluşturmamış olabilir
-- 3. Status değeri 'pending' veya başka bir değer olabilir

-- Eğer locked_by kolonu yoksa:
-- database_migration_secure_courier_assignment.sql dosyasını çalıştırın

-- Eğer trigger çalışmıyorsa:
-- Trigger'ı tekrar oluşturun (migration dosyasındaki trigger kısmını çalıştırın)
