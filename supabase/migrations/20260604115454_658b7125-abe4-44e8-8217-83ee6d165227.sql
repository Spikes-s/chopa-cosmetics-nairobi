
DROP POLICY IF EXISTS "Public can read approved reviews (no user_id projected)" ON public.product_reviews;
DROP POLICY IF EXISTS "Public can read approved reviews" ON public.product_reviews;

ALTER VIEW public.public_reviews SET (security_invoker = false);

GRANT SELECT ON public.public_reviews TO anon, authenticated;
