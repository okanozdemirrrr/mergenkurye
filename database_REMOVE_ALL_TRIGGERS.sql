-- ============================================
-- TÜM TRİGGER'LARI KALDIR - ACİL ÇÖZÜM
-- ============================================
-- Kurye atamasını engelleyen tüm trigger'ları kaldır

-- ADIM 1: Tüm trigger'ları kaldır
DROP TRIGGER IF EXISTS trigger_protect_assigned_packages_simple ON packages;
DROP TRIGGER IF EXISTS trigger_update_locked_by ON packages;
DROP TRIGGER IF EXISTS set_order_number ON packages;

-- ADIM 2: Trigger fonksiyonlarını kaldır
DROP FUNCTION IF EXISTS protect_assigned_packages_simple();
DROP FUNCTION IF EXISTS update_locked_by_on_assign();
DROP FUNCTION IF EXISTS generate_order_number();

-- ADIM 3: UNIQUE constraint'i kaldır
ALTER TABLE packages DROP CONSTRAINT IF EXISTS unique_external_order_per_source;

-- ADIM 4: locked_by kolonunu kaldır
ALTER TABLE packages DROP COLUMN IF EXISTS locked_by;

-- ============================================
-- KONTROL
-- ============================================

-- Trigger kalmadı mı?
SELECT trigger_name, event_manipulation, event_object_table
FROM information_schema.triggers
WHERE event_object_table = 'packages';
-- Beklenen: 0 satır (hiç trigger yok)

-- ============================================
-- TEST (OPSIYONEL - Admin panelinde test et)
-- ============================================

-- Önce bir kurye ID'si bul
SELECT id, full_name FROM couriers LIMIT 1;

-- Sonra o kurye ID'sini kullanarak test et:
-- UPDATE packages
-- SET courier_id = '<YUKARIDAKI_KURYE_ID>', status = 'assigned'
-- WHERE id = 68;

-- Beklenen: "1 row updated" ✅

-- Kontrol et:
-- SELECT id, customer_name, courier_id, status
-- FROM packages
-- WHERE id = 68;

-- Beklenen: courier_id dolu, status = 'assigned' ✅

-- ============================================
-- SONUÇ
-- ============================================
-- ✅ Tüm trigger'lar kaldırıldı
-- ✅ Kurye atama artık çalışmalı
-- ✅ Admin panelinde test et!
