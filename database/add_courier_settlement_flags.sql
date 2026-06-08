-- Kurye mutabakat/ödeme kontrol bayrakları

-- 1) Yeni kolonlar
ALTER TABLE packages
ADD COLUMN IF NOT EXISTS is_courier_settled BOOLEAN DEFAULT false;

ALTER TABLE packages
ADD COLUMN IF NOT EXISTS is_courier_earned_paid BOOLEAN DEFAULT false;

-- 2) Geçmişi kapat (teslim edilmiş paketler)
UPDATE packages
SET
  is_courier_settled = true,
  is_courier_earned_paid = true
WHERE status = 'delivered'
  AND (
    COALESCE(is_courier_settled, false) = false
    OR COALESCE(is_courier_earned_paid, false) = false
  );
