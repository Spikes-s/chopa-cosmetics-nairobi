import { useState, useEffect, useMemo } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import ProductCard from '@/components/ProductCard';
import CategoryCard from '@/components/CategoryCard';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, X, ArrowLeft, Loader2 } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface DBProduct {
  id: string;
  name: string;
  description: string | null;
  retail_price: number;
  wholesale_price: number | null;
  category: string;
  subcategory: string | null;
  image_url: string | null;
  in_stock: boolean | null;
}

interface DBCategory {
  id: string;
  name: string;
  slug: string;
  image_url: string | null;
  subcategories: string[];
}

const Products = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchQuery, setSearchQuery] = useState(searchParams.get('search') || '');
  const [selectedCategory, setSelectedCategory] = useState(searchParams.get('category') || '');
  const [sortBy, setSortBy] = useState('featured');
  const [showProducts, setShowProducts] = useState(!!searchParams.get('category') || !!searchParams.get('search'));
  
  const [products, setProducts] = useState<DBProduct[]>([]);
  const [categories, setCategories] = useState<DBCategory[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch categories from database
  const fetchCategories = async () => {
    const { data } = await supabase
      .from('categories')
      .select('id, name, slug, image_url, subcategories')
      .eq('is_active', true)
      .order('display_order', { ascending: true });
    
    if (data) {
      setCategories(data);
    }
  };

  // Fetch products from database
  const fetchProducts = async () => {
    setIsLoading(true);
    let query = supabase
      .from('products')
      .select('id, name, description, retail_price, wholesale_price, category, subcategory, image_url, in_stock')
      .order('created_at', { ascending: false });

    const { data } = await query;
    if (data) {
      setProducts(data);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    fetchCategories();
    fetchProducts();

    // Subscribe to realtime updates
    const channel = supabase
      .channel('products-page')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'products' }, fetchProducts)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'categories' }, fetchCategories)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const filteredProducts = useMemo(() => {
    let filtered = [...products];

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (p) =>
          p.name.toLowerCase().includes(query) ||
          (p.description || '').toLowerCase().includes(query) ||
          p.category.toLowerCase().includes(query) ||
          (p.subcategory || '').toLowerCase().includes(query)
      );
    }

    // Category filter
    if (selectedCategory && selectedCategory !== 'all') {
      const category = categories.find(c => c.slug === selectedCategory);
      if (category) {
        filtered = filtered.filter(p => p.category === category.name);
      }
    }

    // Sort
    switch (sortBy) {
      case 'price-low':
        filtered.sort((a, b) => a.retail_price - b.retail_price);
        break;
      case 'price-high':
        filtered.sort((a, b) => b.retail_price - a.retail_price);
        break;
      case 'name':
        filtered.sort((a, b) => a.name.localeCompare(b.name));
        break;
      default:
        break;
    }

    return filtered;
  }, [searchQuery, selectedCategory, sortBy, products, categories]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery) {
      setSearchParams({ search: searchQuery });
      setShowProducts(true);
    } else {
      setSearchParams({});
    }
  };

  const handleCategoryClick = (categorySlug: string) => {
    setSelectedCategory(categorySlug);
    setSearchParams({ category: categorySlug });
    setShowProducts(true);
  };

  const clearFilters = () => {
    setSearchQuery('');
    setSelectedCategory('');
    setSortBy('featured');
    setSearchParams({});
    setShowProducts(false);
  };

  const backToCategories = () => {
    setShowProducts(false);
    setSelectedCategory('');
    setSearchParams({});
  };

  // Show categories first
  if (!showProducts) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-display font-bold text-foreground mb-2">
            Shop Now
          </h1>
          <p className="text-muted-foreground">
            Browse our categories to find what you need
          </p>
        </div>

        <div className="glass-card rounded-xl p-4 mb-8">
          <form onSubmit={handleSearch} className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search products..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button type="submit">Search</Button>
          </form>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : categories.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-muted-foreground">No categories found.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {categories.map((category) => (
              <button
                key={category.id}
                onClick={() => handleCategoryClick(category.slug)}
                className="text-left"
              >
                <CategoryCard category={{
                  id: category.id,
                  name: category.name,
                  slug: category.slug,
                  image: category.image_url || '/placeholder.svg',
                  subcategories: category.subcategories,
                }} />
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  const selectedCategoryData = categories.find(c => c.slug === selectedCategory);

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <Button 
          variant="ghost" 
          onClick={backToCategories} 
          className="mb-4 gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Categories
        </Button>
        <h1 className="text-3xl md:text-4xl font-display font-bold text-foreground mb-2">
          {selectedCategoryData?.name || 'All Products'}
        </h1>
        <p className="text-muted-foreground">
          {filteredProducts.length} products available
        </p>
      </div>

      <div className="glass-card rounded-xl p-4 mb-8">
        <div className="flex flex-col md:flex-row gap-4">
          <form onSubmit={handleSearch} className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search products..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </form>

          <Select value={selectedCategory || 'all'} onValueChange={(val) => {
            setSelectedCategory(val === 'all' ? '' : val);
            if (val !== 'all') {
              setSearchParams({ category: val });
            }
          }}>
            <SelectTrigger className="w-full md:w-[200px]">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {categories.map((cat) => (
                <SelectItem key={cat.id} value={cat.slug}>
                  {cat.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-full md:w-[180px]">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="featured">Featured</SelectItem>
              <SelectItem value="price-low">Price: Low to High</SelectItem>
              <SelectItem value="price-high">Price: High to Low</SelectItem>
              <SelectItem value="name">Name</SelectItem>
            </SelectContent>
          </Select>

          {(searchQuery || selectedCategory) && (
            <Button variant="ghost" onClick={clearFilters} className="shrink-0">
              <X className="w-4 h-4 mr-2" />
              Clear
            </Button>
          )}
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : filteredProducts.length > 0 ? (
        <div className="flex flex-col gap-4 md:gap-6 max-w-2xl mx-auto">
          {filteredProducts.map((product) => (
            <ProductCard key={product.id} product={{
              id: product.id,
              name: product.name,
              price: product.retail_price,
              wholesalePrice: product.wholesale_price || 0,
              image: product.image_url || '/placeholder.svg',
              category: product.category,
              subcategory: product.subcategory || '',
              description: product.description || '',
              inStock: product.in_stock ?? true,
            }} />
          ))}
        </div>
      ) : (
        <div className="text-center py-16">
          <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-muted flex items-center justify-center">
            <Search className="w-10 h-10 text-muted-foreground" />
          </div>
          <h3 className="text-xl font-display font-semibold text-foreground mb-2">
            No products found
          </h3>
          <p className="text-muted-foreground mb-6">
            {products.length === 0 
              ? 'No products have been added yet' 
              : 'Try adjusting your search or filter criteria'}
          </p>
          <Button onClick={clearFilters}>Clear Filters</Button>
        </div>
      )}
    </div>
  );
};

export default Products;
