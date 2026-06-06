
-- ============================================================
-- VIP MEMBERS
-- ============================================================
CREATE TABLE public.vip_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  full_name TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','unsubscribed','blocked')),
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_email_sent_at TIMESTAMPTZ,
  coupons_used_count INTEGER NOT NULL DEFAULT 0,
  unsubscribe_token UUID NOT NULL DEFAULT gen_random_uuid() UNIQUE,
  source TEXT DEFAULT 'homepage',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_vip_members_status ON public.vip_members(status);
CREATE INDEX idx_vip_members_email_lower ON public.vip_members(lower(email));

GRANT SELECT, INSERT ON public.vip_members TO anon;
GRANT SELECT, INSERT, UPDATE ON public.vip_members TO authenticated;
GRANT ALL ON public.vip_members TO service_role;

ALTER TABLE public.vip_members ENABLE ROW LEVEL SECURITY;

-- Public signup allowed (rate-limited via edge function; we still allow direct insert for fallback)
CREATE POLICY "Anyone can sign up as VIP"
  ON public.vip_members FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    email IS NOT NULL
    AND length(email) <= 255
    AND length(coalesce(full_name,'')) <= 100
    AND status = 'active'
    AND coupons_used_count = 0
  );

CREATE POLICY "Admins can view all VIP members"
  ON public.vip_members FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Admins can update all VIP members"
  ON public.vip_members FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Admins can delete VIP members"
  ON public.vip_members FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

CREATE TRIGGER vip_members_updated_at
  BEFORE UPDATE ON public.vip_members
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- ============================================================
-- VIP COUPONS
-- ============================================================
CREATE TABLE public.vip_coupons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  discount_percent NUMERIC(5,2) NOT NULL CHECK (discount_percent > 0 AND discount_percent <= 100),
  starts_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '7 days'),
  usage_limit INTEGER,
  times_used INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_vip_coupons_code_upper ON public.vip_coupons(upper(code));
CREATE INDEX idx_vip_coupons_active ON public.vip_coupons(is_active, expires_at);

GRANT SELECT ON public.vip_coupons TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.vip_coupons TO authenticated;
GRANT ALL ON public.vip_coupons TO service_role;

ALTER TABLE public.vip_coupons ENABLE ROW LEVEL SECURITY;

-- Anyone can read active coupons (needed for checkout validation lookups)
CREATE POLICY "Anyone can view active coupons"
  ON public.vip_coupons FOR SELECT
  TO anon, authenticated
  USING (is_active = true AND expires_at > now());

CREATE POLICY "Admins can view all coupons"
  ON public.vip_coupons FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Admins can manage coupons"
  ON public.vip_coupons FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

CREATE TRIGGER vip_coupons_updated_at
  BEFORE UPDATE ON public.vip_coupons
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- ============================================================
-- VIP COUPON REDEMPTIONS
-- ============================================================
CREATE TABLE public.vip_coupon_redemptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coupon_id UUID NOT NULL REFERENCES public.vip_coupons(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
  discount_amount NUMERIC(12,2),
  redeemed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (coupon_id, email)
);

CREATE INDEX idx_redemptions_coupon ON public.vip_coupon_redemptions(coupon_id);
CREATE INDEX idx_redemptions_email ON public.vip_coupon_redemptions(lower(email));

GRANT SELECT ON public.vip_coupon_redemptions TO authenticated;
GRANT ALL ON public.vip_coupon_redemptions TO service_role;

ALTER TABLE public.vip_coupon_redemptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view redemptions"
  ON public.vip_coupon_redemptions FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

-- ============================================================
-- VIP EMAIL CAMPAIGNS
-- ============================================================
CREATE TABLE public.vip_email_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subject TEXT NOT NULL,
  body_html TEXT NOT NULL,
  body_text TEXT,
  prompt_used TEXT,
  coupon_id UUID REFERENCES public.vip_coupons(id) ON DELETE SET NULL,
  sent_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  sent_at TIMESTAMPTZ,
  recipient_count INTEGER NOT NULL DEFAULT 0,
  delivered_count INTEGER NOT NULL DEFAULT 0,
  failed_count INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','sending','sent','failed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.vip_email_campaigns TO authenticated;
GRANT ALL ON public.vip_email_campaigns TO service_role;

ALTER TABLE public.vip_email_campaigns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage campaigns"
  ON public.vip_email_campaigns FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

