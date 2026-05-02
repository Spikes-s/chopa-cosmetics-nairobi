-- Recreate public_products view WITHOUT security_invoker
-- The view already excludes cost_price, so it's safe for public access
DROP VIEW IF EXISTS public.public_products;

CREATE VIEW public.public_products AS
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
  display_section,
  sale_price,
  sale_label,
  sale_ends_at,
  created_at,
  updated_at
FROM products;

-- Grant SELECT on the view to anon and authenticated roles
GRANT SELECT ON public.public_products TO anon, authenticated;