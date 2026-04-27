-- =============================================
-- ALDA GEL V2 - PRODUCTION DURUM KONTROLÜ
-- =============================================
-- Bu script teslim öncesi veritabanı durumunu kontrol eder

-- 1. GENEL İSTATİSTİKLER
-- =============================================
SELECT 
  '📊 GENEL İSTATİSTİKLER' as kategori,
  '' as detay,
  '' as adet;

SELECT 
  'Toplam Siparişler' as kategori,
  CONCAT('Son 7 gün: ', COUNT(*)) as detay,
  COUNT(*)::text as adet
FROM packages 
WHERE created_at >= CURRENT_DATE - INTERVAL '7 days'

UNION ALL

SELECT 
  'Aktif Siparişler' as kategori,
  CONCAT('Bekleyen/Devam eden') as detay,
  COUNT(*)::text as adet
FROM packages 
WHERE status IN ('waiting', 'assigned', 'picking_up', 'on_the_way')

UNION ALL

SELECT 
  'Bugünkü Siparişler' as kategori,
  CONCAT(CURRENT_DATE::text) as detay,
  COUNT(*)::text as adet
FROM packages 
WHERE DATE(created_at) = CURRENT_DATE;

-- 2. KURYE DURUMU
-- =============================================
SELECT 
  '👨‍🚴 KURYE DURUMU' as kategori,
  '' as detay,
  '' as adet;

SELECT 
  'Toplam Kuryeler' as kategori,
  'Kayıtlı' as detay,
  COUNT(*)::text as adet
FROM couriers

UNION ALL

SELECT 
  'Aktif Kuryeler' as kategori,
  'is_active = true' as detay,
  COUNT(*)::text as adet
FROM couriers 
WHERE is_active = true

UNION ALL

SELECT 
  'Meşgul Kuryeler' as kategori,
  'status = busy' as detay,
  COUNT(*)::text as adet
FROM couriers 
WHERE status = 'busy'

UNION ALL

SELECT 
  'FCM Token Olan' as kategori,
  'Push notification hazır' as detay,
  COUNT(*)::text as adet
FROM couriers 
WHERE fcm_token IS NOT NULL;

-- 3. RESTORAN DURUMU
-- =============================================
SELECT 
  '🍽️ RESTORAN DURUMU' as kategori,
  '' as detay,
  '' as adet;

SELECT 
  'Toplam Restoranlar' as kategori,
  'Kayıtlı' as detay,
  COUNT(*)::text as adet
FROM restaurants

UNION ALL

SELECT 
  'Aktif Restoranlar' as kategori,
  'is_active = true' as detay,
  COUNT(*)::text as adet
FROM restaurants 
WHERE is_active = true

UNION ALL

SELECT 
  'Borçlu Restoranlar' as kategori,
  'debt_amount > 0' as detay,
  COUNT(*)::text as adet
FROM restaurants 
WHERE debt_amount > 0;

-- 4. MARKET DURUMU
-- =============================================
SELECT 
  '🛒 MARKET DURUMU' as kategori,
  '' as detay,
  '' as adet;

SELECT 
  'Toplam Ürünler' as kategori,
  'Market kataloğu' as detay,
  COUNT(*)::text as adet
FROM market_products

UNION ALL

SELECT 
  'Stokta Ürünler' as kategori,
  'stock_quantity > 0' as detay,
  COUNT(*)::text as adet
FROM market_products 
WHERE stock_quantity > 0 AND is_available = true

UNION ALL

SELECT 
  'Tükenen Ürünler' as kategori,
  'stock_quantity = 0' as detay,
  COUNT(*)::text as adet
FROM market_products 
WHERE stock_quantity = 0 OR is_available = false;

-- 5. FİNANSAL DURUM
-- =============================================
SELECT 
  '💰 FİNANSAL DURUM' as kategori,
  '' as detay,
  '' as adet;

SELECT 
  'Bekleyen Ödemeler' as kategori,
  'Courier settlements' as detay,
  COUNT(*)::text as adet
FROM courier_settlements 
WHERE status = 'pending'

UNION ALL

SELECT 
  'Toplam Restoran Borcu' as kategori,
  'TL' as detay,
  COALESCE(SUM(debt_amount), 0)::text as adet
FROM restaurants 
WHERE debt_amount > 0;

-- 6. SON AKTİVİTELER
-- =============================================
SELECT 
  '🕐 SON AKTİVİTELER' as kategori,
  '' as detay,
  '' as adet;

SELECT 
  'Son Sipariş' as kategori,
  CONCAT(customer_name, ' - ', delivery_address) as detay,
  created_at::text as adet
FROM packages 
ORDER BY created_at DESC 
LIMIT 1;

SELECT 
  'Son Teslim' as kategori,
  CONCAT(customer_name, ' - ', amount, ' TL') as detay,
  delivered_at::text as adet
FROM packages 
WHERE status = 'delivered'
ORDER BY delivered_at DESC 
LIMIT 1;

-- =============================================
-- PRODUCTION HAZIRLIK SKORU
-- =============================================
WITH production_checks AS (
  SELECT 
    CASE WHEN COUNT(*) = 0 THEN 1 ELSE 0 END as no_pending_orders,
    CASE WHEN (SELECT COUNT(*) FROM couriers WHERE is_active = true) > 0 THEN 1 ELSE 0 END as has_active_couriers,
    CASE WHEN (SELECT COUNT(*) FROM restaurants WHERE is_active = true) > 0 THEN 1 ELSE 0 END as has_active_restaurants,
    CASE WHEN (SELECT COUNT(*) FROM market_products WHERE is_available = true) > 0 THEN 1 ELSE 0 END as has_products
  FROM packages 
  WHERE status IN ('picking_up', 'on_the_way')
)
SELECT 
  '🎯 PRODUCTION HAZIRLIK SKORU' as kategori,
  CONCAT(
    (no_pending_orders + has_active_couriers + has_active_restaurants + has_products) * 25, 
    '% Hazır'
  ) as detay,
  CASE 
    WHEN (no_pending_orders + has_active_couriers + has_active_restaurants + has_products) = 4 
    THEN '✅ TESLİME HAZIR'
    ELSE '⚠️ KONTROL GEREKLİ'
  END as adet
FROM production_checks;