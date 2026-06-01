
-- 1. Recreate public_products as SECURITY INVOKER (no SECURITY DEFINER bypass)
DROP VIEW IF EXISTS public.public_products;
CREATE VIEW public.public_products
WITH (security_invoker = true) AS
SELECT id, name, description, category, subcategory, retail_price,
  wholesale_price, wholesale_min_qty, image_url, additional_images,
  in_stock, stock_quantity, barcode, variations, expiry_date,
  display_section, sale_price, sale_label, sale_ends_at, search_tags,
  created_at, updated_at
FROM public.products;

GRANT SELECT ON public.public_products TO anon, authenticated;

-- 2. Move pg_trgm extension out of public schema
CREATE SCHEMA IF NOT EXISTS extensions;
GRANT USAGE ON SCHEMA extensions TO anon, authenticated, service_role;
ALTER EXTENSION pg_trgm SET SCHEMA extensions;

-- 3. Tighten announcements SELECT policy — restrict by target_audience
DROP POLICY IF EXISTS "Customers can view active announcements" ON public.announcements;
CREATE POLICY "Customers can view active announcements"
ON public.announcements
FOR SELECT
TO authenticated
USING (
  is_active = true
  AND (
    target_audience IS NULL
    OR target_audience = 'all'
    OR target_audience = 'customers'
    OR (target_audience = 'admins' AND public.has_role(auth.uid(), 'admin'::app_role))
    OR (target_audience = 'super_admins' AND public.has_role(auth.uid(), 'super_admin'::app_role))
  )
);
