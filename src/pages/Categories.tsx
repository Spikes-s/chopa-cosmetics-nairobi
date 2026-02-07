import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import CategoryCard from '@/components/CategoryCard';
import { Loader2 } from 'lucide-react';

interface Category {
  id: string;
  name: string;
  slug: string;
  image_url: string | null;
  subcategories: string[];
}

const Categories = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchCategories = async () => {
      const { data } = await supabase
        .from('categories')
        .select('id, name, slug, image_url, subcategories')
        .eq('is_active', true)
        .order('display_order', { ascending: true });
      
      if (data) {
        setCategories(data);
      }
      setIsLoading(false);
    };

    fetchCategories();

    // Subscribe to realtime updates
    const channel = supabase
      .channel('categories-page')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'categories' }, fetchCategories)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Page Header */}
      <div className="text-center mb-12">
        <h1 className="text-4xl md:text-5xl font-display font-bold text-foreground mb-4">
          Shop by Category
        </h1>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          Explore our complete range of beauty and cosmetic products. From braids to skincare, 
          we have everything you need to look and feel your best.
        </p>
      </div>

      {/* Categories Grid */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : categories.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground">No categories available yet.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
          {categories.map((category) => (
            <CategoryCard key={category.id} category={{
              id: category.id,
              name: category.name,
              slug: category.slug,
              image: category.image_url || '/placeholder.svg',
              subcategories: category.subcategories,
            }} />
          ))}
        </div>
      )}

      {/* Info Section */}
      <div className="mt-16 text-center">
        <div className="glass-card rounded-2xl p-8 max-w-2xl mx-auto">
          <h2 className="text-2xl font-display font-bold text-foreground mb-4">
            Wholesale Pricing Available
          </h2>
          <p className="text-muted-foreground mb-4">
            Get special discounts when you buy in bulk:
          </p>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="p-4 rounded-lg bg-muted/50">
              <p className="font-semibold text-foreground">Braids</p>
              <p className="text-accent">10+ pieces</p>
            </div>
            <div className="p-4 rounded-lg bg-muted/50">
              <p className="font-semibold text-foreground">Other Products</p>
              <p className="text-accent">6+ items</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Categories;
