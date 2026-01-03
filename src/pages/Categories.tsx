import CategoryCard from '@/components/CategoryCard';
import { categories } from '@/data/products';

const Categories = () => {
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
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
        {categories.map((category) => (
          <CategoryCard key={category.id} category={category} />
        ))}
      </div>

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
