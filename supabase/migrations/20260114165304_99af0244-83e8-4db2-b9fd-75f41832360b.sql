-- Add terms acceptance fields to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS terms_accepted_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
ADD COLUMN IF NOT EXISTS terms_version TEXT DEFAULT NULL;

-- Create a site_terms table to store the current terms version and content
CREATE TABLE IF NOT EXISTS public.site_terms (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  version TEXT NOT NULL UNIQUE,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  is_active BOOLEAN NOT NULL DEFAULT false
);

-- Enable RLS
ALTER TABLE public.site_terms ENABLE ROW LEVEL SECURITY;

-- Everyone can read active terms
CREATE POLICY "Anyone can view active terms" 
ON public.site_terms 
FOR SELECT 
USING (is_active = true);

-- Only admins can manage terms
CREATE POLICY "Admins can manage terms" 
ON public.site_terms 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND role IN ('admin', 'super_admin')
  )
);

-- Insert the initial terms version
INSERT INTO public.site_terms (version, content, is_active) VALUES (
  '1.0',
  'TERMS_PLACEHOLDER',
  true
);