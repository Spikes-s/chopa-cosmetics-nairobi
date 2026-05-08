
-- Security events table for audit logging
CREATE TABLE public.security_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type text NOT NULL,
  severity text NOT NULL DEFAULT 'info',
  user_id uuid,
  target_user_id uuid,
  ip_address text,
  user_agent text,
  details jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.security_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admins can view security events"
  ON public.security_events FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "No public access to security events"
  ON public.security_events FOR ALL
  TO anon
  USING (false);

CREATE INDEX idx_security_events_created ON public.security_events(created_at DESC);
CREATE INDEX idx_security_events_type ON public.security_events(event_type);

-- Security definer function to log events (callable from edge functions)
CREATE OR REPLACE FUNCTION public.log_security_event(
  _event_type text,
  _severity text DEFAULT 'info',
  _user_id uuid DEFAULT NULL,
  _target_user_id uuid DEFAULT NULL,
  _ip_address text DEFAULT NULL,
  _user_agent text DEFAULT NULL,
  _details jsonb DEFAULT '{}'::jsonb
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.security_events (event_type, severity, user_id, target_user_id, ip_address, user_agent, details)
  VALUES (_event_type, _severity, _user_id, _target_user_id, _ip_address, _user_agent, _details);
END;
$$;

-- Founder protection table
CREATE TABLE public.founder_protection (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  protected_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.founder_protection ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admins can view founder protection"
  ON public.founder_protection FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'super_admin'::app_role));

-- Trigger to prevent demotion/deletion of founder super admin
CREATE OR REPLACE FUNCTION public.protect_founder_role()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.role = 'super_admin' AND EXISTS (
    SELECT 1 FROM public.founder_protection WHERE user_id = OLD.user_id
  ) THEN
    RAISE EXCEPTION 'Cannot remove super_admin role from the founder admin';
  END IF;
  RETURN OLD;
END;
$$;

CREATE TRIGGER prevent_founder_demotion
  BEFORE DELETE ON public.user_roles
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_founder_role();

-- Also prevent UPDATE that would change the role away from super_admin for founder
CREATE OR REPLACE FUNCTION public.protect_founder_role_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.role = 'super_admin' AND NEW.role != 'super_admin' AND EXISTS (
    SELECT 1 FROM public.founder_protection WHERE user_id = OLD.user_id
  ) THEN
    RAISE EXCEPTION 'Cannot change super_admin role of the founder admin';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER prevent_founder_role_change
  BEFORE UPDATE ON public.user_roles
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_founder_role_update();

-- Insert policy for security events (system/admin can insert)
CREATE POLICY "Admins can insert security events"
  ON public.security_events FOR INSERT
  TO authenticated
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));
