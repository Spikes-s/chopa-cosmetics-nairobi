-- Drop and recreate the public_products view to exclude wholesale pricing
-- This protects competitive pricing strategy from being scraped
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
    -- wholesale_price excluded to protect B2B pricing strategy
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
FROM products;