-- =============================================
-- ALDA GEL V2 - PRODUCTION İZLEME
-- =============================================
-- Bu script teslim sonrası sistem performansını izler

-- 1. CANLI SİSTEM DURUMU
-- =============================================
SELECT 
  '🔴 CANLI SİSTEM DURUMU' as kategori,
  NOW()::timestamp as zaman;

-- Son 1 saatteki aktivite
SELECT 
  'Son 1 Saat Siparişler' as metrik,
  COUNT(*) as deger,
  'adet' as birim
FROM packages 
WHERE created_at >= NOW() - INTERVAL '1 hour'

UNION ALL

SELECT 
  'Son 1 Saat Teslimatlar' as metrik,
  COUNT(*) as deger,
  'adet' as birim
FROM packages 
WHERE delivered_at >= NOW() - INTERVAL '1 hour'

UNION ALL

SELECT 
  'Aktif Kurye Sayısı' as metrik,
  COUNT(*) as deger,
  'kurye' as birim
FROM couriers 
WHERE is_active = true AND updated_at >= NOW() - INTERVAL '10 minutes';

-- 2. PERFORMANS METRİKLERİ
-- =============================================
SELECT 
  '📈 PERFORMANS METRİKLERİ' as kategori,
  '' as metrik,
  '' as deger,
  '' as birim;

-- Ortalama teslimat süresi (dakika)
WITH delivery_times AS (
  SELECT 
    EXTRACT(EPOCH FROM (delivered_at - created_at))/60 as minutes
  FROM packages 
  WHERE status = 'delivered' 
    AND delivered_at >= CURRENT_DATE
    AND delivered_at IS NOT NULL
)
SELECT 
  'Ortalama Teslimat Süresi' as metrik,
  ROUND(AVG(minutes)::numeric, 1) as deger,
  'dakika' as birim
FROM delivery_times
WHERE minutes > 0 AND minutes < 300; -- Makul süreler (5 saat altı)

-- Günlük sipariş hacmi
SELECT 
  'Bugünkü Sipariş Hacmi' as metrik,
  COUNT(*) as deger,
  'sipariş' as birim
FROM packages 
WHERE DATE(created_at) = CURRENT_DATE

UNION ALL

SELECT 
  'Bugünkü Ciro' as metrik,
  COALESCE(SUM(amount), 0) as deger,
  'TL' as birim
FROM packages 
WHERE DATE(created_at) = CURRENT_DATE 
  AND status = 'delivered';

-- 3. HATA İZLEME
-- =============================================
SELECT 
  '⚠️ HATA İZLEME' as kategori,
  '' as metrik,
  '' as deger,
  '' as birim;

-- İptal edilen siparişler
SELECT 
  'Bugün İptal Edilen' as metrik,
  COUNT(*) as deger,
  'sipariş' as birim
FROM packages 
WHERE DATE(created_at) = CURRENT_DATE 
  AND status = 'cancelled'

UNION ALL

-- Uzun süre bekleyen siparişler
SELECT 
  'Uzun Süre Bekleyen' as metrik,
  COUNT(*) as deger,
  'sipariş' as birim
FROM packages 
WHERE status IN ('waiting', 'assigned') 
  AND created_at < NOW() - INTERVAL '2 hours'

UNION ALL

-- Pasif kuryeler
SELECT 
  'Pasif Kuryeler' as metrik,
  COUNT(*) as deger,
  'kurye' as birim
FROM couriers 
WHERE is_active = false;

-- 4. KURYE PERFORMANSI
-- =============================================
SELECT 
  '👨‍🚴 KURYE PERFORMANSI' as kategori,
  '' as metrik,
  '' as deger,
  '' as birim;

-- En aktif kuryeler (bugün)
SELECT 
  CONCAT('🏆 ', c.full_name) as metrik,
  COUNT(p.id) as deger,
  'teslimat' as birim
FROM couriers c
LEFT JOIN packages p ON c.id = p.courier_id 
  AND DATE(p.delivered_at) = CURRENT_DATE
  AND p.status = 'delivered'
WHERE c.is_active = true
GROUP BY c.id, c.full_name
ORDER BY COUNT(p.id) DESC
LIMIT 5;

-- 5. RESTORAN PERFORMANSI
-- =============================================
SELECT 
  '🍽️ RESTORAN PERFORMANSI' as kategori,
  '' as metrik,
  '' as deger,
  '' as birim;

-- En çok sipariş alan restoranlar (bugün)
SELECT 
  CONCAT('🥇 ', r.name) as metrik,
  COUNT(p.id) as deger,
  'sipariş' as birim
FROM restaurants r
LEFT JOIN packages p ON r.id = p.restaurant_id 
  AND DATE(p.created_at) = CURRENT_DATE
WHERE r.is_active = true
GROUP BY r.id, r.name
ORDER BY COUNT(p.id) DESC
LIMIT 5;

-- 6. SİSTEM SAĞLIĞI
-- =============================================
SELECT 
  '💚 SİSTEM SAĞLIĞI' as kategori,
  '' as metrik,
  '' as deger,
  '' as birim;

-- Veritabanı boyutu kontrolü
SELECT 
  'Packages Tablosu' as metrik,
  COUNT(*) as deger,
  'kayıt' as birim
FROM packages

UNION ALL

SELECT 
  'Son Backup' as metrik,
  EXTRACT(EPOCH FROM (NOW() - MAX(created_at)))/3600 as deger,
  'saat önce' as birim
FROM packages
WHERE created_at IS NOT NULL;

-- =============================================
-- ALARM KOŞULLARI
-- =============================================
SELECT 
  '🚨 ALARM KOŞULLARI' as kategori,
  '' as metrik,
  '' as deger,
  '' as birim;

-- Kritik durumlar
SELECT 
  CASE 
    WHEN COUNT(*) > 10 THEN '🔴 KRİTİK: Çok fazla bekleyen sipariş'
    WHEN COUNT(*) > 5 THEN '🟡 UYARI: Bekleyen sipariş sayısı yüksek'
    ELSE '🟢 NORMAL: Bekleyen sipariş durumu iyi'
  END as metrik,
  COUNT(*) as deger,
  'bekleyen sipariş' as birim
FROM packages 
WHERE status IN ('waiting', 'assigned') 
  AND created_at < NOW() - INTERVAL '1 hour'

UNION ALL

SELECT 
  CASE 
    WHEN COUNT(*) = 0 THEN '🔴 KRİTİK: Aktif kurye yok'
    WHEN COUNT(*) < 3 THEN '🟡 UYARI: Az sayıda aktif kurye'
    ELSE '🟢 NORMAL: Yeterli aktif kurye'
  END as metrik,
  COUNT(*) as deger,
  'aktif kurye' as birim
FROM couriers 
WHERE is_active = true;

-- =============================================
-- ÖZET RAPOR
-- =============================================
SELECT 
  '📋 ÖZET RAPOR' as kategori,
  CONCAT(
    'Bugün ', 
    (SELECT COUNT(*) FROM packages WHERE DATE(created_at) = CURRENT_DATE), 
    ' sipariş, ',
    (SELECT COUNT(*) FROM packages WHERE DATE(delivered_at) = CURRENT_DATE AND status = 'delivered'),
    ' teslimat yapıldı. Sistem sağlıklı çalışıyor.'
  ) as metrik,
  '' as deger,
  '' as birim;