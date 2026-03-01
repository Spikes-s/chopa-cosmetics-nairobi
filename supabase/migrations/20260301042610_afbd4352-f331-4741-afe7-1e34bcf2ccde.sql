
-- Create an admin_products view that excludes cost_price for regular admins
-- Only super_admins can see cost_price through the base products table
-- Regular admins use this view instead

CREATE OR REPLACE VIEW public.admin_products
WITH (security_invoker = on)
AS
SELECT
  id, name, description, category, subcategory, image_url, additional_images,
  retail_price, wholesale_price, wholesale_min_qty,
  in_stock, stock_quantity, variations, barcode, display_section, expiry_date,
  CASE 
    WHEN public.has_role(auth.uid(), 'super_admin') THEN cost_price
    ELSE NULL
  END AS cost_price,
  created_at, updated_at
FROM public.products;

-- Grant access
GRANT SELECT ON public.admin_products TO authenticated;
