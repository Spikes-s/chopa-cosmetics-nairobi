-- Drop the overly broad public SELECT policy on mpesa_transactions
DROP POLICY IF EXISTS "Anyone can view mpesa transactions by checkout_request_id" ON public.mpesa_transactions;

-- Add a scoped policy so authenticated users can only see their own transactions
CREATE POLICY "Users can view own mpesa transactions"
ON public.mpesa_transactions FOR SELECT
TO authenticated
USING (order_id IN (SELECT id FROM orders WHERE user_id = auth.uid()));