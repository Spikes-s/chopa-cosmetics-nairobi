
-- 1. Enable scheduling extensions
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- 2. Seed loyalty & referral rate defaults (idempotent)
INSERT INTO public.site_settings (key, value) VALUES
  ('loyalty_earn_ksh_per_point', '10'),
  ('loyalty_redeem_points_per_ksh', '10'),
  ('referral_reward_points', '500'),
  ('referral_bonus_points', '250')
ON CONFLICT (key) DO NOTHING;

-- 3. Update reward_referral_on_first_order to read from settings
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
BEGIN
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

-- 4. Audit triggers
CREATE OR REPLACE FUNCTION public.audit_order_change()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path='public' AS $$
BEGIN
  IF OLD.order_status IS DISTINCT FROM NEW.order_status OR OLD.payment_status IS DISTINCT FROM NEW.payment_status THEN
    PERFORM public.log_security_event(
      'order_status_changed', 'medium', auth.uid(), NULL, NULL, NULL,
      jsonb_build_object(
        'order_id', NEW.id,
        'receipt', NEW.receipt_number,
        'old_status', OLD.order_status, 'new_status', NEW.order_status,
        'old_payment', OLD.payment_status, 'new_payment', NEW.payment_status
      )
    );
  END IF;
  RETURN NEW;
END;$$;
DROP TRIGGER IF EXISTS trg_audit_order_change ON public.orders;
CREATE TRIGGER trg_audit_order_change AFTER UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.audit_order_change();

CREATE OR REPLACE FUNCTION public.audit_product_price_change()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path='public' AS $$
BEGIN
  IF OLD.retail_price IS DISTINCT FROM NEW.retail_price OR OLD.wholesale_price IS DISTINCT FROM NEW.wholesale_price THEN
    PERFORM public.log_security_event(
      'price_changed', 'medium', auth.uid(), NULL, NULL, NULL,
      jsonb_build_object(
        'product_id', NEW.id, 'name', NEW.name,
        'old_retail', OLD.retail_price, 'new_retail', NEW.retail_price,
        'old_wholesale', OLD.wholesale_price, 'new_wholesale', NEW.wholesale_price
      )
    );
  END IF;
  RETURN NEW;
END;$$;
DROP TRIGGER IF EXISTS trg_audit_product_price ON public.products;
CREATE TRIGGER trg_audit_product_price AFTER UPDATE ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.audit_product_price_change();

CREATE OR REPLACE FUNCTION public.audit_vip_member_change()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path='public' AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND (
    OLD.status IS DISTINCT FROM NEW.status OR
    OLD.tier IS DISTINCT FROM NEW.tier OR
    OLD.payment_status IS DISTINCT FROM NEW.payment_status
  ) THEN
    PERFORM public.log_security_event(
      'vip_member_changed', 'medium', auth.uid(), NULL, NULL, NULL,
      jsonb_build_object(
        'email', NEW.email,
        'old_status', OLD.status, 'new_status', NEW.status,
        'old_tier', OLD.tier, 'new_tier', NEW.tier,
        'old_payment', OLD.payment_status, 'new_payment', NEW.payment_status
      )
    );
  END IF;
  RETURN NEW;
END;$$;
DROP TRIGGER IF EXISTS trg_audit_vip_member ON public.vip_members;
CREATE TRIGGER trg_audit_vip_member AFTER UPDATE ON public.vip_members
  FOR EACH ROW EXECUTE FUNCTION public.audit_vip_member_change();

CREATE OR REPLACE FUNCTION public.audit_coupon_created()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path='public' AS $$
BEGIN
  PERFORM public.log_security_event(
    'coupon_created', 'medium', auth.uid(), NULL, NULL, NULL,
    jsonb_build_object(
      'coupon_id', NEW.id, 'code', NEW.code,
      'discount_percent', NEW.discount_percent, 'expires_at', NEW.expires_at
    )
  );
  RETURN NEW;
END;$$;
DROP TRIGGER IF EXISTS trg_audit_coupon_created ON public.vip_coupons;
CREATE TRIGGER trg_audit_coupon_created AFTER INSERT ON public.vip_coupons
  FOR EACH ROW EXECUTE FUNCTION public.audit_coupon_created();
