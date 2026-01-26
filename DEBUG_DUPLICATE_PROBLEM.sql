-- ============================================
-- DUPLICATE PROBLEM DEBUG
-- ============================================
-- Bu sorgular duplicate kayıt sorununu tespit eder

-- SORGU 1: Son 10 kaydı göster
SELECT 
  id,
  external_order_number,
  source,
  customer_name,
  courier_id,
  status,
  created_at
FROM packages
ORDER BY created_at DESC
LIMIT 10;

-- SORGU 2: Aynı external_order_number'a sahip kayıtları bul
SELECT 
  external_order_number,
  source,
  COUNT(*) as kayit_sayisi,
  STRING_AGG(id::text, ', ') as id_listesi,
  STRING_AGG(status, ', ') as status_listesi,
  STRING_AGG(COALESCE(courier_id, 'NULL'), ', ') as courier_listesi
FROM packages
WHERE external_order_number IS NOT NULL
GROUP BY external_order_number, source
HAVING COUNT(*) > 1
ORDER BY COUNT(*) DESC;

-- SORGU 3: NULL external_order_number olan kayıtları say
SELECT 
  COUNT(*) as null_order_number_sayisi,
  COUNT(CASE WHEN courier_id IS NOT NULL THEN 1 END) as kuryeli_null_sayisi
FROM packages
WHERE external_order_number IS NULL;

-- SORGU 4: Son 1 dakikada eklenen kayıtları göster
SELECT 
  id,
  external_order_number,
  source,
  customer_name,
  courier_id,
  status,
  created_at,
  NOW() - created_at as kac_saniye_once
FROM packages
WHERE created_at > NOW() - INTERVAL '1 minute'
ORDER BY created_at DESC;

-- SORGU 5: Aynı müşteri adı ve adrese sahip kayıtları bul (external_order_number NULL ise)
SELECT 
  customer_name,
  delivery_address,
  COUNT(*) as kayit_sayisi,
  STRING_AGG(id::text, ', ') as id_listesi,
  STRING_AGG(status, ', ') as status_listesi
FROM packages
WHERE external_order_number IS NULL
GROUP BY customer_name, delivery_address
HAVING COUNT(*) > 1
ORDER BY COUNT(*) DESC
LIMIT 10;

-- ============================================
-- SORUN TESPİTİ
-- ============================================

-- Eğer SORGU 2'de sonuç varsa:
-- → Aynı external_order_number'a sahip birden fazla kayıt var
-- → UNIQUE constraint çalışmıyor (muhtemelen NULL değerler var)

-- Eğer SORGU 3'te yüksek sayı varsa:
-- → external_order_number NULL olarak geliyor
-- → Ajan orderNumber göndermiyor
-- → UNIQUE constraint çalışamaz

-- Eğer SORGU 4'te aynı sipariş birden fazla kez varsa:
-- → Ajan aynı siparişi tekrar gönderiyor
-- → processedOrders cache çalışmıyor

-- Eğer SORGU 5'te sonuç varsa:
-- → external_order_number NULL ama aynı müşteri/adres var
-- → Manuel sipariş veya ajan orderNumber göndermiyor

-- ============================================
-- ÇÖZÜM ÖNERİLERİ
-- ============================================

-- ÇÖZÜM 1: external_order_number NULL ise otomatik oluştur
-- packages tablosuna trigger ekle
CREATE OR REPLACE FUNCTION generate_external_order_number()
RETURNS TRIGGER AS $$
BEGIN
  -- Eğer external_order_number NULL ise, otomatik oluştur
  IF NEW.external_order_number IS NULL THEN
    NEW.external_order_number := 'AUTO-' || NEW.id || '-' || EXTRACT(EPOCH FROM NOW())::bigint;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_generate_external_order_number ON packages;

CREATE TRIGGER trigger_generate_external_order_number
  BEFORE INSERT ON packages
  FOR EACH ROW
  EXECUTE FUNCTION generate_external_order_number();

-- ÇÖZÜM 2: Müşteri adı + adres + source kombinasyonuna göre UNIQUE constraint
-- (Sadece external_order_number NULL ise)
CREATE UNIQUE INDEX unique_customer_address_per_source
ON packages (customer_name, delivery_address, source)
WHERE external_order_number IS NULL;

-- ÇÖZÜM 3: created_at'e göre duplicate temizle (son 5 dakika)
-- Aynı external_order_number + source kombinasyonuna sahip kayıtlardan
-- en yeni olanı tut, eskilerini sil
DELETE FROM packages a
USING packages b
WHERE a.id < b.id
  AND a.external_order_number = b.external_order_number
  AND a.source = b.source
  AND a.created_at > NOW() - INTERVAL '5 minutes'
  AND b.created_at > NOW() - INTERVAL '5 minutes';

-- ============================================
-- TEST
-- ============================================

-- Test 1: UNIQUE constraint çalışıyor mu?
INSERT INTO packages (
  external_order_number,
  source,
  customer_name,
  delivery_address,
  amount,
  status
) VALUES (
  'TEST-UNIQUE-123',
  'test',
  'Test Müşteri',
  'Test Adres',
  100,
  'pending'
);

-- Aynı siparişi tekrar ekle (HATA VERMELI)
INSERT INTO packages (
  external_order_number,
  source,
  customer_name,
  delivery_address,
  amount,
  status
) VALUES (
  'TEST-UNIQUE-123',
  'test',
  'Test Müşteri 2',
  'Test Adres 2',
  200,
  'pending'
);

-- Beklenen: ERROR: duplicate key value violates unique constraint

-- Test kayıtlarını temizle
DELETE FROM packages WHERE external_order_number = 'TEST-UNIQUE-123';
