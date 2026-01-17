-- First drop the existing function
DROP FUNCTION IF EXISTS public.get_guest_order(UUID, TEXT);

-- Fix 1: Create a type for limited guest order info (excluding sensitive data)
CREATE TYPE public.guest_order_info AS (
  id UUID,
  order_status TEXT,
  delivery_type TEXT,
  delivery_address TEXT,
  pickup_date DATE,
  pickup_time TEXT,
  items JSONB,
  subtotal NUMERIC,
  delivery_fee NUMERIC,
  total NUMERIC,
  created_at TIMESTAMPTZ
);

-- Recreate the function to return only safe fields
CREATE FUNCTION public.get_guest_order(
  _order_id UUID,
  _order_token TEXT
) RETURNS SETOF guest_order_info AS $$
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
  AND user_id IS NULL;
$$ LANGUAGE sql SECURITY DEFINER SET search_path = public;

-- Fix 2: Add authentication requirement to user_roles SELECT policies
DROP POLICY IF EXISTS "Users can view own roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can view all roles" ON public.user_roles;

CREATE POLICY "Users can view own roles" ON public.user_roles
  FOR SELECT
  USING (auth.uid() IS NOT NULL AND auth.uid() = user_id);

CREATE POLICY "Admins can view all roles" ON public.user_roles
  FOR SELECT
  USING (auth.uid() IS NOT NULL AND has_role(auth.uid(), 'admin'::app_role));

-- Fix 3: Restrict site_settings to hide sensitive business data from public
DROP POLICY IF EXISTS "Anyone can view settings" ON public.site_settings;

CREATE POLICY "Public can view non-sensitive settings" ON public.site_settings
  FOR SELECT
  USING (
    key NOT IN ('returns_history', 'low_stock_threshold', 'internal_config', 'admin_settings')
    OR has_role(auth.uid(), 'admin'::app_role)
  );