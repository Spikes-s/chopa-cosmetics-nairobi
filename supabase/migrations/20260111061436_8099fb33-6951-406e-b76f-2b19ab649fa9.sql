-- Fix reduce_stock function to require admin role and validate inputs
CREATE OR REPLACE FUNCTION public.reduce_stock(product_id uuid, quantity_sold integer)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Require admin role
  IF NOT has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Unauthorized: admin role required';
  END IF;
  
  -- Validate input
  IF quantity_sold IS NULL OR quantity_sold < 1 OR quantity_sold > 10000 THEN
    RAISE EXCEPTION 'Invalid quantity: must be between 1 and 10000';
  END IF;
  
  -- Verify product exists
  IF NOT EXISTS (SELECT 1 FROM products WHERE id = product_id) THEN
    RAISE EXCEPTION 'Product not found';
  END IF;
  
  -- Update stock
  UPDATE public.products 
  SET stock_quantity = GREATEST(0, COALESCE(stock_quantity, 0) - quantity_sold),
      in_stock = CASE WHEN COALESCE(stock_quantity, 0) - quantity_sold > 0 THEN true ELSE false END
  WHERE id = product_id;
END;
$$;

-- Revoke public access and grant only to authenticated users
REVOKE EXECUTE ON FUNCTION public.reduce_stock FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.reduce_stock TO authenticated;