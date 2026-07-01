
-- 1. Announcements: allow anon to read active 'all' announcements
GRANT SELECT ON public.announcements TO anon;
CREATE POLICY "Anon can view public announcements"
  ON public.announcements FOR SELECT
  TO anon
  USING (is_active = true AND (target_audience IS NULL OR target_audience = 'all'));

-- 2. Product reviews: allow public read of approved reviews
GRANT SELECT ON public.product_reviews TO anon;
CREATE POLICY "Public can view approved reviews"
  ON public.product_reviews FOR SELECT
  TO anon, authenticated
  USING (is_approved = true);

-- 3. VIP members: force safe defaults on anonymous inserts
CREATE OR REPLACE FUNCTION public.enforce_vip_signup_defaults()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only constrain non-admin inserts (anonymous public signups)
  IF auth.uid() IS NULL OR NOT (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role)) THEN
    NEW.tier := 'free';
    NEW.payment_status := 'free';
    NEW.paid_until := NULL;
    NEW.plan_id := NULL;
    NEW.mpesa_code := NULL;
    NEW.unsubscribe_token := gen_random_uuid();
    NEW.status := 'active';
    NEW.coupons_used_count := 0;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_vip_signup_defaults ON public.vip_members;
CREATE TRIGGER trg_enforce_vip_signup_defaults
  BEFORE INSERT ON public.vip_members
  FOR EACH ROW EXECUTE FUNCTION public.enforce_vip_signup_defaults();

-- 4. Vouchers: remove from realtime publication so change events aren't broadcast
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'vouchers'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime DROP TABLE public.vouchers';
  END IF;
END $$;
