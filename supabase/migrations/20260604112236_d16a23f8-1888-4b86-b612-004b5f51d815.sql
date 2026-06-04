DROP POLICY IF EXISTS "Anyone can view approved reviews" ON public.product_reviews;

CREATE OR REPLACE VIEW public.public_reviews
WITH (security_invoker = true)
AS
SELECT
  id,
  product_id,
  customer_name,
  rating,
  review_text,
  review_images,
  is_approved,
  created_at
FROM public.product_reviews
WHERE is_approved = true;

GRANT SELECT ON public.public_reviews TO anon, authenticated;

CREATE POLICY "Public can read approved reviews (no user_id projected)"
ON public.product_reviews
FOR SELECT
TO anon, authenticated
USING (is_approved = true);