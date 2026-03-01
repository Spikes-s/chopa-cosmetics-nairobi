
-- 1. Create the missing guest_order_lookups table
CREATE TABLE public.guest_order_lookups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ip_address TEXT NOT NULL,
  order_id UUID NOT NULL,
  success BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_guest_lookups_ip_time ON public.guest_order_lookups(ip_address, created_at);
CREATE INDEX idx_guest_lookups_order_time ON public.guest_order_lookups(order_id, created_at);

ALTER TABLE public.guest_order_lookups ENABLE ROW LEVEL SECURITY;

-- Only service role (edge functions) should access this table
-- No public access needed
CREATE POLICY "No public access to guest_order_lookups"
ON public.guest_order_lookups FOR ALL
TO anon, authenticated
USING (false);

-- 2. Create the missing check_guest_order_rate_limit function
CREATE OR REPLACE FUNCTION public.check_guest_order_rate_limit(
  _ip_address TEXT,
  _order_id UUID,
  _max_attempts INTEGER,
  _window_minutes INTEGER
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  attempt_count INTEGER;
BEGIN
  -- Count recent attempts from this IP
  SELECT COUNT(*) INTO attempt_count
  FROM guest_order_lookups
  WHERE ip_address = _ip_address
    AND created_at > NOW() - (_window_minutes || ' minutes')::INTERVAL;

  -- Log this attempt
  INSERT INTO guest_order_lookups (ip_address, order_id, success)
  VALUES (_ip_address, _order_id, false);

  -- Return true if under limit
  RETURN attempt_count < _max_attempts;
END;
$$;
