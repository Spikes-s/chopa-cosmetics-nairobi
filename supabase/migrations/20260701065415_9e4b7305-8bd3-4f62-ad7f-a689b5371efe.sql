
DROP POLICY IF EXISTS "Users view own loyalty" ON public.loyalty_accounts;
DROP POLICY IF EXISTS "Admins view all loyalty" ON public.loyalty_accounts;
CREATE POLICY "Users view own loyalty" ON public.loyalty_accounts FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Admins view all loyalty" ON public.loyalty_accounts FOR SELECT TO authenticated USING (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'super_admin'));

CREATE TABLE IF NOT EXISTS public.loyalty_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  points_change INTEGER NOT NULL,
  reason TEXT NOT NULL,
  order_id UUID,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.loyalty_transactions TO authenticated;
GRANT ALL ON public.loyalty_transactions TO service_role;
ALTER TABLE public.loyalty_transactions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users view own loyalty tx" ON public.loyalty_transactions;
DROP POLICY IF EXISTS "Admins view all loyalty tx" ON public.loyalty_transactions;
CREATE POLICY "Users view own loyalty tx" ON public.loyalty_transactions FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Admins view all loyalty tx" ON public.loyalty_transactions FOR SELECT TO authenticated USING (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'super_admin'));

CREATE TABLE IF NOT EXISTS public.referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  referral_code TEXT NOT NULL,
  referred_email TEXT,
  referred_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  first_order_id UUID,
  reward_points INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  converted_at TIMESTAMPTZ,
  UNIQUE(referrer_user_id, referred_email)
);
GRANT SELECT ON public.referrals TO authenticated;
GRANT ALL ON public.referrals TO service_role;
ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users view own referrals" ON public.referrals;
DROP POLICY IF EXISTS "Admins view all referrals" ON public.referrals;
CREATE POLICY "Users view own referrals" ON public.referrals FOR SELECT TO authenticated USING (referrer_user_id = auth.uid() OR referred_user_id = auth.uid());
CREATE POLICY "Admins view all referrals" ON public.referrals FOR SELECT TO authenticated USING (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'super_admin'));

