-- Uzak Mesafe Tarifesi
-- Restoran ücretini etkilemez; kurye hakedişini paket bazında artırır.

ALTER TABLE couriers
  ADD COLUMN IF NOT EXISTS long_distance_fee numeric(10, 2) NOT NULL DEFAULT 0;

ALTER TABLE packages
  ADD COLUMN IF NOT EXISTS is_long_distance boolean NOT NULL DEFAULT false;

-- Atama anındaki kurye hakediş ücreti snapshot (tarife değişse bile geçmiş korunur)
ALTER TABLE packages
  ADD COLUMN IF NOT EXISTS courier_earned_fee numeric(10, 2) NULL;

COMMENT ON COLUMN couriers.long_distance_fee IS 'Uzak mesafe paketleri için kurye hakediş ücreti (TL)';
COMMENT ON COLUMN packages.is_long_distance IS 'Uzak mesafe paketi olarak işaretlendi mi';
COMMENT ON COLUMN packages.courier_earned_fee IS 'Atama anındaki kurye hakediş ücreti snapshot (TL)';
