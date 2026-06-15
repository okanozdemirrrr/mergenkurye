-- Opsiyon grubu zorunluluk alanı
-- true = zorunlu, false = isteğe bağlı
ALTER TABLE public.product_option_groups
  ADD COLUMN IF NOT EXISTS necessity BOOLEAN NOT NULL DEFAULT false;
