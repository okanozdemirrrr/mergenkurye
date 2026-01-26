-- ============================================
-- TEMİZ SİSTEM - AJAN İPTAL EDİLDİ
-- ============================================
-- Ajan projesi iptal edildi, sadece Admin Paneli var
-- Tüm koruma mekanizmalarını kaldır

-- ADIM 1: Tüm trigger'ları kaldır
DROP TRIGGER IF EXISTS trigger_protect_assigned_packages_absolute ON packages;
DROP TRIGGER IF EXISTS trigger_protect_assigned_packages_simple ON packages;
DROP TRIGGER IF EXISTS trigger_protect_assigned_packages ON packages;

DROP FUNCTION IF EXISTS protect_assigned_packages_absolute();
DROP FUNCTION IF EXISTS protect_assigned_packages_simple();
DROP FUNCTION IF EXISTS protect_assigned_packages();

-- ADIM 2: UNIQUE constraint'i kaldır (artık gerek yok)
ALTER TABLE packages DROP CONSTRAINT IF EXISTS unique_external_order_per_source;

-- ADIM 3: locked_by kolonunu kaldır (artık gerek yok)
ALTER TABLE packages DROP COLUMN IF EXISTS locked_by;

-- ADIM 4: external_order_number ve source kolonlarını kaldır (ajan yoksa gerek yok)
-- NOT: Eğer bu kolonları başka amaçla kullanıyorsanız, bu adımı atlayın
-- ALTER TABLE packages DROP COLUMN IF EXISTS external_order_number;
-- ALTER TABLE packages DROP COLUMN IF EXISTS source;

-- ============================================
-- KONTROL
-- ============================================

-- Trigger kalmadı mı?
SELECT trigger_name
FROM information_schema.triggers
WHERE event_object_table = 'packages';
-- Beklenen: 0 satır (hiç trigger yok)

-- UNIQUE constraint kalmadı mı?
SELECT constraint_name
FROM information_schema.table_constraints
WHERE table_name = 'packages'
  AND constraint_name = 'unique_external_order_per_source';
-- Beklenen: 0 satır (constraint yok)

-- locked_by kolonu kalmadı mı?
SELECT column_name
FROM information_schema.columns
WHERE table_name = 'packages'
  AND column_name = 'locked_by';
-- Beklenen: 0 satır (kolon yok)

-- ============================================
-- SONUÇ
-- ============================================
-- ✅ Tüm ajan koruma mekanizmaları kaldırıldı
-- ✅ Admin Paneli tam yetkiye sahip
-- ✅ Sistem sadeleştirildi

-- ============================================
-- YENİ SİSTEM MANTĞI
-- ============================================
-- 1. Admin Paneli: Yeni sipariş oluşturur (manuel veya API)
-- 2. Admin Paneli: Kurye atar (UPDATE packages SET courier_id=...)
-- 3. Kurye Uygulaması: Status günceller (assigned → picking_up → on_the_way → delivered)
-- 4. Admin Paneli: Sadece courier_id NULL olanları listeler

-- Artık hiçbir koruma mekanizması yok, sistem tamamen basit!
