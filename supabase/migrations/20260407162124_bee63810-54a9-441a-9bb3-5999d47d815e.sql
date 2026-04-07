-- Allow everyone to view products (storefront)
CREATE POLICY "Anyone can view products" ON public.products
FOR SELECT TO public
USING (true);