
-- 1. Tighten vip_members INSERT policy: prevent tier/payment_status/plan/mpesa bypass on public signup
DROP POLICY IF EXISTS "Anyone can sign up as VIP" ON public.vip_members;
CREATE POLICY "Anyone can sign up as VIP"
  ON public.vip_members FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    email IS NOT NULL
    AND length(email) <= 255
    AND length(coalesce(full_name,'')) <= 100
    AND status = 'active'
    AND coupons_used_count = 0
    AND (tier IS NULL OR tier = 'free')
    AND (payment_status IS NULL OR payment_status = 'free')
    AND paid_until IS NULL
    AND plan_id IS NULL
    AND mpesa_code IS NULL
  );

-- 2. Harden reward_referral_on_first_order: verify caller, order ownership, and one-shot use
CREATE OR REPLACE FUNCTION public.reward_referral_on_first_order(_referred_user_id uuid, _order_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  r record;
  reward INTEGER;
  bonus INTEGER;
  ord record;
BEGIN
  -- Only trusted server (service_role) OR the referred user themselves OR admin may invoke.
  IF NOT (
    (auth.jwt() ->> 'role') = 'service_role'
    OR auth.uid() = _referred_user_id
    OR has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'super_admin'::app_role)
  ) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  -- Verify the order exists, belongs to the referred user, and is completed/paid
  SELECT id, user_id, order_status, payment_status
    INTO ord
  FROM public.orders
  WHERE id = _order_id;

  IF ord.id IS NULL THEN
    RAISE EXCEPTION 'Order not found';
  END IF;
  IF ord.user_id IS DISTINCT FROM _referred_user_id THEN
    RAISE EXCEPTION 'Order does not belong to referred user';
  END IF;
  IF COALESCE(ord.payment_status, '') NOT IN ('paid', 'confirmed') THEN
    RAISE EXCEPTION 'Order not paid';
  END IF;

  -- Prevent reusing the same order for multiple referral payouts
  IF EXISTS (SELECT 1 FROM public.referrals WHERE first_order_id = _order_id) THEN
    RETURN jsonb_build_object('success', false, 'reason', 'already_rewarded_for_order');
  END IF;

  SELECT COALESCE(NULLIF(value,'')::int, 500) INTO reward
    FROM public.site_settings WHERE key = 'referral_reward_points';
  SELECT COALESCE(NULLIF(value,'')::int, 250) INTO bonus
    FROM public.site_settings WHERE key = 'referral_bonus_points';

  SELECT * INTO r FROM public.referrals
    WHERE referred_user_id = _referred_user_id AND status = 'pending' LIMIT 1;
  IF r IS NULL THEN RETURN jsonb_build_object('success', false); END IF;

  UPDATE public.referrals SET status='rewarded', first_order_id=_order_id,
    reward_points=reward, converted_at=now() WHERE id = r.id;
  UPDATE public.referral_codes SET total_referrals = total_referrals + 1,
    total_rewards_earned = total_rewards_earned + reward WHERE user_id = r.referrer_user_id;
  PERFORM public.award_loyalty_points(r.referrer_user_id, reward, 'referral_reward', _order_id);
  IF bonus > 0 THEN
    PERFORM public.award_loyalty_points(_referred_user_id, bonus, 'referral_bonus', _order_id);
  END IF;
  RETURN jsonb_build_object('success', true, 'reward', reward, 'bonus', bonus);
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.reward_referral_on_first_order(uuid, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.reward_referral_on_first_order(uuid, uuid) TO service_role;

-- 3. Restrict lockout RPCs so attackers can't weaponize them from the client.
-- These will now be invoked from a trusted edge function (auth-login) using service_role.
REVOKE EXECUTE ON FUNCTION public.record_failed_login(text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.check_login_attempt(text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.reset_login_attempts(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.record_failed_login(text) TO service_role;
GRANT EXECUTE ON FUNCTION public.check_login_attempt(text) TO service_role;
GRANT EXECUTE ON FUNCTION public.reset_login_attempts(text) TO service_role;
