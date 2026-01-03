import { Link } from 'react-router-dom';
import { Category } from '@/data/products';

interface CategoryCardProps {
  category: Category;
}

const CategoryCard = ({ category }: CategoryCardProps) => {
  return (
    <Link
      to={`/products?category=${category.slug}`}
      className="group relative overflow-hidden rounded-2xl aspect-[4/5] bg-gradient-to-br from-primary/20 to-secondary/20 border border-border hover:border-primary/50 transition-all duration-500"
    >
      {/* Background Gradient */}
      <div className="absolute inset-0 bg-gradient-to-t from-background via-background/50 to-transparent z-10" />
      
      {/* Animated Border */}
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
        <div className="absolute inset-[1px] rounded-2xl bg-gradient-to-br from-primary via-secondary to-accent animate-gradient-shift" style={{ backgroundSize: '200% 200%' }} />
        <div className="absolute inset-[2px] rounded-2xl bg-card" />
      </div>

      {/* Content */}
      <div className="relative z-20 h-full flex flex-col justify-end p-6">
        <h3 className="font-display text-2xl font-bold text-foreground mb-2 group-hover:text-primary transition-colors">
          {category.name}
        </h3>
        <p className="text-muted-foreground text-sm">
          {category.subcategories.length} subcategories
        </p>
        
        {/* Arrow */}
        <div className="mt-4 flex items-center text-primary opacity-0 group-hover:opacity-100 transform translate-x-[-10px] group-hover:translate-x-0 transition-all duration-300">
          <span className="text-sm font-medium mr-2">Explore</span>
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
          </svg>
        </div>
      </div>

      {/* Glow Effect */}
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-3/4 h-1/3 bg-primary/20 blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
    </Link>
  );
};

export default CategoryCard;
