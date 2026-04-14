-- ============================================
-- 🚀 TOPLU MİGRASYON - SUPABASE SQL EDITOR'DE ÇALIŞTIR
-- ============================================
-- Bu dosyayı Supabase Dashboard > SQL Editor'de çalıştır
-- Tüm eksik sütunları ekler ve trigger sorununu çözer

-- ============================================
-- 1. KRİTİK: Bildirim Trigger'ını Kaldır
-- ============================================
-- Bu trigger sipariş durumu güncellenirken customer_id hatası veriyor
DROP TRIGGER IF EXISTS trigger_order_status_notification ON packages;

-- ============================================
-- 2. Restoran Çalışma Durumu Sütunu
-- ============================================
-- Restoranların açık/kapalı durumunu kontrol etmek için
ALTER TABLE restaurants 
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- Mevcut tüm restoranları aktif yap
UPDATE restaurants SET is_active = true WHERE is_active IS NULL;

-- Index ekle (performans için)
CREATE INDEX IF NOT EXISTS idx_restaurants_is_active ON restaurants(is_active);

-- ============================================
-- 3. Ürün Yan Ürünleri (Cross-sell) Sistemi
-- ============================================
-- Her ürün için yan ürün önerileri tanımlamak için
ALTER TABLE products 
ADD COLUMN IF NOT EXISTS upsell_product_ids TEXT[] DEFAULT '{}';

-- Index ekle (performans için)
CREATE INDEX IF NOT EXISTS idx_products_upsell_ids ON products USING GIN (upsell_product_ids);

-- ============================================
-- ✅ MİGRASYON TAMAMLANDI!
-- ============================================
-- Şimdi şunları yapabilirsin:
-- 1. Restoran panelinde sipariş durumu güncelleyebilirsin (hata vermeyecek)
-- 2. Restoranlar açık/kapalı durumlarını değiştirebilir
-- 3. Ürünlere yan ürün önerileri ekleyebilirsin
