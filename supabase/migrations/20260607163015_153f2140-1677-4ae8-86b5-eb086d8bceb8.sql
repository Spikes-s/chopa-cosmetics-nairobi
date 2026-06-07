
CREATE OR REPLACE FUNCTION public.lookup_order_public(_query text, _phone text)
RETURNS TABLE (
  id uuid,
  receipt_number text,
  order_status text,
  payment_status text,
  delivery_type text,
  delivery_address text,
  pickup_date date,
  pickup_time text,
  subtotal numeric,
  delivery_fee numeric,
  total numeric,
  items jsonb,
  status_history jsonb,
  created_at timestamptz,
  updated_at timestamptz
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  q text := trim(coalesce(_query, ''));
  p text := regexp_replace(coalesce(_phone, ''), '\s+', '', 'g');
BEGIN
  IF length(q) < 4 OR length(p) < 9 THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    o.id, o.receipt_number, o.order_status, o.payment_status,
    o.delivery_type, o.delivery_address, o.pickup_date, o.pickup_time,
    o.subtotal, o.delivery_fee, o.total, o.items, o.status_history,
    o.created_at, o.updated_at
  FROM public.orders o
  WHERE regexp_replace(o.customer_phone, '\s+', '', 'g') = p
    AND (
      upper(o.receipt_number) = upper(q)
      OR o.id::text = lower(q)
      OR upper(substr(o.id::text, 1, 8)) = upper(q)
    )
  LIMIT 1;
END;
$$;

REVOKE ALL ON FUNCTION public.lookup_order_public(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.lookup_order_public(text, text) TO anon, authenticated;
