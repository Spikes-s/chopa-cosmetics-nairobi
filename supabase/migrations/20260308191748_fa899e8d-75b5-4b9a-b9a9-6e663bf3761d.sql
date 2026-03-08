ALTER TABLE public.products 
  ADD COLUMN IF NOT EXISTS sale_price numeric DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS sale_ends_at timestamp with time zone DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS sale_label text DEFAULT NULL;