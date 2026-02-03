-- Create branches table for multiple locations
CREATE TABLE public.branches (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  address TEXT,
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  contact_phone TEXT,
  contact_email TEXT,
  is_main BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  service_radius_km DECIMAL(5, 2),
  service_area_polygon JSONB,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.branches ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Anyone can view active branches"
ON public.branches
FOR SELECT
USING (is_active = true);

CREATE POLICY "Admins can manage branches"
ON public.branches
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Trigger for updated_at
CREATE TRIGGER update_branches_updated_at
  BEFORE UPDATE ON public.branches
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- Enable realtime for branches
ALTER PUBLICATION supabase_realtime ADD TABLE public.branches;

-- Insert default main branch
INSERT INTO public.branches (name, address, latitude, longitude, is_main, is_active)
VALUES (
  'Main Branch',
  'KAKA HOUSE – OTC, along Racecourse Road, opposite Kaka Travellers Sacco',
  -1.2864,
  36.8172,
  true,
  true
);

-- Insert Thika branch
INSERT INTO public.branches (name, address, latitude, longitude, is_main, is_active)
VALUES (
  'Thika Branch',
  'Opposite Family Bank, Thika',
  -1.0334,
  37.0693,
  false,
  true
);