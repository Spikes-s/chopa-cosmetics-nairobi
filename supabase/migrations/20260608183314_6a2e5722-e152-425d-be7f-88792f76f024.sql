
CREATE OR REPLACE FUNCTION public.audit_user_role_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  actor uuid := auth.uid();
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM public.log_security_event(
      'role_assigned', 'high', actor, NEW.user_id, NULL, NULL,
      jsonb_build_object('role', NEW.role::text, 'target_user_id', NEW.user_id)
    );
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.role IS DISTINCT FROM NEW.role THEN
      PERFORM public.log_security_event(
        'role_changed',
        CASE WHEN OLD.role = 'super_admin' OR NEW.role = 'super_admin' THEN 'critical' ELSE 'high' END,
        actor, NEW.user_id, NULL, NULL,
        jsonb_build_object('old_role', OLD.role::text, 'new_role', NEW.role::text, 'target_user_id', NEW.user_id)
      );
    END IF;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    PERFORM public.log_security_event(
      'role_revoked',
      CASE WHEN OLD.role = 'super_admin' THEN 'critical' ELSE 'high' END,
      actor, OLD.user_id, NULL, NULL,
      jsonb_build_object('role', OLD.role::text, 'target_user_id', OLD.user_id)
    );
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_audit_user_role_change ON public.user_roles;
CREATE TRIGGER trg_audit_user_role_change
AFTER INSERT OR UPDATE OR DELETE ON public.user_roles
FOR EACH ROW EXECUTE FUNCTION public.audit_user_role_change();
