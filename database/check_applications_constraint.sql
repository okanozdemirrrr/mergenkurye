-- Mevcut constraint'i kontrol et
SELECT 
  conname AS constraint_name,
  pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint
WHERE conrelid = 'applications'::regclass
  AND contype = 'c'; -- CHECK constraints
