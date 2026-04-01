
CREATE TABLE public.mpesa_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  checkout_request_id text UNIQUE,
  merchant_request_id text,
  phone_number text NOT NULL,
  amount numeric NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  mpesa_receipt_number text,
  result_code integer,
  result_desc text,
  order_id uuid REFERENCES public.orders(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.mpesa_transactions ENABLE ROW LEVEL SECURITY;

-- Service role (edge functions) can do everything via SECURITY DEFINER functions
-- For polling: anyone can check status by checkout_request_id
CREATE POLICY "Anyone can view mpesa transactions by checkout_request_id"
ON public.mpesa_transactions
FOR SELECT
TO anon, authenticated
USING (true);

-- Only edge functions (service role) insert/update - no direct client writes
CREATE POLICY "Admins can manage mpesa transactions"
ON public.mpesa_transactions
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
