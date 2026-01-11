-- Add additional_images column to products table for multiple images support
ALTER TABLE public.products 
ADD COLUMN IF NOT EXISTS additional_images TEXT[] DEFAULT '{}';

-- Add barcode column for POS product scanning
ALTER TABLE public.products 
ADD COLUMN IF NOT EXISTS barcode TEXT;

-- Create index on barcode for fast lookups
CREATE INDEX IF NOT EXISTS idx_products_barcode ON public.products(barcode);

-- Add sales_channel to orders to distinguish POS vs online orders
ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS sales_channel TEXT DEFAULT 'online';

-- Add cashier_id for POS sales tracking
ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS cashier_id UUID REFERENCES auth.users(id);

-- Add discount fields to orders
ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS discount_amount NUMERIC DEFAULT 0;
ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS discount_type TEXT; -- 'percentage' or 'fixed'
ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS tax_amount NUMERIC DEFAULT 0;

-- Add payment_method field for differentiating cash vs mpesa in POS
ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS payment_method TEXT DEFAULT 'mpesa';

-- Add change_given for cash payments
ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS change_given NUMERIC DEFAULT 0;

-- Add receipt_number for POS receipts
ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS receipt_number TEXT;

-- Create function to generate receipt numbers
CREATE OR REPLACE FUNCTION generate_receipt_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.sales_channel = 'pos' AND NEW.receipt_number IS NULL THEN
    NEW.receipt_number := 'REC-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(NEXTVAL('receipt_seq')::TEXT, 4, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create sequence for receipt numbers
CREATE SEQUENCE IF NOT EXISTS receipt_seq START 1;

-- Create trigger for auto-generating receipt numbers
DROP TRIGGER IF EXISTS auto_receipt_number ON public.orders;
CREATE TRIGGER auto_receipt_number
  BEFORE INSERT ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION generate_receipt_number();