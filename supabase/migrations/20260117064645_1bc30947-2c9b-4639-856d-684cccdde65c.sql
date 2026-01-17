-- Add order_token_expires_at column to orders table
ALTER TABLE public.orders ADD COLUMN order_token_expires_at TIMESTAMP WITH TIME ZONE;

-- Update existing orders with tokens to have a 90-day expiration from creation date
UPDATE public.orders 
SET order_token_expires_at = created_at + INTERVAL '90 days'
WHERE order_token IS NOT NULL AND order_token_expires_at IS NULL;

-- Update get_guest_order function to check token expiration
CREATE OR REPLACE FUNCTION public.get_guest_order(_order_id uuid, _order_token text)
 RETURNS SETOF guest_order_info
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $$
  SELECT 
    id,
    order_status,
    delivery_type,
    delivery_address,
    pickup_date,
    pickup_time,
    items,
    subtotal,
    delivery_fee,
    total,
    created_at
  FROM orders 
  WHERE id = _order_id 
  AND order_token = _order_token
  AND user_id IS NULL
  AND (order_token_expires_at IS NULL OR order_token_expires_at > NOW());
$$;