CREATE TRIGGER vip_campaigns_updated_at
  BEFORE UPDATE ON public.vip_email_campaigns
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- ============================================================
-- VIP CAMPAIGN RECIPIENTS
-- ============================================================
CREATE TABLE public.vip_campaign_recipients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES public.vip_email_campaigns(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','sent','failed','bounced')),
  error_message TEXT,
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_campaign_recipients_campaign ON public.vip_campaign_recipients(campaign_id);

GRANT SELECT ON public.vip_campaign_recipients TO authenticated;
GRANT ALL ON public.vip_campaign_recipients TO service_role;

ALTER TABLE public.vip_campaign_recipients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view campaign recipients"
  ON public.vip_campaign_recipients FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

-- ============================================================
-- PRODUCT WHOLESALE PRICING (additive)
-- ============================================================
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS wholesale_price NUMERIC(12,2),
  ADD COLUMN IF NOT EXISTS wholesale_min_qty INTEGER;

-- ============================================================
-- HELPER FUNCTIONS
-- ============================================================

-- Sweep expired coupons
CREATE OR REPLACE FUNCTION public.expire_old_coupons()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  affected INTEGER;
BEGIN
  UPDATE public.vip_coupons
  SET is_active = false, updated_at = now()
  WHERE is_active = true AND expires_at <= now();
  GET DIAGNOSTICS affected = ROW_COUNT;
  RETURN affected;
END;
$$;

-- Trigger: when a new active coupon is created, expire previously active ones
CREATE OR REPLACE FUNCTION public.expire_previous_coupons_on_new()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.is_active = true THEN
    UPDATE public.vip_coupons
    SET is_active = false, updated_at = now()
    WHERE id <> NEW.id AND is_active = true;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_expire_previous_coupons
  AFTER INSERT ON public.vip_coupons
  FOR EACH ROW EXECUTE FUNCTION public.expire_previous_coupons_on_new();

-- Validate a coupon for a given email
CREATE OR REPLACE FUNCTION public.validate_coupon(_code TEXT, _email TEXT)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  c record;
  redeemed_count INTEGER;
BEGIN
  IF _code IS NULL OR length(trim(_code)) = 0 THEN
    RETURN jsonb_build_object('valid', false, 'reason', 'empty');
  END IF;

  SELECT * INTO c FROM public.vip_coupons WHERE upper(code) = upper(trim(_code)) LIMIT 1;

  IF c IS NULL THEN
    RETURN jsonb_build_object('valid', false, 'reason', 'invalid');
  END IF;

  IF c.expires_at <= now() OR c.is_active = false THEN
    RETURN jsonb_build_object('valid', false, 'reason', 'expired');
  END IF;

  IF c.usage_limit IS NOT NULL AND c.times_used >= c.usage_limit THEN
    RETURN jsonb_build_object('valid', false, 'reason', 'limit_reached');
  END IF;

  IF _email IS NOT NULL THEN
    SELECT count(*) INTO redeemed_count FROM public.vip_coupon_redemptions
    WHERE coupon_id = c.id AND lower(email) = lower(_email);
    IF redeemed_count > 0 THEN
      RETURN jsonb_build_object('valid', false, 'reason', 'already_used');
    END IF;
  END IF;

  RETURN jsonb_build_object(
    'valid', true,
    'coupon_id', c.id,
    'code', c.code,
    'discount_percent', c.discount_percent,
    'expires_at', c.expires_at
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.validate_coupon(TEXT, TEXT) TO anon, authenticated;

-- Redeem a coupon (called after successful order)
CREATE OR REPLACE FUNCTION public.redeem_coupon(_code TEXT, _email TEXT, _order_id UUID, _discount_amount NUMERIC)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  c record;
BEGIN
  IF _email IS NULL THEN
    RAISE EXCEPTION 'Email required';
  END IF;

  SELECT * INTO c FROM public.vip_coupons WHERE upper(code) = upper(trim(_code)) LIMIT 1;
  IF c IS NULL THEN
    RAISE EXCEPTION 'Invalid coupon';
  END IF;
  IF c.expires_at <= now() OR c.is_active = false THEN
    RAISE EXCEPTION 'Coupon expired';
  END IF;

  INSERT INTO public.vip_coupon_redemptions (coupon_id, email, user_id, order_id, discount_amount)
  VALUES (c.id, lower(_email), auth.uid(), _order_id, _discount_amount);

  UPDATE public.vip_coupons SET times_used = times_used + 1, updated_at = now() WHERE id = c.id;

  UPDATE public.vip_members
  SET coupons_used_count = coupons_used_count + 1, updated_at = now()
  WHERE lower(email) = lower(_email);

  RETURN jsonb_build_object('success', true, 'coupon_id', c.id);
EXCEPTION
  WHEN unique_violation THEN
    RAISE EXCEPTION 'Coupon already used by this customer';
END;
$$;

GRANT EXECUTE ON FUNCTION public.redeem_coupon(TEXT, TEXT, UUID, NUMERIC) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.expire_old_coupons() TO authenticated, service_role;
