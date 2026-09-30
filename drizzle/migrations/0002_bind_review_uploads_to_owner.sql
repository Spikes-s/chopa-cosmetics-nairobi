DROP POLICY IF EXISTS "Authenticated users can upload review images" ON storage.objects;
CREATE POLICY "Authenticated users can upload review images"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'product-images'
  AND (storage.foldername(name))[1] = 'reviews'
  AND (storage.foldername(name))[2] = (select auth.uid()::text)
  AND lower(COALESCE(metadata->>'mimetype', '')) IN ('image/png', 'image/jpeg', 'image/webp')
  AND COALESCE((metadata->>'size')::bigint, 0) <= 5242880
  AND (lower(name) LIKE '%.png' OR lower(name) LIKE '%.jpg' OR lower(name) LIKE '%.jpeg' OR lower(name) LIKE '%.webp')
);