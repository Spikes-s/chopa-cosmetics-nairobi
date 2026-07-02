DROP POLICY IF EXISTS "Anyone can lookup referral code" ON public.referral_codes;
REVOKE SELECT ON public.referral_codes FROM anon;