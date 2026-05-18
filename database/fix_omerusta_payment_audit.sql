/**
 * @file database/fix_omerusta_payment_audit.sql
 * @description Ömerusta restoranın yanlış ödeme kaydını denetle ve düzelt
 * 
 * SORUN: Eski sistem 11-17 Mayıs filtrelendiğinde 18 Mayıs paketlerini de 
 * kümülatif bakiyeye dahil ediyordu. 24.520 TL ödeme kaydı yanlış olabilir.
 * 
 * BU DOSYAYI ADIM ADIM ÇALIŞTIRIN. HER ADIMI TEK TEK KOPYALAYIP ÇALIŞTIRIN.
 */

-- ============================================================================
-- ADIM 1: ÖMERUSTA RESTORAN ID'Sİ VE SON ÖDEME KAYITLARI
-- ============================================================================
-- Bu sorguyu çalıştırıp sonucu bana gönderin.

SELECT 
    r.id as restaurant_id,
    r.name,
    r.package_fee,
    rpt.id as payment_id,
    rpt.amount_paid,
    rpt.brut_ciro,
    rpt.toplam_masraf,
    rpt.net_hakedis,
    rpt.package_count,
    rpt.notes,
    rpt.created_at,
    rpt.period_start,
    rpt.period_end
FROM restaurants r
LEFT JOIN restaurant_payment_transactions rpt ON rpt.restaurant_id = r.id
WHERE LOWER(r.name) LIKE '%ömer%' OR LOWER(r.name) LIKE '%omer%'
ORDER BY rpt.created_at DESC;

-- ============================================================================
-- ADIM 2: 18 MAYIS PAKETLERİ AYRICA VAR MI?
-- ============================================================================
-- Bu, 18 Mayıs'taki Ömerusta paketlerini gösterir.

SELECT 
    p.id,
    p.amount,
    p.status,
    p.is_paid_to_restaurant,
    p.delivered_at,
    p.created_at,
    p.is_chargeable_cancellation
FROM packages p
JOIN restaurants r ON r.id = p.restaurant_id
WHERE (LOWER(r.name) LIKE '%ömer%' OR LOWER(r.name) LIKE '%omer%')
  AND (
    (p.status = 'delivered' AND p.delivered_at >= '2026-05-18 00:00:00' AND p.delivered_at <= '2026-05-18 23:59:59')
    OR
    (p.status = 'cancelled' AND p.is_chargeable_cancellation = true AND p.created_at >= '2026-05-18 00:00:00' AND p.created_at <= '2026-05-18 23:59:59')
  )
ORDER BY p.delivered_at DESC;

-- ============================================================================
-- ADIM 3: 11-17 MAYIS PAKETLERİNİN TOPLAM CİROSU
-- ============================================================================
-- Eski ödemenin 24.520 TL olup olmadığını doğrulamak için
-- sadece 11-17 Mayıs arasındaki paketlerin toplamını hesapla.

SELECT 
    COUNT(*) as paket_sayisi,
    COALESCE(SUM(p.amount), 0) as toplam_ciro,
    COUNT(*) * COALESCE(r.package_fee, 100) as toplam_masraf,
    COALESCE(SUM(p.amount), 0) - (COUNT(*) * COALESCE(r.package_fee, 100)) as net_tutar
FROM packages p
JOIN restaurants r ON r.id = p.restaurant_id
WHERE (LOWER(r.name) LIKE '%ömer%' OR LOWER(r.name) LIKE '%omer%')
  AND (
    (p.status = 'delivered' AND p.delivered_at >= '2026-05-11 00:00:00' AND p.delivered_at <= '2026-05-17 23:59:59')
    OR
    (p.status = 'cancelled' AND p.is_chargeable_cancellation = true AND p.created_at >= '2026-05-11 00:00:00' AND p.created_at <= '2026-05-17 23:59:59')
  )
GROUP BY r.package_fee;

-- ============================================================================
-- ADIM 4: YANLIŞ ÖDEME KAYDINI SİL VE PAKETLERİ GERİ AL
-- ============================================================================
-- ⚠️ BU ADIMI SADECE ADIM 1-3'Ü İNCELEDİKTEN SONRA ÇALIŞTIRIN!
-- 
-- Aşağıdaki sorgu:
-- 1. Ömerusta'nın EN SON ödeme kaydını siler (yanlış olan)
-- 2. Yeni migration tarafından is_paid_to_restaurant = true yapılmış 
--    paketlerin HEPSINI false'a geri alır (temiz başlangıç)

-- 4A: Yanlış ödeme kaydını sil
DELETE FROM restaurant_payment_transactions
WHERE id = (
    SELECT rpt.id 
    FROM restaurant_payment_transactions rpt
    JOIN restaurants r ON r.id = rpt.restaurant_id
    WHERE LOWER(r.name) LIKE '%ömer%' OR LOWER(r.name) LIKE '%omer%'
    ORDER BY rpt.created_at DESC
    LIMIT 1
);

-- 4B: Ömerusta paketlerinin tümünü ödenmemiş olarak geri al
UPDATE packages
SET is_paid_to_restaurant = false
WHERE restaurant_id = (
    SELECT id FROM restaurants 
    WHERE LOWER(name) LIKE '%ömer%' OR LOWER(name) LIKE '%omer%'
    LIMIT 1
);

-- 4C: Doğrulama - artık Ömerusta'nın hiç ödeme kaydı ve ödendi paketi olmamalı
SELECT 
    'Ödeme Kayıtları' as kontrol,
    COUNT(*) as adet
FROM restaurant_payment_transactions rpt
JOIN restaurants r ON r.id = rpt.restaurant_id
WHERE LOWER(r.name) LIKE '%ömer%' OR LOWER(r.name) LIKE '%omer%'

UNION ALL

SELECT 
    'Ödendi İşaretli Paketler' as kontrol,
    COUNT(*) as adet
FROM packages p
JOIN restaurants r ON r.id = p.restaurant_id
WHERE (LOWER(r.name) LIKE '%ömer%' OR LOWER(r.name) LIKE '%omer%')
  AND p.is_paid_to_restaurant = true;
