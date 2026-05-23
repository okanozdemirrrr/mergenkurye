-- Product option groups table
CREATE TABLE IF NOT EXISTS public.product_option_groups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID REFERENCES public.products(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('radio', 'checkbox')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Product options table
CREATE TABLE IF NOT EXISTS public.product_options (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id UUID REFERENCES public.product_option_groups(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    price_modifier NUMERIC(10, 2) DEFAULT 0.00 NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Add options JSONB column to products table for fast access and UI synchronization
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS options JSONB DEFAULT '[]'::jsonb;

-- Enable RLS (Row Level Security) on new tables
ALTER TABLE public.product_option_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_options ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated users (or restaurant admins) to perform all actions for simplicity
CREATE POLICY "Allow all actions for authenticated users on groups"
    ON public.product_option_groups FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Allow all actions for authenticated users on options"
    ON public.product_options FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);