CREATE TABLE IF NOT EXISTS public.referral_codes (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  code TEXT NOT NULL UNIQUE,
  total_referrals INTEGER NOT NULL DEFAULT 0,
  total_rewards_earned INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.referral_codes TO anon, authenticated;
GRANT ALL ON public.referral_codes TO service_role;
ALTER TABLE public.referral_codes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone can lookup referral code" ON public.referral_codes;
CREATE POLICY "Anyone can lookup referral code" ON public.referral_codes FOR SELECT TO anon, authenticated USING (true);

CREATE OR REPLACE FUNCTION public.award_loyalty_points(_user_id UUID, _points INTEGER, _reason TEXT, _order_id UUID DEFAULT NULL)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path='public' AS $$
BEGIN
  IF _points <= 0 THEN RAISE EXCEPTION 'Points must be positive'; END IF;
  INSERT INTO public.loyalty_accounts (user_id, points_balance, lifetime_earned)
  VALUES (_user_id, _points, _points)
  ON CONFLICT (user_id) DO UPDATE
    SET points_balance = loyalty_accounts.points_balance + _points,
        lifetime_earned = loyalty_accounts.lifetime_earned + _points,
        updated_at = now();
  INSERT INTO public.loyalty_transactions (user_id, points_change, reason, order_id)
  VALUES (_user_id, _points, _reason, _order_id);
  RETURN jsonb_build_object('success', true, 'awarded', _points);
END;$$;

CREATE OR REPLACE FUNCTION public.redeem_loyalty_points(_user_id UUID, _points INTEGER, _order_id UUID)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path='public' AS $$
DECLARE cur INTEGER;
BEGIN
  IF _points <= 0 THEN RAISE EXCEPTION 'Points must be positive'; END IF;
  SELECT points_balance INTO cur FROM public.loyalty_accounts WHERE user_id = _user_id FOR UPDATE;
  IF cur IS NULL OR cur < _points THEN RAISE EXCEPTION 'Insufficient points'; END IF;
  UPDATE public.loyalty_accounts
    SET points_balance = points_balance - _points,
        lifetime_redeemed = lifetime_redeemed + _points,
        updated_at = now()
    WHERE user_id = _user_id;
  INSERT INTO public.loyalty_transactions (user_id, points_change, reason, order_id)
  VALUES (_user_id, -_points, 'redemption', _order_id);
  RETURN jsonb_build_object('success', true, 'redeemed', _points, 'new_balance', cur - _points);
END;$$;

CREATE OR REPLACE FUNCTION public.get_or_create_referral_code(_user_id UUID)
RETURNS TEXT LANGUAGE plpgsql SECURITY DEFINER SET search_path='public' AS $$
DECLARE existing TEXT; new_code TEXT;
BEGIN
  SELECT code INTO existing FROM public.referral_codes WHERE user_id = _user_id;
  IF existing IS NOT NULL THEN RETURN existing; END IF;
  new_code := 'CHOPA' || upper(substr(md5(_user_id::text || now()::text), 1, 6));
  INSERT INTO public.referral_codes (user_id, code) VALUES (_user_id, new_code)
    ON CONFLICT (user_id) DO NOTHING;
  SELECT code INTO new_code FROM public.referral_codes WHERE user_id = _user_id;
  RETURN new_code;
END;$$;

CREATE OR REPLACE FUNCTION public.record_referral_signup(_referral_code TEXT, _referred_user_id UUID, _referred_email TEXT)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path='public' AS $$
DECLARE ref_user UUID;
BEGIN
  SELECT user_id INTO ref_user FROM public.referral_codes WHERE code = upper(trim(_referral_code));
  IF ref_user IS NULL OR ref_user = _referred_user_id THEN
    RETURN jsonb_build_object('success', false);
  END IF;
  INSERT INTO public.referrals (referrer_user_id, referral_code, referred_email, referred_user_id, status)
  VALUES (ref_user, upper(trim(_referral_code)), lower(_referred_email), _referred_user_id, 'pending')
  ON CONFLICT (referrer_user_id, referred_email) DO NOTHING;
  RETURN jsonb_build_object('success', true);
END;$$;

CREATE OR REPLACE FUNCTION public.reward_referral_on_first_order(_referred_user_id UUID, _order_id UUID)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path='public' AS $$
DECLARE r record; reward INTEGER := 500;
BEGIN
  SELECT * INTO r FROM public.referrals
    WHERE referred_user_id = _referred_user_id AND status = 'pending' LIMIT 1;
  IF r IS NULL THEN RETURN jsonb_build_object('success', false); END IF;
  UPDATE public.referrals SET status='rewarded', first_order_id=_order_id,
    reward_points=reward, converted_at=now() WHERE id = r.id;
  UPDATE public.referral_codes SET total_referrals = total_referrals + 1,
    total_rewards_earned = total_rewards_earned + reward WHERE user_id = r.referrer_user_id;
  PERFORM public.award_loyalty_points(r.referrer_user_id, reward, 'referral_reward', _order_id);
  PERFORM public.award_loyalty_points(_referred_user_id, reward/2, 'referral_bonus', _order_id);
  RETURN jsonb_build_object('success', true, 'reward', reward);
END;$$;

CREATE OR REPLACE FUNCTION public.is_active_vip(_email TEXT)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path='public' AS $$
  SELECT EXISTS(
    SELECT 1 FROM public.vip_members
    WHERE lower(email) = lower(_email)
      AND status = 'active'
      AND (paid_until IS NULL OR paid_until > now() OR tier = 'free')
  );
$$;
GRANT EXECUTE ON FUNCTION public.is_active_vip(TEXT) TO anon, authenticated;
