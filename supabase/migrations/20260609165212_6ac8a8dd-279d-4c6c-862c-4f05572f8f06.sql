
-- 1. vip_plans table
CREATE TABLE public.vip_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  price_ksh numeric(10,2) NOT NULL CHECK (price_ksh >= 0),
  duration_days integer NOT NULL CHECK (duration_days > 0),
  perks jsonb NOT NULL DEFAULT '[]'::jsonb,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.vip_plans TO anon, authenticated;
GRANT ALL ON public.vip_plans TO service_role;

ALTER TABLE public.vip_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view active plans" ON public.vip_plans
  FOR SELECT TO anon, authenticated USING (is_active = true);

CREATE POLICY "Admins can view all plans" ON public.vip_plans
  FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Admins can manage plans" ON public.vip_plans
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));

CREATE TRIGGER vip_plans_updated_at BEFORE UPDATE ON public.vip_plans
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- 2. vip_members new columns
ALTER TABLE public.vip_members
  ADD COLUMN IF NOT EXISTS tier text NOT NULL DEFAULT 'free',
  ADD COLUMN IF NOT EXISTS plan_id uuid REFERENCES public.vip_plans(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS paid_until timestamptz,
  ADD COLUMN IF NOT EXISTS mpesa_code text,
  ADD COLUMN IF NOT EXISTS payment_status text NOT NULL DEFAULT 'free',
  ADD COLUMN IF NOT EXISTS phone text;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'vip_members_payment_status_check') THEN
    ALTER TABLE public.vip_members ADD CONSTRAINT vip_members_payment_status_check
      CHECK (payment_status IN ('free','pending','paid','expired'));
  END IF;
END $$;

-- 3. Seed default plans
INSERT INTO public.vip_plans (name, slug, price_ksh, duration_days, perks, sort_order) VALUES
  ('Silver VIP', 'silver', 200, 30, '["5% off all orders","Monthly VIP coupon","Early access to flash sales"]'::jsonb, 1),
  ('Gold VIP', 'gold', 500, 90, '["10% off all orders","Bi-weekly exclusive coupons","Priority support","Early access to new arrivals"]'::jsonb, 2),
  ('Platinum VIP', 'platinum', 1500, 365, '["15% off all orders","Weekly exclusive coupons","Free standard delivery","VIP-only product drops","Birthday gift"]'::jsonb, 3)
ON CONFLICT (slug) DO NOTHING;

-- 4. Settings flag
INSERT INTO public.site_settings (key, value) VALUES ('vip_paid_enabled', 'false')
ON CONFLICT (key) DO NOTHING;
