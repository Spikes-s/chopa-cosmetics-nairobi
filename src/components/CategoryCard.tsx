import { Link } from 'react-router-dom';
import { ImageIcon } from 'lucide-react';

interface CategoryCardCategory {
  id: string;
  name: string;
  slug: string;
  image: string;
  subcategories: string[];
}

interface CategoryCardProps {
  category: CategoryCardCategory;
}

const CategoryCard = ({ category }: CategoryCardProps) => {
  const hasImage = category.image && category.image !== '/placeholder.svg';

  return (
    <Link
      to={`/products?category=${category.slug}`}
      className="group relative overflow-hidden rounded-2xl aspect-[4/5] border border-border hover:border-primary/50 transition-all duration-500"
    >
      {/* Category Image or Placeholder */}
      {hasImage ? (
        <img
          src={category.image}
          alt={category.name}
          className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
        />
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center">
          <ImageIcon className="w-12 h-12 text-muted-foreground/40" />
        </div>
      )}

      {/* Overlay gradient */}
      <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent z-10" />

      {/* Content */}
      <div className="relative z-20 h-full flex flex-col justify-end p-4 md:p-6">
        <h3 className="font-display text-lg md:text-2xl font-bold text-foreground mb-1 group-hover:text-primary transition-colors">
          {category.name}
        </h3>
        <p className="text-muted-foreground text-xs md:text-sm">
          {category.subcategories.length} subcategories
        </p>
        
        {/* Arrow */}
        <div className="mt-3 flex items-center text-primary opacity-0 group-hover:opacity-100 transform translate-x-[-10px] group-hover:translate-x-0 transition-all duration-300">
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
