import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Menu, ChevronRight, Loader2, Package, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';

interface Category {
  id: string;
  name: string;
  slug: string;
  subcategories: string[];
}

const HamburgerCategoryMenu = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchCategories = async () => {
      const { data } = await supabase
        .from('categories')
        .select('id, name, slug, subcategories')
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
      .channel('hamburger-categories')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'categories' }, fetchCategories)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Menu className="w-6 h-6" />
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-[300px] sm:w-[350px]">
        <SheetHeader>
          <SheetTitle className="text-left gradient-text font-display">
            Shop by Category
          </SheetTitle>
        </SheetHeader>
        <div className="mt-6 space-y-1">
          {/* Quick Links */}
          <Link
            to="/my-orders"
            onClick={() => setIsOpen(false)}
            className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 transition-colors group"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center">
                <Package className="w-5 h-5 text-accent" />
              </div>
              <span className="font-medium text-foreground group-hover:text-primary transition-colors">
                My Orders
              </span>
            </div>
            <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
          </Link>
          <Link
            to="/reviews"
            onClick={() => setIsOpen(false)}
            className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 transition-colors group"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Star className="w-5 h-5 text-primary" />
              </div>
              <span className="font-medium text-foreground group-hover:text-primary transition-colors">
                Reviews
              </span>
            </div>
            <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
          </Link>

          <div className="border-t border-border my-2" />

          {/* Categories */}
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : categories.length === 0 ? (
            <p className="text-center py-8 text-muted-foreground">No categories available</p>
          ) : (
            categories.map((category) => (
              <Link
                key={category.id}
                to={`/products?category=${category.slug}`}
                onClick={() => setIsOpen(false)}
                className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 transition-colors group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <span className="text-primary text-sm font-bold">{category.name.charAt(0)}</span>
                  </div>
                  <span className="font-medium text-foreground group-hover:text-primary transition-colors">
                    {category.name}
                  </span>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
              </Link>
            ))
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default HamburgerCategoryMenu;
