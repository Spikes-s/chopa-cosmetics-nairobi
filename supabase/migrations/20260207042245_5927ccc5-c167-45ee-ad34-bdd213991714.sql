
-- Create brand_subcategories table for nested brand categories like Designer Perfumes > Chanel, Dior, etc.
CREATE TABLE public.brand_subcategories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  category_id UUID NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
  parent_subcategory TEXT NOT NULL,
  brand_name TEXT NOT NULL,
  brand_slug TEXT NOT NULL,
  image_url TEXT,
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(category_id, parent_subcategory, brand_slug)
);

-- Enable RLS
ALTER TABLE public.brand_subcategories ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Anyone can view active brand subcategories"
  ON public.brand_subcategories
  FOR SELECT
  USING (is_active = true);

CREATE POLICY "Admins can manage brand subcategories"
  ON public.brand_subcategories
  FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Trigger for updated_at
CREATE TRIGGER update_brand_subcategories_updated_at
  BEFORE UPDATE ON public.brand_subcategories
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Enable realtime for brand_subcategories
ALTER PUBLICATION supabase_realtime ADD TABLE public.brand_subcategories;

-- Insert default designer perfume brands
INSERT INTO public.brand_subcategories (category_id, parent_subcategory, brand_name, brand_slug)
SELECT 
  id as category_id,
  'Designer Perfumes' as parent_subcategory,
  brand_name,
  lower(replace(brand_name, ' ', '-')) as brand_slug
FROM public.categories, 
  (VALUES ('Chanel'), ('Dior'), ('Versace'), ('Gucci'), ('Tom Ford'), ('YSL')) AS brands(brand_name)
WHERE slug = 'perfumes';
