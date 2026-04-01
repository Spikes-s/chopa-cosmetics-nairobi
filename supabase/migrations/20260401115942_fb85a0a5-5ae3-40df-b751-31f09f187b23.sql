-- Update public_products view to include sale/display columns needed by public pages
-- while still excluding cost_price (internal margin data)
DROP VIEW IF EXISTS public.public_products;

CREATE VIEW public.public_products
WITH (security_invoker=on) AS
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

-- Grant access to the view
GRANT SELECT ON public.public_products TO anon, authenticated;

-- Restrict direct products table SELECT to admins only
-- (public access should go through public_products view)
DROP POLICY IF EXISTS "Anyone can view products" ON public.products;

CREATE POLICY "Admins can view all products"
ON public.products
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));