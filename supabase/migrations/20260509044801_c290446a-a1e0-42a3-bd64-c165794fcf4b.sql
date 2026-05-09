
-- Account lockout tracking
CREATE TABLE IF NOT EXISTS public.account_lockouts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL UNIQUE,
  failed_count integer NOT NULL DEFAULT 0,
  first_failed_at timestamptz,
  last_failed_at timestamptz,
  locked_until timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_account_lockouts_email ON public.account_lockouts (lower(email));

ALTER TABLE public.account_lockouts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Super admins can view lockouts" ON public.account_lockouts;
CREATE POLICY "Super admins can view lockouts"
  ON public.account_lockouts FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'super_admin'::app_role));

DROP POLICY IF EXISTS "No direct write on lockouts" ON public.account_lockouts;
CREATE POLICY "No direct write on lockouts"
  ON public.account_lockouts FOR ALL
  TO public
  USING (false) WITH CHECK (false);

-- Check whether email is currently locked
CREATE OR REPLACE FUNCTION public.check_login_attempt(_email text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  rec record;
  remaining_seconds integer;
BEGIN
  SELECT * INTO rec FROM public.account_lockouts WHERE lower(email) = lower(_email);
  IF rec IS NULL THEN
    RETURN jsonb_build_object('locked', false, 'failed_count', 0);
  END IF;
  IF rec.locked_until IS NOT NULL AND rec.locked_until > now() THEN
    remaining_seconds := EXTRACT(EPOCH FROM (rec.locked_until - now()))::integer;
    RETURN jsonb_build_object(
      'locked', true,
      'failed_count', rec.failed_count,
      'locked_until', rec.locked_until,
      'remaining_seconds', remaining_seconds
    );
  END IF;
  RETURN jsonb_build_object('locked', false, 'failed_count', rec.failed_count);
END;
$$;

-- Record a failed login attempt; auto-lock after 5 failures in 15 minutes
CREATE OR REPLACE FUNCTION public.record_failed_login(_email text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  rec record;
  new_count integer;
  new_lock timestamptz;
  window_start timestamptz;
BEGIN
  SELECT * INTO rec FROM public.account_lockouts WHERE lower(email) = lower(_email);

  IF rec IS NULL THEN
    INSERT INTO public.account_lockouts (email, failed_count, first_failed_at, last_failed_at)
    VALUES (lower(_email), 1, now(), now())
    RETURNING * INTO rec;
    new_count := 1;
  ELSE
    -- Reset counter if window expired (>15 minutes since first failure)
    IF rec.first_failed_at IS NOT NULL AND rec.first_failed_at < now() - interval '15 minutes' THEN
      new_count := 1;
      window_start := now();
    ELSE
      new_count := rec.failed_count + 1;
      window_start := COALESCE(rec.first_failed_at, now());
    END IF;

    new_lock := NULL;
    IF new_count >= 5 THEN
      new_lock := now() + interval '15 minutes';
    END IF;

    UPDATE public.account_lockouts
    SET failed_count = new_count,
        first_failed_at = window_start,
        last_failed_at = now(),
        locked_until = COALESCE(new_lock, rec.locked_until),
        updated_at = now()
    WHERE id = rec.id
    RETURNING * INTO rec;
  END IF;

  -- Audit
  PERFORM public.log_security_event(
    'login_failed',
    CASE WHEN new_count >= 5 THEN 'high' ELSE 'medium' END,
    NULL, NULL, NULL, NULL,
    jsonb_build_object('email', lower(_email), 'failed_count', new_count, 'locked', new_count >= 5)
  );

  RETURN jsonb_build_object('failed_count', new_count, 'locked', new_count >= 5, 'locked_until', rec.locked_until);
END;
$$;

-- Successful login — reset counter
CREATE OR REPLACE FUNCTION public.reset_login_attempts(_email text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  UPDATE public.account_lockouts
  SET failed_count = 0, first_failed_at = NULL, locked_until = NULL, updated_at = now()
  WHERE lower(email) = lower(_email);
END;
$$;

-- Super admin manual unlock
CREATE OR REPLACE FUNCTION public.admin_unlock_account(_email text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NOT has_role(auth.uid(), 'super_admin'::app_role) THEN
    RAISE EXCEPTION 'Only super admins can unlock accounts';
  END IF;

  UPDATE public.account_lockouts
  SET failed_count = 0, first_failed_at = NULL, locked_until = NULL, updated_at = now()
  WHERE lower(email) = lower(_email);

  PERFORM public.log_security_event(
    'account_unlocked', 'high', auth.uid(), NULL, NULL, NULL,
    jsonb_build_object('email', lower(_email))
  );

  RETURN jsonb_build_object('success', true, 'email', lower(_email));
END;
$$;

-- Allow anon + authenticated callers to use the check/record/reset helpers
GRANT EXECUTE ON FUNCTION public.check_login_attempt(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.record_failed_login(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.reset_login_attempts(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_unlock_account(text) TO authenticated;
