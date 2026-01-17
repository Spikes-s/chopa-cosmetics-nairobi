-- Fix the mark_guest_order_lookup_success function using subquery approach
CREATE OR REPLACE FUNCTION public.mark_guest_order_lookup_success(_ip_address text, _order_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  UPDATE guest_order_lookups
  SET success = true
  WHERE id = (
    SELECT id FROM guest_order_lookups
    WHERE ip_address = _ip_address
    AND order_id = _order_id
    AND created_at > NOW() - interval '1 minute'
    ORDER BY created_at DESC
    LIMIT 1
  );
END;
$$;

-- Create cleanup function for old records
CREATE OR REPLACE FUNCTION public.cleanup_old_guest_order_lookups()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  deleted_count integer;
BEGIN
  -- Require admin role
  IF NOT has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Unauthorized: admin role required';
  END IF;
  
  DELETE FROM guest_order_lookups
  WHERE created_at < NOW() - interval '24 hours';
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;