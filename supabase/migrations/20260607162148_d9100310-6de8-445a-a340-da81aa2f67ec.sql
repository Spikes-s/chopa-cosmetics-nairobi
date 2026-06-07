
-- Fix Security Definer views by setting security_invoker
ALTER VIEW public.public_products SET (security_invoker = true);
ALTER VIEW public.public_reviews SET (security_invoker = true);
ALTER VIEW public.admin_products SET (security_invoker = true);

-- Restrict VIP coupon public reads (use validate_coupon RPC instead)
DROP POLICY IF EXISTS "Anyone can view active coupons" ON public.vip_coupons;

-- Tighten page_visits insert with field-length checks
DROP POLICY IF EXISTS "Anyone can insert page visits" ON public.page_visits;
CREATE POLICY "Anyone can insert page visits"
ON public.page_visits
FOR INSERT
WITH CHECK (
  length(COALESCE(user_agent, '')) <= 1000
  AND length(COALESCE(visitor_id, '')) <= 100
  AND length(COALESCE(page_path, '')) <= 500
);

-- Bind product_reviews inserts to auth.uid()
DROP POLICY IF EXISTS "Users can insert reviews" ON public.product_reviews;
CREATE POLICY "Users can insert reviews"
ON public.product_reviews
FOR INSERT
WITH CHECK (
  auth.uid() IS NOT NULL
  AND (user_id IS NULL OR user_id = auth.uid())
);
