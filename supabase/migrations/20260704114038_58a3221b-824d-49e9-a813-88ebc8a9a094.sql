
-- Harden loyalty RPCs: require caller identity match, restrict execute to service_role
CREATE OR REPLACE FUNCTION public.award_loyalty_points(_user_id uuid, _points integer, _reason text, _order_id uuid DEFAULT NULL::uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
END;$function$;

CREATE OR REPLACE FUNCTION public.redeem_loyalty_points(_user_id uuid, _points integer, _order_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
END;$function$;

REVOKE EXECUTE ON FUNCTION public.award_loyalty_points(uuid, integer, text, uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.redeem_loyalty_points(uuid, integer, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.award_loyalty_points(uuid, integer, text, uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.redeem_loyalty_points(uuid, integer, uuid) TO service_role;

-- Harden referral RPCs: require caller identity matches target user
CREATE OR REPLACE FUNCTION public.record_referral_signup(_referral_code text, _referred_user_id uuid, _referred_email text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE ref_user UUID;
BEGIN
  IF auth.uid() IS NULL OR auth.uid() <> _referred_user_id THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;
  SELECT user_id INTO ref_user FROM public.referral_codes WHERE code = upper(trim(_referral_code));
  IF ref_user IS NULL OR ref_user = _referred_user_id THEN
    RETURN jsonb_build_object('success', false);
  END IF;
  INSERT INTO public.referrals (referrer_user_id, referral_code, referred_email, referred_user_id, status)
  VALUES (ref_user, upper(trim(_referral_code)), lower(_referred_email), _referred_user_id, 'pending')
  ON CONFLICT (referrer_user_id, referred_email) DO NOTHING;
  RETURN jsonb_build_object('success', true);
END;$function$;

CREATE OR REPLACE FUNCTION public.get_or_create_referral_code(_user_id uuid)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE existing TEXT; new_code TEXT;
BEGIN
  IF auth.uid() IS NULL OR (auth.uid() <> _user_id AND NOT (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role))) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;
  SELECT code INTO existing FROM public.referral_codes WHERE user_id = _user_id;
  IF existing IS NOT NULL THEN RETURN existing; END IF;
  new_code := 'CHOPA' || upper(substr(md5(_user_id::text || now()::text), 1, 6));
  INSERT INTO public.referral_codes (user_id, code) VALUES (_user_id, new_code)
    ON CONFLICT (user_id) DO NOTHING;
  SELECT code INTO new_code FROM public.referral_codes WHERE user_id = _user_id;
  RETURN new_code;
END;$function$;

-- Lock down security event logging so users cannot spoof audit rows
REVOKE EXECUTE ON FUNCTION public.log_security_event(text, text, uuid, uuid, text, text, jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.log_security_event(text, text, uuid, uuid, text, text, jsonb) TO service_role;
