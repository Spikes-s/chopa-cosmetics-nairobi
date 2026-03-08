import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import ProductCard from '@/components/ProductCard';
import CategoryCard from '@/components/CategoryCard';
import HamburgerCategoryMenu from '@/components/HamburgerCategoryMenu';
import FeaturedProducts from '@/components/FeaturedProducts';
import FlashSales from '@/components/FlashSales';
import { supabase } from '@/integrations/supabase/client';
import { ArrowRight, Sparkles, Truck, Shield, Gift, TrendingUp, Star, Clock } from 'lucide-react';

interface Product {
  id: string;
  name: string;
  retail_price: number;
  wholesale_price: number | null;
  image_url: string | null;
  category: string;
  in_stock: boolean;
  description: string | null;
}

interface Category {
  id: string;
  name: string;
  slug: string;
  image_url: string | null;
  subcategories: string[];
}

const Index = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [mostBought, setMostBought] = useState<Product[]>([]);
  const [upcoming, setUpcoming] = useState<Product[]>([]);
  const [bestReviewed, setBestReviewed] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      // Fetch categories from database
      const { data: categoriesData } = await supabase
        .from('categories')
        .select('id, name, slug, image_url, subcategories')
        .eq('is_active', true)
        .order('display_order', { ascending: true });
      
      if (categoriesData) {
        setCategories(categoriesData);
      }

      // Fetch most bought (from orders - most ordered products)
      const { data: orders } = await supabase
        .from('orders')
        .select('items')
        .eq('order_status', 'completed');

      const productCounts: Record<string, number> = {};
      orders?.forEach(order => {
        const items = order.items as any[];
        items?.forEach(item => {
          productCounts[item.id] = (productCounts[item.id] || 0) + (item.quantity || 1);
        });
      });

      const sortedProductIds = Object.entries(productCounts)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 4)
        .map(([id]) => id);

      // Fetch products from database
      const { data: allProducts } = await supabase
        .from('products')
        .select('id, name, retail_price, wholesale_price, image_url, category, in_stock, description')
        .eq('in_stock', true);

      if (allProducts) {
        // Most bought products
        const mostBoughtProducts = sortedProductIds
          .map(id => allProducts.find(p => p.id === id))
          .filter(Boolean) as Product[];
        setMostBought(mostBoughtProducts.length > 0 ? mostBoughtProducts : allProducts.slice(0, 4));

        // Upcoming: newest products
        setUpcoming(allProducts.slice(-4).reverse());

        // Best reviewed: random selection
        const shuffled = [...allProducts].sort(() => 0.5 - Math.random());
        setBestReviewed(shuffled.slice(0, 4));
      }

      setIsLoading(false);
    };

    fetchData();
  }, []);

  const featuredCategories = categories.slice(0, 6);

  return (
    <div>
      {/* Hamburger Menu - Home Page Only */}
      <div className="fixed top-20 right-4 z-50 md:hidden">
        <HamburgerCategoryMenu />
      </div>

      {/* Hero Section */}
      <section className="relative min-h-[80vh] flex items-center justify-center overflow-hidden">
        {/* Animated Background Elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-20 left-10 w-64 h-64 bg-primary/20 rounded-full blur-3xl animate-float" />
          <div className="absolute bottom-20 right-10 w-96 h-96 bg-secondary/20 rounded-full blur-3xl animate-float" style={{ animationDelay: '2s' }} />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-accent/10 rounded-full blur-3xl" />
        </div>

        <div className="container mx-auto px-4 relative z-10">
          <div className="max-w-4xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-8 animate-fade-in">
              <Sparkles className="w-4 h-4 text-accent" />
              <span className="text-sm text-foreground/80">Premium Beauty Products</span>
            </div>
            
            <h1 className="text-5xl md:text-7xl lg:text-8xl font-display font-bold mb-6 animate-fade-in" style={{ animationDelay: '0.2s' }}>
              <span className="gradient-text">Beauty At</span>
              <br />
              <span className="text-foreground">Your Proximity</span>
            </h1>
            
            <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-10 font-body animate-fade-in" style={{ animationDelay: '0.4s' }}>
              Discover premium cosmetics, hair care, and beauty essentials at Chopa Cosmetics Limited. 
              Quality you can trust, prices you'll love.
            </p>
            
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-fade-in" style={{ animationDelay: '0.6s' }}>
              <Button asChild variant="gradient" size="xl">
                <Link to="/products">
                  Shop Now <ArrowRight className="w-5 h-5 ml-2" />
                </Link>
              </Button>
              <Button asChild variant="outline" size="xl">
                <Link to="/categories">
                  Browse Categories
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Features Strip */}
      <section className="border-y border-border bg-card/30 backdrop-blur-sm py-8">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                <Truck className="w-6 h-6 text-primary" />
              </div>
              <div>
                <p className="font-semibold text-foreground text-sm">Free CBD Delivery</p>
                <p className="text-xs text-muted-foreground">Within Nairobi CBD</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-secondary/10 flex items-center justify-center">
                <Shield className="w-6 h-6 text-secondary" />
              </div>
              <div>
                <p className="font-semibold text-foreground text-sm">Quality Guaranteed</p>
                <p className="text-xs text-muted-foreground">100% Authentic</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center">
                <Gift className="w-6 h-6 text-accent" />
              </div>
              <div>
                <p className="font-semibold text-foreground text-sm">Rewards Program</p>
                <p className="text-xs text-muted-foreground">Orders above Ksh 50,000</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                <Sparkles className="w-6 h-6 text-primary" />
              </div>
              <div>
                <p className="font-semibold text-foreground text-sm">Wholesale Prices</p>
                <p className="text-xs text-muted-foreground">Bulk discounts available</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Categories Section */}
      <section className="py-16 md:py-24">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-10">
            <div>
              <h2 className="text-3xl md:text-4xl font-display font-bold text-foreground mb-2">
                Shop by Category
              </h2>
              <p className="text-muted-foreground">
                Explore our wide range of beauty products
              </p>
            </div>
            <Link to="/categories" className="text-primary hover:text-primary/80 font-medium flex items-center gap-1 mt-4 md:mt-0">
              View All Categories <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {featuredCategories.map((category) => (
              <CategoryCard key={category.id} category={{
                id: category.id,
                name: category.name,
                slug: category.slug,
                image: category.image_url || '/placeholder.svg',
                subcategories: category.subcategories,
              }} />
            ))}
          </div>
        </div>
      </section>

      {/* Featured Products Section */}
      <FeaturedProducts />

      {/* Flash Sales */}
      <FlashSales />

      {/* Most Bought Products */}
      <section className="py-16 md:py-24 bg-card/30">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-10">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h2 className="text-3xl md:text-4xl font-display font-bold text-foreground">
                  Most Bought
                </h2>
                <p className="text-muted-foreground text-sm">
                  Top sellers based on orders
                </p>
              </div>
            </div>
            <Link to="/products" className="text-primary hover:text-primary/80 font-medium flex items-center gap-1 mt-4 md:mt-0">
              View All <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
          
          {isLoading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
            </div>
          ) : (
            <div className="flex flex-col gap-4 md:gap-6 max-w-2xl mx-auto">
              {mostBought.map((product) => (
                <ProductCard 
                  key={product.id} 
                  product={{
                    id: product.id,
                    name: product.name,
                    price: product.retail_price,
                    wholesalePrice: product.wholesale_price || undefined,
                    image: product.image_url || '/placeholder.svg',
                    category: product.category,
                    subcategory: '',
                    description: product.description || '',
                    inStock: product.in_stock,
                  }} 
                />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Upcoming Products */}
      <section className="py-16 md:py-24">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-10">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-accent/20 flex items-center justify-center">
                <Clock className="w-5 h-5 text-accent" />
              </div>
              <div>
                <h2 className="text-3xl md:text-4xl font-display font-bold text-foreground">
                  New Arrivals
                </h2>
                <p className="text-muted-foreground text-sm">
                  Latest additions to our collection
                </p>
              </div>
            </div>
          </div>
          
          {!isLoading && (
            <div className="flex flex-col gap-4 md:gap-6 max-w-2xl mx-auto">
              {upcoming.map((product) => (
                <ProductCard 
                  key={product.id} 
                  product={{
                    id: product.id,
                    name: product.name,
                    price: product.retail_price,
                    wholesalePrice: product.wholesale_price || undefined,
                    image: product.image_url || '/placeholder.svg',
                    category: product.category,
                    subcategory: '',
                    description: product.description || '',
                    inStock: product.in_stock,
                  }} 
                />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Best Reviewed Products */}
      <section className="py-16 md:py-24 bg-card/30">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-10">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-secondary/20 flex items-center justify-center">
                <Star className="w-5 h-5 text-secondary" />
              </div>
              <div>
                <h2 className="text-3xl md:text-4xl font-display font-bold text-foreground">
                  Best Reviewed
                </h2>
                <p className="text-muted-foreground text-sm">
                  Customer favorites
                </p>
              </div>
            </div>
          </div>
          
          {!isLoading && (
            <div className="flex flex-col gap-4 md:gap-6 max-w-2xl mx-auto">
              {bestReviewed.map((product) => (
                <ProductCard 
                  key={product.id} 
                  product={{
                    id: product.id,
                    name: product.name,
                    price: product.retail_price,
                    wholesalePrice: product.wholesale_price || undefined,
                    image: product.image_url || '/placeholder.svg',
                    category: product.category,
                    subcategory: '',
                    description: product.description || '',
                    inStock: product.in_stock,
                  }} 
                />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Wholesale CTA */}
      <section className="py-16 md:py-24">
        <div className="container mx-auto px-4">
          <div className="relative rounded-3xl overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-primary/30 via-secondary/30 to-accent/20" />
            <div className="absolute inset-0 bg-gradient-to-t from-background to-transparent" />
            
            <div className="relative z-10 p-8 md:p-16 text-center">
              <h2 className="text-3xl md:text-5xl font-display font-bold text-foreground mb-4">
                Wholesale Pricing Available
              </h2>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-8">
                Get special wholesale prices when you buy in bulk. Braids: 10+ pieces. Other products: 6+ items.
              </p>
              <Button asChild variant="gold" size="xl">
                <Link to="/products">
                  Start Shopping <ArrowRight className="w-5 h-5 ml-2" />
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Index;
