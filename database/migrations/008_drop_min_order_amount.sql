-- min_order_amount kaldırılıyor; tek kaynak minimum_order_value
UPDATE restaurants
SET minimum_order_value = min_order_amount
WHERE min_order_amount IS NOT NULL
  AND min_order_amount > 0
  AND (minimum_order_value IS NULL OR minimum_order_value = 0);

ALTER TABLE restaurants DROP COLUMN IF EXISTS min_order_amount;
