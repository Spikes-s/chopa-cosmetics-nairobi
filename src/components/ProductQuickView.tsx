import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ShoppingCart, Eye, ChevronLeft, ChevronRight, ExternalLink } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Product, isHairExtension } from '@/data/products';
import { useCart } from '@/context/CartContext';
import { toast } from 'sonner';

interface ProductQuickViewProps {
  product: Product | null;
  isOpen: boolean;
  onClose: () => void;
}

const ProductQuickView = ({ product, isOpen, onClose }: ProductQuickViewProps) => {
  const { addItem } = useCart();
  const [imageLoaded, setImageLoaded] = useState(false);

  if (!product) return null;

  const isExtension = isHairExtension(product);

  const handleAddToCart = () => {
    if (product.inStock === false) {
      toast.error('This product is currently out of stock');
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
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl p-0 overflow-hidden">
        <div className="flex flex-col sm:flex-row">
          {/* Image */}
          <div className="relative w-full sm:w-1/2 aspect-square bg-muted/30">
            {!imageLoaded && (
              <Skeleton className="absolute inset-0 w-full h-full rounded-none" />
            )}
            <img
              src={product.image}
              alt={product.name}
              onLoad={() => setImageLoaded(true)}
              className={`w-full h-full object-cover transition-opacity duration-300 ${
                imageLoaded ? 'opacity-100' : 'opacity-0'
              }`}
            />
            {product.inStock === false && (
              <span className="absolute top-3 right-3 bg-destructive text-destructive-foreground text-xs font-semibold px-2 py-1 rounded-full">
                Out of Stock
              </span>
            )}
          </div>

          {/* Details */}
          <div className="w-full sm:w-1/2 p-5 flex flex-col">
            <DialogHeader className="text-left mb-3">
              <p className="text-xs text-primary font-medium uppercase tracking-wider mb-1">
                {product.subcategory}
              </p>
              <DialogTitle className="text-lg font-display font-bold text-foreground leading-tight">
                {product.name}
              </DialogTitle>
              <DialogDescription className="text-sm text-muted-foreground mt-2 line-clamp-3">
                {product.description || 'No description available.'}
              </DialogDescription>
            </DialogHeader>

            <div className="flex items-baseline gap-2 mb-1">
              <span className="text-xl font-bold text-foreground">
                Ksh {product.price.toLocaleString()}
              </span>
              <span className="text-sm text-muted-foreground line-through">
                Ksh {Math.round(product.price * 1.2).toLocaleString()}
              </span>
            </div>

            {product.wholesalePrice > 0 && (
              <p className="text-xs text-accent mb-4">
                Wholesale: Ksh {product.wholesalePrice.toLocaleString()}
              </p>
            )}

            <div className="mt-auto flex flex-col gap-2 pt-4 border-t border-border">
              {isExtension ? (
                <Link to={`/product/${product.id}`} onClick={onClose}>
                  <Button className="w-full" variant="default">
                    <Eye className="w-4 h-4 mr-2" />
                    Select Color & View Details
                  </Button>
                </Link>
              ) : (
                <Button
                  className="w-full"
                  onClick={handleAddToCart}
                  disabled={product.inStock === false}
                >
                  <ShoppingCart className="w-4 h-4 mr-2" />
                  {product.inStock === false ? 'Out of Stock' : 'Add to Cart'}
                </Button>
              )}

              <Link to={`/product/${product.id}`} onClick={onClose}>
                <Button variant="outline" className="w-full">
                  <ExternalLink className="w-4 h-4 mr-2" />
                  View Full Details
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ProductQuickView;
