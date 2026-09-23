-- ============================================================
-- Migration: payment_method constraint'ine 'online' ekle
-- Tarih: 2026-09-22
-- Açıklama: packages tablosundaki payment_method CHECK constraint
--           'online' değerine izin verecek şekilde güncelleniyor.
-- ============================================================

-- 1. Eski constraint'i kaldır
ALTER TABLE packages
  DROP CONSTRAINT IF EXISTS packages_payment_method_check;

-- 2. Yeni constraint'i 'online' dahil ekle
ALTER TABLE packages
  ADD CONSTRAINT packages_payment_method_check
    CHECK (payment_method = ANY (ARRAY['cash'::text, 'card'::text, 'iban'::text, 'online'::text]));
