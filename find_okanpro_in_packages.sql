-- okanpro44@gmail.com'u packages tablosunda ara

SELECT 
  id,
  order_number,
  customer_name,
  customer_phone,
  delivery_address,
  content,
  courier_id,
  status,
  created_at
FROM packages
WHERE 
  customer_name LIKE '%okanpro%'
  OR customer_phone LIKE '%okanpro%'
  OR delivery_address LIKE '%okanpro%'
  OR content LIKE '%okanpro%'
ORDER BY created_at DESC
LIMIT 10;
