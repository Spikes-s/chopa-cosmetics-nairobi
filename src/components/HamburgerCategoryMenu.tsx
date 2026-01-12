import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Menu, X, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { categories } from '@/data/products';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';

const HamburgerCategoryMenu = () => {
  const [isOpen, setIsOpen] = useState(false);

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
          {categories.map((category) => (
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
          ))}
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default HamburgerCategoryMenu;
