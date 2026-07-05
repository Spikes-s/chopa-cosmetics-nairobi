
-- 1. website_links table
CREATE TABLE public.website_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  label TEXT NOT NULL CHECK (char_length(label) <= 100),
  url TEXT NOT NULL CHECK (char_length(url) <= 500),
  icon TEXT CHECK (char_length(icon) <= 50),
  color TEXT CHECK (char_length(color) <= 20),
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.website_links TO anon;
GRANT SELECT ON public.website_links TO authenticated;
GRANT ALL ON public.website_links TO service_role;

ALTER TABLE public.website_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read active website links"
  ON public.website_links FOR SELECT
  USING (is_active = true OR (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin')));

CREATE POLICY "Admins can manage website links"
  ON public.website_links FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

CREATE TRIGGER update_website_links_updated_at
  BEFORE UPDATE ON public.website_links
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

-- 2. social_links table
CREATE TYPE public.social_platform AS ENUM (
  'facebook', 'instagram', 'tiktok', 'whatsapp', 'telegram',
  'youtube', 'pinterest', 'linkedin', 'x', 'threads', 'website', 'phone', 'email'
);

CREATE TABLE public.social_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  platform public.social_platform NOT NULL UNIQUE,
  handle_or_url TEXT NOT NULL CHECK (char_length(handle_or_url) <= 300),
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.social_links TO anon;
GRANT SELECT ON public.social_links TO authenticated;
GRANT ALL ON public.social_links TO service_role;

ALTER TABLE public.social_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read active social links"
  ON public.social_links FOR SELECT
  USING (is_active = true OR (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin')));

CREATE POLICY "Admins can manage social links"
  ON public.social_links FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

CREATE TRIGGER update_social_links_updated_at
  BEFORE UPDATE ON public.social_links
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

-- 3. Set branch order: Thika main, Nairobi secondary
-- First reset any existing main flags
UPDATE public.branches SET is_main = false;
-- Set Thika as main
UPDATE public.branches SET is_main = true, display_order = 1 WHERE LOWER(name) LIKE '%thika%';
-- Set Nairobi as secondary
UPDATE public.branches SET display_order = 2 WHERE LOWER(name) LIKE '%nairobi%' AND NOT is_main;
