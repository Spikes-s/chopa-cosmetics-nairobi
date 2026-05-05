
-- Add search_tags column for denormalized searchable text
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS search_tags text DEFAULT '';

-- Function to extract search tags from variations JSON
CREATE OR REPLACE FUNCTION public.generate_search_tags()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  tags text := '';
  vg jsonb;
  opt jsonb;
  ni jsonb;
  color jsonb;
BEGIN
  -- Include product name, category, subcategory, barcode
  tags := COALESCE(NEW.name, '') || ' ' || COALESCE(NEW.category, '') || ' ' || COALESCE(NEW.subcategory, '') || ' ' || COALESCE(NEW.barcode, '');
  
  -- Extract from variations JSON
  IF NEW.variations IS NOT NULL AND NEW.variations::text != 'null' THEN
    -- Extract variant_groups options
    IF NEW.variations ? 'variant_groups' THEN
      FOR vg IN SELECT * FROM jsonb_array_elements(NEW.variations->'variant_groups')
      LOOP
        tags := tags || ' ' || COALESCE(vg->>'label', '') || ' ' || COALESCE(vg->>'type', '');
        IF vg ? 'options' THEN
          FOR opt IN SELECT * FROM jsonb_array_elements(vg->'options')
          LOOP
            tags := tags || ' ' || COALESCE(opt->>'name', '');
          END LOOP;
        END IF;
      END LOOP;
    END IF;
    
    -- Extract named_images names (codes like Ke101, CandyGloss04)
    IF NEW.variations ? 'named_images' THEN
      FOR ni IN SELECT * FROM jsonb_array_elements(NEW.variations->'named_images')
      LOOP
        tags := tags || ' ' || COALESCE(ni->>'name', '');
      END LOOP;
    END IF;
    
    -- Extract colors
    IF NEW.variations ? 'colors' THEN
      FOR color IN SELECT * FROM jsonb_array_elements(NEW.variations->'colors')
      LOOP
        tags := tags || ' ' || COALESCE(color->>'name', '');
      END LOOP;
    END IF;
  END IF;
  
  NEW.search_tags := lower(trim(tags));
  RETURN NEW;
END;
$$;

-- Create trigger
DROP TRIGGER IF EXISTS trg_generate_search_tags ON public.products;
CREATE TRIGGER trg_generate_search_tags
  BEFORE INSERT OR UPDATE ON public.products
  FOR EACH ROW
  EXECUTE FUNCTION public.generate_search_tags();

-- Create GIN index for full-text search
CREATE INDEX IF NOT EXISTS idx_products_search_tags_gin 
  ON public.products USING gin(to_tsvector('simple', search_tags));

-- Also create trigram index for fuzzy matching
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX IF NOT EXISTS idx_products_search_tags_trgm 
  ON public.products USING gin(search_tags gin_trgm_ops);

-- Recreate public_products view with search_tags
DROP VIEW IF EXISTS public.public_products;

CREATE VIEW public.public_products AS
SELECT
  id, name, description, category, subcategory,
  retail_price, wholesale_price, wholesale_min_qty,
  image_url, additional_images, in_stock, stock_quantity,
  barcode, variations, expiry_date, display_section,
  sale_price, sale_label, sale_ends_at,
  search_tags, created_at, updated_at
FROM products;

GRANT SELECT ON public.public_products TO anon, authenticated;

-- Backfill existing products to generate search_tags
UPDATE public.products SET search_tags = '' WHERE search_tags IS NULL OR search_tags = '';
