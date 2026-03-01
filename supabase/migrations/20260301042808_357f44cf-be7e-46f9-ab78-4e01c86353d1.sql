
-- Deny anonymous access to sensitive tables
CREATE POLICY "Deny anonymous access to profiles"
ON public.profiles FOR SELECT TO anon USING (false);

CREATE POLICY "Deny anonymous access to orders"
ON public.orders FOR SELECT TO anon USING (false);

CREATE POLICY "Deny anonymous access to chat_messages"
ON public.chat_messages FOR SELECT TO anon USING (false);

-- Deny anonymous access to saved_carts
CREATE POLICY "Deny anonymous access to saved_carts"
ON public.saved_carts FOR ALL TO anon USING (false);

-- Allow users to view their own pending reviews
CREATE POLICY "Users can view own reviews"
ON public.product_reviews FOR SELECT
TO authenticated
USING (auth.uid() = user_id);
