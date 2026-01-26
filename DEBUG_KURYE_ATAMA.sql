-- ============================================
-- KURYE ATAMA DEBUG - SORUN TESPİTİ
-- ============================================

-- 1. Trigger'lar hala var mı?
SELECT trigger_name, event_manipulation, action_statement
FROM information_schema.triggers
WHERE event_object_table = 'packages';
-- Beklenen: 0 satır (trigger yok)
-- Eğer satır varsa: Trigger'lar hala aktif! ❌

-- 2. Paket 133 var mı ve durumu ne?
SELECT 
  id,
  customer_name,
  courier_id,
  status,
  created_at
FROM packages
WHERE id = 133;
-- Beklenen: 1 satır, courier_id = NULL

-- 3. Kuryeler var mı?
SELECT id, full_name, is_active
FROM couriers
WHERE is_active = true
LIMIT 5;
-- En az 1 kurye olmalı

-- 4. Manuel kurye atama testi (gerçek kurye ID kullan)
-- Önce yukarıdaki sorgudan bir kurye ID'si al, sonra:
/*
UPDATE packages
SET 
  courier_id = '<GERÇEK_KURYE_ID_BURAYA>',
  status = 'assigned',
  assigned_at = NOW()
WHERE id = 133
RETURNING *;
*/
-- Eğer 1 satır döndürüyorsa: SQL çalışıyor ✅
-- Eğer 0 satır döndürüyorsa: Trigger engelliyor ❌
-- Eğer hata veriyorsa: Constraint veya trigger engelliyor ❌

-- 5. RLS (Row Level Security) kontrol et
SELECT tablename, rowsecurity
FROM pg_tables
WHERE tablename = 'packages';
-- Eğer rowsecurity = true ise: RLS aktif, admin yetkisi gerekebilir

-- 6. Admin kullanıcısının yetkilerini kontrol et
SELECT 
  grantee,
  privilege_type
FROM information_schema.role_table_grants
WHERE table_name = 'packages'
  AND grantee = current_user;
-- UPDATE yetkisi olmalı

-- ============================================
-- SONUÇ
-- ============================================
-- Yukarıdaki sorguları sırayla çalıştır ve sonuçları kontrol et
-- Hangi adımda sorun varsa, o kısmı düzelt
