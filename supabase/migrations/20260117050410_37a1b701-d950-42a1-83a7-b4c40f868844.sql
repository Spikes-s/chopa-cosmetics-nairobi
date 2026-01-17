-- Create categories table to allow dynamic category management
CREATE TABLE public.categories (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL UNIQUE,
  slug text NOT NULL UNIQUE,
  image_url text,
  subcategories text[] NOT NULL DEFAULT '{}',
  display_order integer DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

-- Anyone can view categories
CREATE POLICY "Anyone can view active categories" 
ON public.categories 
FOR SELECT 
USING (is_active = true);

-- Admins can manage categories
CREATE POLICY "Admins can manage categories"
ON public.categories
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Add trigger for updated_at
CREATE TRIGGER update_categories_updated_at
BEFORE UPDATE ON public.categories
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at();

-- Insert default categories
INSERT INTO public.categories (name, slug, subcategories, display_order) VALUES
('Hair Extensions', 'hair-extensions', ARRAY['Braids', 'Crotchets', 'Weaves', 'Wigs', 'Brazilian Wool', 'Extensions'], 1),
('Hair Care', 'hair-care', ARRAY['Shampoos', 'Hair Foods', 'Anti-Dandruff', 'Anti-Breakage', 'Hair Oils', 'Hair Gels', 'Hair Chemicals'], 2),
('Face & Skin Care', 'face-skin-care', ARRAY['Face Creams', 'Sun Creams', 'Serums'], 3),
('Makeup', 'makeup', ARRAY['Lipsticks', 'Lip Gloss', 'Compact Powders', 'Eye Palettes', 'Mascara', 'Eyeliner'], 4),
('Fashion Accessories', 'fashion-accessories', ARRAY['Bonnets', 'Shower Caps', 'Sunglasses', 'Fascinators'], 5),
('Jewelry', 'jewelry', ARRAY['Earrings', 'Rings', 'Nose Rings', 'Bracelets', 'Chains'], 6),
('Perfumes', 'perfumes', ARRAY['Body Splash', 'Body Mist', 'Elegant Perfumes', 'Designer Perfumes'], 7),
('Bath & Cleaning', 'bath-cleaning', ARRAY['Shower Gels', 'Soaps', 'Lotions', 'Roll-ons', 'Deodorants'], 8),
('Nail Care', 'nail-care', ARRAY['Nail Polish', 'Nail Remover', 'Nail Extensions'], 9),
('Tools', 'tools', ARRAY['Combs', 'Brushes', 'Clips', 'Scissors', 'Mirrors'], 10);

-- Enable realtime for categories
ALTER PUBLICATION supabase_realtime ADD TABLE public.categories;