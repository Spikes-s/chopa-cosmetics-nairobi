-- Add order_token column for secure guest order tracking
ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS order_token TEXT UNIQUE;

-- Create index for efficient token lookups
CREATE INDEX IF NOT EXISTS idx_orders_order_token ON public.orders(order_token);

-- Create a function for guests to retrieve their orders securely
CREATE OR REPLACE FUNCTION public.get_guest_order(
  _order_id UUID,
  _order_token TEXT
) RETURNS SETOF orders AS $$
  SELECT * FROM orders 
  WHERE id = _order_id 
  AND order_token = _order_token
  AND user_id IS NULL;
$$ LANGUAGE sql SECURITY DEFINER SET search_path = public;