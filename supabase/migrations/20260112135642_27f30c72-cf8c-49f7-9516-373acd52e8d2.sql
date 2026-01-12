-- Add cost_price for profit tracking (Prompt 13)
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS cost_price NUMERIC DEFAULT 0;

-- Create announcements table (Prompt 7)
CREATE TABLE IF NOT EXISTS public.announcements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    created_by UUID REFERENCES auth.users(id),
    target_audience TEXT DEFAULT 'all',
    is_active BOOLEAN DEFAULT true,
    sent_to_email BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on announcements
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;

-- Announcements policies
CREATE POLICY "Admins can manage announcements"
ON public.announcements FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Customers can view active announcements"
ON public.announcements FOR SELECT
TO authenticated
USING (is_active = true);

-- Create vouchers table (Prompt 14 - POS Vouchers)
CREATE TABLE IF NOT EXISTS public.vouchers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    voucher_name TEXT NOT NULL,
    source_name TEXT NOT NULL,
    product_id UUID REFERENCES public.products(id),
    quantity INTEGER NOT NULL DEFAULT 1,
    notes TEXT,
    received_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on vouchers
ALTER TABLE public.vouchers ENABLE ROW LEVEL SECURITY;

-- Voucher policies
CREATE POLICY "Admins can manage vouchers"
ON public.vouchers FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Create site_controls table for super admin features (Prompt 16)
CREATE TABLE IF NOT EXISTS public.site_controls (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key TEXT UNIQUE NOT NULL,
    value TEXT,
    updated_by UUID REFERENCES auth.users(id),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on site_controls
ALTER TABLE public.site_controls ENABLE ROW LEVEL SECURITY;

-- Site controls policies - admin only for now
CREATE POLICY "Admins can manage site controls"
ON public.site_controls FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Public can read site status"
ON public.site_controls FOR SELECT
USING (key = 'site_status');

-- Insert default site status
INSERT INTO public.site_controls (key, value) 
VALUES ('site_status', 'active') 
ON CONFLICT (key) DO NOTHING;

-- Add map_location to site_settings for admin to manage (Prompt 12)
INSERT INTO public.site_settings (key, value)
VALUES ('map_location', 'https://maps.app.goo.gl/example')
ON CONFLICT (key) DO NOTHING;

-- Enable realtime for new tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.announcements;
ALTER PUBLICATION supabase_realtime ADD TABLE public.vouchers;