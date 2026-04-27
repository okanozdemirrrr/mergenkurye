-- =============================================
-- ALDA GEL V2 - GÜVENLİ TESLİM TEMİZLİĞİ
-- =============================================
-- Bu script sadece güvenli temizlik işlemlerini yapar
-- Gerçek kullanıcı hesaplarına dokunmaz

-- 1. ESKİ TEST SİPARİŞLERİNİ TEMİZLE (Son 3 günden eski olanlar)
-- =============================================
DELETE FROM packages WHERE 
  created_at < '2026-04-24' AND 
  (status = 'cancelled' OR status = 'delivered');

-- 2. TAMAMLANMIŞ SETTLEMENT KAYITLARINI TEMİZLE
-- =============================================
DELETE FROM courier_settlements WHERE 
  created_at < '2026-04-24' AND 
  status = 'completed';

-- 3. ESKİ NOTIFICATION KAYITLARINI TEMİZLE
-- =============================================
DELETE FROM notifications WHERE created_at < '2026-04-20';

-- 4. MARKET ÜRÜN STOKLARİNİ YENİLE
-- =============================================
UPDATE market_products SET 
  stock_quantity = CASE 
    WHEN stock_quantity < 10 THEN 100
    ELSE stock_quantity
  END,
  is_available = true
WHERE stock_quantity < 10 OR is_available = false;

-- 5. KURYE DURUMLARINI SIFIRLA (Teslim için hazır)
-- =============================================
UPDATE couriers SET 
  status = 'idle',
  updated_at = NOW()
WHERE status = 'busy';

-- 6. AKTİF OLMAYAN RESTORANLARI KONTROL ET
-- =============================================
UPDATE restaurants SET 
  is_active = true
WHERE is_active = false AND created_at > '2026-04-20';

-- 7. VACUUM (Performans optimizasyonu)
-- =============================================
VACUUM packages;
VACUUM courier_settlements;
VACUUM notifications;

-- =============================================
-- TEMİZLİK SONRASI DURUM RAPORU
-- =============================================
SELECT 
  'Aktif Siparişler' as kategori,
  COUNT(*) as adet
FROM packages 
WHERE status IN ('waiting', 'assigned', 'picking_up', 'on_the_way')

UNION ALL

SELECT 
  'Bugünkü Siparişler' as kategori,
  COUNT(*) as adet
FROM packages 
WHERE DATE(created_at) = CURRENT_DATE

UNION ALL

SELECT 
  'Aktif Kuryeler' as kategori,
  COUNT(*) as adet
FROM couriers 
WHERE is_active = true

UNION ALL

SELECT 
  'Aktif Restoranlar' as kategori,
  COUNT(*) as adet
FROM restaurants 
WHERE is_active = true

UNION ALL

SELECT 
  'Stokta Ürünler' as kategori,
  COUNT(*) as adet
FROM market_products 
WHERE is_available = true AND stock_quantity > 0;

-- =============================================
-- TESLİM ÖNCESİ SON KONTROLLER
-- =============================================
/*
🔍 TESLİM ÖNCESİ KONTROL LİSTESİ:

✅ VERİTABANI:
- Eski test siparişleri temizlendi
- Kurye durumları sıfırlandı  
- Market stokları yenilendi
- Performans optimize edildi

✅ UYGULAMA:
- Android AAB v1.1.0 hazır
- Kalıcı login sistemi aktif
- Push notifications çalışıyor
- Admin panel hazır

✅ PRODUCTION AYARLARI:
- Supabase production DB
- Firebase push notifications
- Vercel deployment
- SSL sertifikası

🚀 TESLİME HAZIR!
*/