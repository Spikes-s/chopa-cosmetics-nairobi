import { useEffect, useState } from 'react';
import { ShoppingCart, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { QuantityInput } from '@/components/ui/quantity-input';
import { useCart } from '@/context/CartContext';
import { Product } from '@/data/products';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

interface GlobalAddToCartProps {
  product: Product | null;
  onClose: () => void;
}

const GlobalAddToCart = ({ product, onClose }: GlobalAddToCartProps) => {
  const [quantity, setQuantity] = useState(1);
  const { addItem } = useCart();
  const navigate = useNavigate();

  useEffect(() => {
    setQuantity(1);
  }, [product]);

  if (!product) return null;

  const isBraid = product.category.toLowerCase() === 'braids';

  const handleAddToCart = () => {
    if (product.inStock === false) {
      toast.error('This product is currently out of stock');
      return;
    }

    if (isBraid) {
      navigate(`/product/${product.id}`);
      onClose();
      return;
    }

    addItem({
      id: product.id,
      name: product.name,
      price: product.price,
      wholesalePrice: product.wholesalePrice,
      quantity,
      image: product.image,
      category: product.category,
    });
    onClose();
    // No toast — the header cart icon pulses via CartContext.
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-card/95 backdrop-blur-lg border-t border-border p-4 animate-slide-up shadow-lg">
      <div className="container mx-auto max-w-lg">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-lg overflow-hidden bg-muted shrink-0">
            <img src={product.image} alt={product.name} className="w-full h-full object-cover" />
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="font-semibold text-foreground truncate">{product.name}</h4>
            <p className="text-sm text-accent">Ksh {product.price.toLocaleString()}</p>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="w-5 h-5" />
          </Button>
        </div>

        {!isBraid && (
          <div className="flex items-center justify-center my-4">
            <QuantityInput value={quantity} onChange={setQuantity} size="lg" />
          </div>
        )}

        <Button
          size="lg"
          className="w-full"
          variant="gradient"
          onClick={handleAddToCart}
          disabled={product.inStock === false}
        >
          <ShoppingCart className="w-5 h-5 mr-2" />
          {isBraid ? 'Select Options' : `Add to Cart · Ksh ${(product.price * quantity).toLocaleString()}`}
        </Button>
      </div>
    </div>
  );
};

export default GlobalAddToCart;

