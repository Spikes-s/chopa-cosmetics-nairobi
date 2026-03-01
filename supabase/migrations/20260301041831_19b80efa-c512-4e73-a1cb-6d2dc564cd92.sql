
ALTER TABLE public.orders DROP CONSTRAINT orders_order_status_check;
ALTER TABLE public.orders ADD CONSTRAINT orders_order_status_check CHECK (order_status = ANY (ARRAY['pending'::text, 'processing'::text, 'ready_for_pickup'::text, 'out_for_delivery'::text, 'completed'::text, 'cancelled'::text]));

ALTER TABLE public.orders DROP CONSTRAINT orders_payment_status_check;
ALTER TABLE public.orders ADD CONSTRAINT orders_payment_status_check CHECK (payment_status = ANY (ARRAY['pending'::text, 'paid'::text, 'confirmed'::text, 'failed'::text]));
