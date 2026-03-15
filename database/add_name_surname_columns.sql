-- Add name and surname columns to customers table
-- This splits the full_name into separate columns for better data management

-- 1. Add new columns
ALTER TABLE customers
ADD COLUMN IF NOT EXISTS name TEXT,
ADD COLUMN IF NOT EXISTS surname TEXT;

-- 2. Split existing full_name data into name and surname
UPDATE customers
SET 
  name = SPLIT_PART(full_name, ' ', 1),
  surname = CASE 
    WHEN ARRAY_LENGTH(STRING_TO_ARRAY(full_name, ' '), 1) > 1 
    THEN SUBSTRING(full_name FROM LENGTH(SPLIT_PART(full_name, ' ', 1)) + 2)
    ELSE ''
  END
WHERE name IS NULL;

-- 3. Make name column NOT NULL (surname can be empty)
ALTER TABLE customers
ALTER COLUMN name SET NOT NULL;

-- 4. Keep full_name for backward compatibility but update it from name+surname
CREATE OR REPLACE FUNCTION update_full_name()
RETURNS TRIGGER AS $$
BEGIN
  NEW.full_name = TRIM(NEW.name || ' ' || COALESCE(NEW.surname, ''));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_customers_full_name
BEFORE INSERT OR UPDATE OF name, surname ON customers
FOR EACH ROW
EXECUTE FUNCTION update_full_name();

-- Done! Now customers table has both full_name and name/surname columns
