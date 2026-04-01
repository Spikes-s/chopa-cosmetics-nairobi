import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import ProductCard from '@/components/ProductCard';
import { ArrowRight, Sparkles } from 'lucide-react';

interface Product {
  id: string;
  name: string;
  retail_price: number;
  wholesale_price: number | null;
  wholesale_min_qty: number | null;
  image_url: string | null;
  category: string;
  subcategory: string | null;
  in_stock: boolean;
  description: string | null;
  display_section: string | null;
}

const FeaturedProducts = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchProducts = async () => {
    // Fetch featured products (default for new products) or any with display_section = 'featured'
    const { data, error } = await supabase
      .from('public_products')
      .select('id, name, retail_price, wholesale_price, wholesale_min_qty, image_url, category, subcategory, in_stock, description, display_section')
      .or('display_section.eq.featured,display_section.is.null')
      .order('created_at', { ascending: false })
      .limit(8);

    if (!error && data) {
      setProducts(data);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    fetchProducts();
    
    // Subscribe to realtime updates
    const channel = supabase
      .channel('featured-products')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'products'
      }, () => {
        fetchProducts();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (products.length === 0) {
    return null;
  }

  return (
    <section className="py-16 md:py-24 bg-gradient-to-b from-background to-card/30">
      <div className="container mx-auto px-4">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-secondary to-primary flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-3xl md:text-4xl font-display font-bold text-foreground">
                Featured Products
              </h2>
              <p className="text-muted-foreground text-sm">
                Latest additions to our collection
              </p>
            </div>
          </div>
          <Link to="/products" className="text-primary hover:text-primary/80 font-medium flex items-center gap-1 mt-4 md:mt-0">
            View All <ArrowRight className="w-4 h-4" />
          </Link>
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
      </div>
    </section>
  );
};

export default FeaturedProducts;
