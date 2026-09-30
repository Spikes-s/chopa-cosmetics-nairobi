CREATE OR REPLACE FUNCTION public.award_loyalty_on_order_paid()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE ksh_per_point integer; pts integer; prior_paid integer;
BEGIN
  IF NEW.user_id IS NULL THEN RETURN NEW; END IF;
  IF COALESCE(NEW.payment_status,'') NOT IN ('paid','confirmed') THEN RETURN NEW; END IF;
  IF COALESCE(OLD.payment_status,'') IN ('paid','confirmed') THEN RETURN NEW; END IF;
  IF EXISTS (SELECT 1 FROM public.loyalty_transactions WHERE order_id = NEW.id AND reason = 'order_purchase') THEN RETURN NEW; END IF;

  SELECT GREATEST(1, COALESCE(NULLIF(value,'')::int, 10)) INTO ksh_per_point
    FROM public.site_settings WHERE key = 'loyalty_earn_ksh_per_point';
  ksh_per_point := COALESCE(ksh_per_point, 10);
  pts := floor(COALESCE(NEW.total,0) / ksh_per_point);
  IF pts > 0 THEN
    PERFORM public.award_loyalty_points(NEW.user_id, pts, 'order_purchase', NEW.id);
  END IF;

  SELECT count(*) INTO prior_paid FROM public.orders
    WHERE user_id = NEW.user_id AND id <> NEW.id AND payment_status IN ('paid','confirmed');
  IF prior_paid = 0 THEN
    BEGIN
      PERFORM public.reward_referral_on_first_order(NEW.user_id, NEW.id);
    EXCEPTION WHEN others THEN NULL;
    END;
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_award_loyalty_on_paid ON public.orders;
CREATE TRIGGER trg_award_loyalty_on_paid AFTER UPDATE OF payment_status ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.award_loyalty_on_order_paid();