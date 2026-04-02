import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ShoppingCart, Eye } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Product, isHairExtension } from '@/data/products';
import { useCart } from '@/context/CartContext';
import { toast } from 'sonner';

interface ProductCardProps {
  product: Product;
}

const ProductCard = ({ product }: ProductCardProps) => {
  const { addItem } = useCart();
  const navigate = useNavigate();
  const [imageLoaded, setImageLoaded] = useState(false);
  
  const isExtension = isHairExtension(product);

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (product.inStock === false) {
      toast.error('This product is currently out of stock');
      return;
    }
    
    if (isExtension) {
      navigate(`/product/${product.id}`);
      return;
    }
    
    addItem({
      id: product.id,
      name: product.name,
      price: product.price,
      wholesalePrice: product.wholesalePrice,
      quantity: 1,
      image: product.image,
      category: product.category,
    });
    
    toast.success(`${product.name} added to cart!`);
  };

  return (
    <Card variant="gradient" className="group overflow-hidden hover:shadow-xl hover:shadow-accent/10 transition-all duration-500 sparkle-hover hover:gold-glow">
      <Link to={`/product/${product.id}`}>
        <div className="relative aspect-[4/5] overflow-hidden bg-muted/30">
          {!imageLoaded && (
            <Skeleton className="absolute inset-0 w-full h-full rounded-none" />
          )}
          <img
            src={product.image}
            alt={product.name}
            loading="lazy"
            onLoad={() => setImageLoaded(true)}
            className={`w-full h-full object-cover transition-all duration-500 group-hover:scale-105 ${
              imageLoaded ? 'opacity-100' : 'opacity-0'
            }`}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-background/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          
          {/* Quick Actions */}
          <div className="absolute bottom-3 left-3 right-3 flex gap-2 opacity-0 group-hover:opacity-100 transform translate-y-4 group-hover:translate-y-0 transition-all duration-300">
            <Button
              variant="glass"
              size="sm"
              className="flex-1"
              onClick={handleAddToCart}
            >
              {isExtension ? (
                <>
                  <Eye className="w-4 h-4 mr-1" />
                  Select Color
                </>
              ) : (
                <>
                  <ShoppingCart className="w-4 h-4 mr-1" />
                  Add to Cart
                </>
              )}
            </Button>
          </div>

          {/* Status Badges */}
          <div className="absolute top-3 right-3 flex flex-col gap-1">
            {product.inStock === false ? (
              <span className="bg-destructive text-destructive-foreground text-xs font-semibold px-2 py-1 rounded-full">
                Out of Stock
              </span>
            ) : product.wholesalePrice > 0 && (
              <span className="bg-accent/90 text-accent-foreground text-xs font-semibold px-2 py-1 rounded-full">
                Wholesale
              </span>
            )}
          </div>
        </div>

        <CardContent className="p-3 sm:p-4">
          <div className="mb-1">
            <span className="text-[10px] sm:text-xs text-primary font-medium uppercase tracking-wider">
              {product.subcategory}
            </span>
          </div>
          <h3 className="font-display font-semibold text-foreground mb-1.5 line-clamp-2 text-sm sm:text-base group-hover:text-primary transition-colors">
            {product.name}
          </h3>
          <div className="flex items-baseline gap-2">
            <span className="text-base sm:text-lg font-bold text-foreground">
              Ksh {product.price.toLocaleString()}
            </span>
            <span className="text-xs sm:text-sm text-muted-foreground line-through">
              Ksh {Math.round(product.price * 1.2).toLocaleString()}
            </span>
          </div>
          {product.wholesalePrice > 0 && (
            <p className="text-[10px] sm:text-xs text-accent mt-1">
              Wholesale: Ksh {product.wholesalePrice.toLocaleString()}
            </p>
          )}
        </CardContent>
      </Link>
    </Card>
  );
};

export default ProductCard;
