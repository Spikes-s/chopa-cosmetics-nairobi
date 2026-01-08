-- Add mpesa_code column to orders
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS mpesa_code text;

-- Add status_history column for tracking status changes with timestamps
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS status_history jsonb DEFAULT '[]'::jsonb;

-- Create function to reduce stock after order
CREATE OR REPLACE FUNCTION public.reduce_stock(product_id uuid, quantity_sold integer)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.products 
  SET stock_quantity = GREATEST(0, COALESCE(stock_quantity, 0) - quantity_sold),
      in_stock = CASE WHEN COALESCE(stock_quantity, 0) - quantity_sold > 0 THEN true ELSE false END
  WHERE id = product_id;
END;
$$;