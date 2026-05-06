
-- Update the trigger function to generate receipt numbers for ALL orders
CREATE OR REPLACE FUNCTION public.generate_receipt_number()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.receipt_number IS NULL THEN
    IF NEW.sales_channel = 'pos' THEN
      NEW.receipt_number := 'REC-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(NEXTVAL('receipt_seq')::TEXT, 4, '0');
    ELSE
      NEW.receipt_number := 'ORD-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(NEXTVAL('receipt_seq')::TEXT, 4, '0');
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;

-- Ensure trigger exists on orders table
DROP TRIGGER IF EXISTS generate_receipt_number_trigger ON public.orders;
CREATE TRIGGER generate_receipt_number_trigger
  BEFORE INSERT ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.generate_receipt_number();
