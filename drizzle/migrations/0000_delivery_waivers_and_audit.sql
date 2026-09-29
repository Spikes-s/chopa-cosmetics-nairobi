ALTER TABLE public.delivery_locations
  ADD COLUMN IF NOT EXISTS waiver_threshold numeric,
  ADD COLUMN IF NOT EXISTS waiver_fee numeric NOT NULL DEFAULT 0;

CREATE TABLE public.delivery_location_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id uuid,
  action text NOT NULL,
  changed_by uuid,
  changed_by_email text,
  old_values jsonb,
  new_values jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.delivery_location_audit TO authenticated;
GRANT ALL ON public.delivery_location_audit TO service_role;
ALTER TABLE public.delivery_location_audit ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read delivery audit" ON public.delivery_location_audit
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));
CREATE INDEX ON public.delivery_location_audit (created_at DESC);

CREATE OR REPLACE FUNCTION public.audit_delivery_location_change()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _email text;
BEGIN
  SELECT email INTO _email FROM auth.users WHERE id = auth.uid();
  IF TG_OP = 'INSERT' THEN
    INSERT INTO delivery_location_audit(location_id, action, changed_by, changed_by_email, new_values)
    VALUES (NEW.id, 'created', auth.uid(), _email, jsonb_build_object('name',NEW.name,'region',NEW.region,'price',NEW.price,'waiver_threshold',NEW.waiver_threshold,'waiver_fee',NEW.waiver_fee,'is_active',NEW.is_active));
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    IF (OLD.name, OLD.region, OLD.price, OLD.waiver_threshold, OLD.waiver_fee, OLD.is_active)
       IS DISTINCT FROM (NEW.name, NEW.region, NEW.price, NEW.waiver_threshold, NEW.waiver_fee, NEW.is_active) THEN
      INSERT INTO delivery_location_audit(location_id, action, changed_by, changed_by_email, old_values, new_values)
      VALUES (NEW.id, 'updated', auth.uid(), _email,
        jsonb_build_object('name',OLD.name,'region',OLD.region,'price',OLD.price,'waiver_threshold',OLD.waiver_threshold,'waiver_fee',OLD.waiver_fee,'is_active',OLD.is_active),
        jsonb_build_object('name',NEW.name,'region',NEW.region,'price',NEW.price,'waiver_threshold',NEW.waiver_threshold,'waiver_fee',NEW.waiver_fee,'is_active',NEW.is_active));
    END IF;
    RETURN NEW;
  ELSE
    INSERT INTO delivery_location_audit(location_id, action, changed_by, changed_by_email, old_values)
    VALUES (OLD.id, 'deleted', auth.uid(), _email, jsonb_build_object('name',OLD.name,'region',OLD.region,'price',OLD.price));
    RETURN OLD;
  END IF;
END; $$;

CREATE TRIGGER trg_audit_delivery_locations
AFTER INSERT OR UPDATE OR DELETE ON public.delivery_locations
FOR EACH ROW EXECUTE FUNCTION public.audit_delivery_location_change();