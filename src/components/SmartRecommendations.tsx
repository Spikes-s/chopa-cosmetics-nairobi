import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import ProductCard from '@/components/ProductCard';
import { Lightbulb } from 'lucide-react';

interface RecommendedProduct {
  id: string;
  name: string;
  retail_price: number;
  wholesale_price: number | null;
  image_url: string | null;
  category: string;
  subcategory: string | null;
  in_stock: boolean;
  description: string | null;
}

interface SmartRecommendationsProps {
  currentProductId: string;
  category: string;
  subcategory?: string | null;
}

const SmartRecommendations = ({ currentProductId, category, subcategory }: SmartRecommendationsProps) => {
  const [products, setProducts] = useState<RecommendedProduct[]>([]);

  useEffect(() => {
    const fetchRecommendations = async () => {
      // First try same subcategory, then same category
      let query = supabase
        .from('public_products')
        .select('id, name, retail_price, wholesale_price, image_url, category, subcategory, in_stock, description')
        .neq('id', currentProductId)
        .eq('in_stock', true);

      if (subcategory) {
        query = query.eq('subcategory', subcategory);
      } else {
        query = query.eq('category', category);
      }

      const { data } = await query.limit(4);

      if (data && data.length > 0) {
        setProducts(data);
      } else if (subcategory) {
        // Fallback: same category
        const { data: fallback } = await supabase
          .from('products')
          .select('id, name, retail_price, wholesale_price, image_url, category, subcategory, in_stock, description')
          .neq('id', currentProductId)
          .eq('category', category)
          .eq('in_stock', true)
          .limit(4);
        if (fallback) setProducts(fallback);
      }
    };

    fetchRecommendations();
  }, [currentProductId, category, subcategory]);

  if (products.length === 0) return null;

  return (
    <section className="mt-12 pt-12 border-t border-border">
      <div className="flex items-center gap-3 mb-8">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-accent to-primary flex items-center justify-center">
          <Lightbulb className="w-4 h-4 text-white" />
        </div>
        <h2 className="text-2xl font-display font-bold text-foreground">You May Also Like</h2>
      </div>

      <div className="flex flex-col gap-4 md:gap-6 max-w-2xl mx-auto">
        {products.map((product) => (
          <ProductCard
            key={product.id}
            product={{
              id: product.id,
              name: product.name,
              price: product.retail_price,
              wholesalePrice: product.wholesale_price || 0,
              image: product.image_url || '/placeholder.svg',
              category: product.category,
              subcategory: product.subcategory || '',
              description: product.description || '',
              inStock: product.in_stock,
            }}
          />
        ))}
      </div>
    </section>
  );
};

export default SmartRecommendations;
