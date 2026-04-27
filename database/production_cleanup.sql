-- =============================================
-- ALDA GEL V2 - TESLİM ÖNCESİ VERİTABANI TEMİZLİĞİ
-- =============================================
-- Bu script teslim öncesi test verilerini temizler
-- ve production için veritabanını hazırlar

-- 1. TEST SİPARİŞLERİNİ TEMİZLE
-- =============================================
DELETE FROM packages WHERE created_at < '2026-04-27';

-- 2. TEST KURYE HESAPLARINI TEMİZLE (Sadece test kuryeleri)
-- =============================================
-- NOT: Gerçek kurye hesaplarını koruyun!
DELETE FROM couriers WHERE 
  email LIKE '%test%' OR 
  email LIKE '%demo%' OR
  full_name LIKE '%Test%' OR
  full_name LIKE '%Demo%';

-- 3. TEST RESTORAN HESAPLARINI TEMİZLE
-- =============================================
-- NOT: Gerçek restoran hesaplarını koruyun!
DELETE FROM restaurants WHERE 
  email LIKE '%test%' OR 
  email LIKE '%demo%' OR
  name LIKE '%Test%' OR
  name LIKE '%Demo%';

-- 4. KURYE SETTLEMENT KAYITLARINI TEMİZLE
-- =============================================
DELETE FROM courier_settlements WHERE created_at < '2026-04-27';

-- 5. RESTORAN PAYMENT KAYITLARINI TEMİZLE
-- =============================================
DELETE FROM restaurant_payments WHERE created_at < '2026-04-27';

-- 6. ESKİ NOTIFICATION KAYITLARINI TEMİZLE
-- =============================================
DELETE FROM notifications WHERE created_at < '2026-04-20';

-- 7. ESKİ LOG KAYITLARINI TEMİZLE (Eğer varsa)
-- =============================================
-- DELETE FROM logs WHERE created_at < '2026-04-20';

-- 8. KURYE FCM TOKEN'LARINI SIFIRLA (Yeniden kayıt için)
-- =============================================
UPDATE couriers SET fcm_token = NULL WHERE fcm_token IS NOT NULL;

-- 9. RESTORAN BORÇ DURUMLARINI SIFIRLA
-- =============================================
UPDATE restaurants SET 
  debt_amount = 0,
  last_payment_date = NULL
WHERE debt_amount > 0;

-- 10. KURYE PERFORMANS İSTATİSTİKLERİNİ SIFIRLA
-- =============================================
UPDATE couriers SET 
  total_deliveries = 0,
  total_earnings = 0,
  rating = 5.0,
  updated_at = NOW()
WHERE total_deliveries > 0 OR total_earnings > 0;

-- 11. MARKET ÜRÜN STOKLARİNİ SIFIRLA
-- =============================================
UPDATE market_products SET 
  stock_quantity = 100,
  is_available = true
WHERE stock_quantity != 100;

-- 12. SEQUENCE'LERİ SIFIRLA (ID'leri 1'den başlat)
-- =============================================
-- Packages ID'sini sıfırla
SELECT setval('packages_id_seq', 1, false);

-- Courier settlements ID'sini sıfırla
SELECT setval('courier_settlements_id_seq', 1, false);

-- Restaurant payments ID'sini sıfırla
SELECT setval('restaurant_payments_id_seq', 1, false);

-- 13. VACUUM VE ANALYZE (Performans optimizasyonu)
-- =============================================
VACUUM ANALYZE packages;
VACUUM ANALYZE couriers;
VACUUM ANALYZE restaurants;
VACUUM ANALYZE courier_settlements;
VACUUM ANALYZE restaurant_payments;
VACUUM ANALYZE market_products;

-- =============================================
-- TEMİZLİK SONRASI KONTROL SORGUSU
-- =============================================
SELECT 
  'packages' as table_name, 
  COUNT(*) as record_count 
FROM packages
UNION ALL
SELECT 
  'couriers' as table_name, 
  COUNT(*) as record_count 
FROM couriers
UNION ALL
SELECT 
  'restaurants' as table_name, 
  COUNT(*) as record_count 
FROM restaurants
UNION ALL
SELECT 
  'courier_settlements' as table_name, 
  COUNT(*) as record_count 
FROM courier_settlements
UNION ALL
SELECT 
  'restaurant_payments' as table_name, 
  COUNT(*) as record_count 
FROM restaurant_payments
UNION ALL
SELECT 
  'market_products' as table_name, 
  COUNT(*) as record_count 
FROM market_products;

-- =============================================
-- PRODUCTION HAZIRLIK KONTROL LİSTESİ
-- =============================================
/*
✅ KONTROL LİSTESİ:

1. [ ] Test siparişleri temizlendi
2. [ ] Test kurye hesapları temizlendi  
3. [ ] Test restoran hesapları temizlendi
4. [ ] Eski settlement kayıtları temizlendi
5. [ ] Eski payment kayıtları temizlendi
6. [ ] FCM token'lar sıfırlandı
7. [ ] Borç durumları sıfırlandı
8. [ ] Performans istatistikleri sıfırlandı
9. [ ] Market stokları sıfırlandı
10. [ ] Sequence'ler sıfırlandı
11. [ ] Database optimize edildi

PRODUCTION AYARLARI:
- Admin kullanıcı adı: admin
- Admin şifre: admin123
- Firebase push notifications aktif
- Supabase RLS policies aktif
- SSL sertifikası geçerli
*/