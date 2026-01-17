-- Create a view for public product access that excludes sensitive cost_price
CREATE OR REPLACE VIEW public.public_products AS
SELECT 
  id,
  name,
  description,
  category,
  subcategory,
  retail_price,
  wholesale_price,
  wholesale_min_qty,
  image_url,
  additional_images,
  in_stock,
  stock_quantity,
  barcode,
  variations,
  expiry_date,
  created_at,
  updated_at
FROM public.products;

-- Grant access to the view
GRANT SELECT ON public.public_products TO anon, authenticated;

-- Create page visits tracking table
CREATE TABLE public.page_visits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  visited_at timestamp with time zone NOT NULL DEFAULT now(),
  page_path text NOT NULL DEFAULT '/',
  visitor_id text,
  user_agent text,
  referrer text
);

-- Enable RLS
ALTER TABLE public.page_visits ENABLE ROW LEVEL SECURITY;

-- Allow anyone to insert visits (for tracking)
CREATE POLICY "Anyone can insert page visits"
ON public.page_visits
FOR INSERT
WITH CHECK (true);

-- Only admins can view visits
CREATE POLICY "Admins can view page visits"
ON public.page_visits
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Only admins can delete visits (for cleanup)
CREATE POLICY "Admins can delete page visits"
ON public.page_visits
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create index for faster counting
CREATE INDEX idx_page_visits_visited_at ON public.page_visits(visited_at DESC);
CREATE INDEX idx_page_visits_page_path ON public.page_visits(page_path);