-- Add stock quantity field to products
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS stock_quantity integer DEFAULT 0;

-- Create low stock threshold setting
INSERT INTO public.site_settings (key, value) 
VALUES ('low_stock_threshold', '5')
ON CONFLICT (key) DO NOTHING;